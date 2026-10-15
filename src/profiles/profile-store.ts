import { join } from "node:path";
import { XuanError } from "../errors/index.js";
import { type UserProfile, UserProfileSchema } from "../schemas/profile.js";
import { readJson, removeFile, writeJsonAtomic } from "../storage/json-store.js";

/** 用户档案本地 JSON 存储：`<profilesDir>/<userId>.json`（FR-MEM-02）。 */
export class ProfileStore {
  constructor(private readonly dir: string) {}

  private pathFor(userId: string): string {
    return join(this.dir, `${userId}.json`);
  }

  async save(profile: UserProfile): Promise<void> {
    const parsed = UserProfileSchema.parse(profile);
    try {
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
