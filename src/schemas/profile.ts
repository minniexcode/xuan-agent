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

/** Profile preferences (FR-MEM-02: output mode + provider). */
export interface ProfilePreferences {
  mode: OutputMode;
  provider: ProviderName;
}

/** A user profile as persisted to disk. */
export interface UserProfile {
  userId: string;
  /** Normalized birth input (defaults already filled). */
  birth: BirthInput;
  preferences: ProfilePreferences;
  createdAt: string;
  updatedAt: string;
}

/** SDK input for saving a profile: userId defaults to `default`; birth is raw input and timestamps are filled by the Agent. */
export interface ProfileInput {
  userId?: string;
  birth: BirthInputRequest;
  preferences: ProfilePreferences;
}

/** Saving / deleting a profile requires explicit confirmation (FR-MEM-02 / technical-design.md §19.3). */
export interface SaveProfileOptions {
  confirm?: boolean;
}

/** Runtime schema for profile preferences. */
export const ProfilePreferencesSchema = z.object({
  mode: OutputModeSchema,
  provider: ProviderNameSchema,
});

/** Pre-write schema validation (technical-design.md §26.1). `birth` reuses BirthInputSchema. */
export const UserProfileSchema = z.object({
  userId: z.string().min(1),
  birth: BirthInputSchema,
  preferences: ProfilePreferencesSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
