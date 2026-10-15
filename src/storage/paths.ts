import { homedir, platform } from "node:os";
import { join } from "node:path";

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

export interface XuanPaths {
  dataDir: string;
  profilesDir: string;
  sessionsDir: string;
  logsDir: string;
  /** 知识库目录；未配置时返回 undefined，由后续里程碑决定包内 seed 解析。 */
  knowledgeDir?: string;
}

/**
 * 运行数据一律落在用户数据目录，不写入 npm 包目录。
 * 见 technical-design.md §16.3。
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
