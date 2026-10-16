import { join } from "node:path";
import { XuanError } from "../errors/index.js";
import { type UserProfile, UserProfileSchema } from "../schemas/profile.js";
import { assertSafeId } from "../storage/id-guard.js";
import { readJson, removeFile, writeJsonAtomic } from "../storage/json-store.js";

/** Local JSON storage for user profiles: `<profilesDir>/<userId>.json` (FR-MEM-02). */
export class ProfileStore {
  constructor(private readonly dir: string) {}

  /** File path for a single profile. */
  private pathFor(userId: string): string {
    assertSafeId(userId, this.dir, "档案 ID");
    return join(this.dir, `${userId}.json`);
  }

  /** Validate and persist a profile; callers must obtain explicit user confirmation first (FR-MEM-02). */
  async save(profile: UserProfile): Promise<void> {
    const parsed = UserProfileSchema.parse(profile);
    try {
      // Atomic temp-file + rename (technical-design.md §26.1).
      writeJsonAtomic(this.pathFor(parsed.userId), parsed);
    } catch (err) {
      throw XuanError.from(err, {
        code: "STORAGE_ERROR",
        message: "写入用户档案失败",
        stage: "storage",
        recoverable: false,
      });
    }
  }

  /** Load a profile by id; returns undefined when the file is missing. */
  async load(userId: string): Promise<UserProfile | undefined> {
    try {
      const raw = readJson<unknown>(this.pathFor(userId));
      if (raw === undefined) return undefined;
      return UserProfileSchema.parse(raw) as UserProfile;
    } catch (err) {
      throw XuanError.from(err, {
        code: "STORAGE_ERROR",
        message: `读取用户档案失败：${userId}`,
        stage: "storage",
        recoverable: false,
      });
    }
  }

  /** Delete a profile; requires explicit user confirmation, unlike conversation state (FR-MEM-02). */
  async delete(userId: string): Promise<void> {
    try {
      removeFile(this.pathFor(userId));
    } catch (err) {
      throw XuanError.from(err, {
        code: "STORAGE_ERROR",
        message: "删除用户档案失败",
        stage: "storage",
        recoverable: false,
      });
    }
  }
}
