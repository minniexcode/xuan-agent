import { z } from "zod";
import {
  type BirthInput,
  type BirthInputRequest,
  BirthInputSchema,
  type OutputMode,
  OutputModeSchema,
  type ProviderName,
  ProviderNameSchema,
} from "./index.js";

/** 档案偏好（FR-MEM-02：输出模式 + Provider）。 */
export interface ProfilePreferences {
  mode: OutputMode;
  provider: ProviderName;
}

/** 落盘的用户档案。 */
export interface UserProfile {
  userId: string;
  birth: BirthInput;
  preferences: ProfilePreferences;
  createdAt: string;
  updatedAt: string;
}

/** SDK 保存档案的输入：userId 缺省为 `default`，出生信息为原始输入、时间戳由 Agent 补齐。 */
export interface ProfileInput {
  userId?: string;
  birth: BirthInputRequest;
  preferences: ProfilePreferences;
}

/** 保存 / 删除档案需显式确认（FR-MEM-02 / technical-design.md §19.3）。 */
export interface SaveProfileOptions {
  confirm?: boolean;
}

export const ProfilePreferencesSchema = z.object({
  mode: OutputModeSchema,
  provider: ProviderNameSchema,
});

/** 写入前 schema 校验（technical-design.md §26.1）。birth 复用 BirthInputSchema。 */
export const UserProfileSchema = z.object({
  userId: z.string().min(1),
  birth: BirthInputSchema,
  preferences: ProfilePreferencesSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
