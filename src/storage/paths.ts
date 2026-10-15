import { homedir, platform } from "node:os";
import { join } from "node:path";

/** Per-platform user data directory (Windows APPDATA / macOS Application Support / XDG on Linux). */
function defaultDataDir(): string {
  const home = homedir();
  if (platform() === "win32") {
    return join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "xuan-agent");
  }
  if (platform() === "darwin") {
    return join(home, "Library", "Application Support", "xuan-agent");
  }
  return join(process.env.XDG_DATA_HOME ?? join(home, ".local", "share"), "xuan-agent");
}

/** Resolved local storage locations. */
export interface XuanPaths {
  dataDir: string;
  profilesDir: string;
  sessionsDir: string;
  logsDir: string;
  /** Knowledge-base directory; undefined when unset — in-package seed resolution is decided by a later milestone. */
  knowledgeDir?: string;
}

/**
 * Runtime data always lands in the user data directory, never inside the npm package directory.
 * See technical-design.md §16.3.
 */
export function resolvePaths(env: NodeJS.ProcessEnv = process.env): XuanPaths {
  const dataDir = env.XUAN_DATA_DIR ?? defaultDataDir();
  const paths: XuanPaths = {
    dataDir,
    profilesDir: env.XUAN_PROFILE_DIR || join(dataDir, "profiles"),
    sessionsDir: join(dataDir, "sessions"),
    logsDir: join(dataDir, "logs"),
  };
  if (env.XUAN_KNOWLEDGE_DIR) paths.knowledgeDir = env.XUAN_KNOWLEDGE_DIR;
  return paths;
}
