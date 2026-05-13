import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, statSync } from "fs";

const STATE_DIR = join(homedir(), ".claude-code-router");
const STATE_FILE = join(STATE_DIR, "codex_mode.active");

function ensureDir() {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
}

function readState() {
  if (!existsSync(STATE_FILE)) {
    return { active: false, since: null as string | null };
  }
  try {
    const st = statSync(STATE_FILE);
    return { active: true, since: st.mtime.toISOString() };
  } catch {
    return { active: true, since: null };
  }
}

export async function registerCodexModeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/ui/codex-mode", async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.send(readState());
  });

  app.post("/ui/codex-mode/start", async (_req: FastifyRequest, reply: FastifyReply) => {
    ensureDir();
    writeFileSync(STATE_FILE, new Date().toISOString(), { mode: 0o600, encoding: "utf-8" });
    reply.send(readState());
  });

  app.post("/ui/codex-mode/stop", async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (existsSync(STATE_FILE)) {
        unlinkSync(STATE_FILE);
      }
    } catch (err: any) {
      app.log.error({ err }, "Failed to delete codex_mode.active");
    }
    reply.send(readState());
  });
}
