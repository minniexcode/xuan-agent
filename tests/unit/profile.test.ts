import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { type BirthInputRequest, createXuanAgent } from "../../src/index.js";
import { createLogger } from "../../src/logging/index.js";
import { ProfileStore } from "../../src/profiles/index.js";

// Isolated temp directory: profiles are written to disk, so tests must never
// touch the user's real profile data.
const dir = mkdtempSync(join(tmpdir(), "xuan-profile-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const silent = createLogger("silent");

// Shared valid birth input reused across the profile cases.
const birth: BirthInputRequest = {
  date: "1995-03-12",
  time: "08:30",
  gender: "male",
  calendar: "solar",
};

// Injects the temp-backed profile store so each test is fully isolated.
function makeAgent() {
  return createXuanAgent({
    config: { provider: "mock" },
    logger: silent,
    profileStore: new ProfileStore(dir),
  });
}

// User profile behaviour for FR-MEM-02: explicit confirmation is required before
// any write, and profiles are stored as local JSON.
describe("XuanAgent 档案", () => {
  // FR-MEM-02 rule 2: nothing is written until the user confirms.
  it("未确认时保存抛 PROFILE_PERMISSION_REQUIRED", async () => {
    const agent = makeAgent();
    await expect(
      agent.saveProfile({ birth, preferences: { mode: "advanced", provider: "mock" } }),
    ).rejects.toMatchObject({ code: "PROFILE_PERMISSION_REQUIRED" });
  });

  it("确认后保存并查看", async () => {
    const agent = makeAgent();
    const saved = await agent.saveProfile(
      { userId: "me", birth, preferences: { mode: "advanced", provider: "mock" } },
      { confirm: true },
    );
    expect(saved.userId).toBe("me");
    expect(saved.birth.date).toBe("1995-03-12");

    const found = await agent.getProfile("me");
    expect(found?.birth.gender).toBe("male");
  });

  // Updating an existing profile must preserve createdAt (it is creation metadata,
  // not a modification timestamp).
  it("默认 userId 为 default，更新保留 createdAt", async () => {
    const agent = makeAgent();
    const first = await agent.saveProfile(
      { birth, preferences: { mode: "beginner", provider: "mock" } },
      { confirm: true },
    );
    expect(first.userId).toBe("default");

    const second = await agent.saveProfile(
      { birth, preferences: { mode: "advanced", provider: "mock" } },
      { confirm: true },
    );
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.preferences.mode).toBe("advanced");
  });

  // FR-MEM-02 rule 3: deletion, like saving, requires explicit confirmation.
  it("删除需确认", async () => {
    const agent = makeAgent();
    await agent.saveProfile(
      { userId: "tmp", birth, preferences: { mode: "advanced", provider: "mock" } },
      { confirm: true },
    );
    await expect(agent.deleteProfile("tmp")).rejects.toMatchObject({
      code: "PROFILE_PERMISSION_REQUIRED",
    });
    await agent.deleteProfile("tmp", { confirm: true });
    expect(await agent.getProfile("tmp")).toBeNull();
  });

  // Profile birth info flows through the same BirthInput schema, so ambiguous dates
  // are rejected here too.
  it("非法出生信息抛 VALIDATION_ERROR", async () => {
    const agent = makeAgent();
    await expect(
      agent.saveProfile(
        {
          birth: { date: "03/04/1995", time: "08:30", gender: "male", calendar: "solar" },
          preferences: { mode: "advanced", provider: "mock" },
        },
        { confirm: true },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
