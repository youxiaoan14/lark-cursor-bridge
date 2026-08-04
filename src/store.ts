import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface SessionState {
  agentId?: string;
  cwd: string;
}

type StateFile = Record<string, SessionState>;

export class SessionStore {
  private state: StateFile = {};

  constructor(private readonly file: string, private readonly defaultCwd: string) {
    try {
      this.state = JSON.parse(readFileSync(file, "utf8")) as StateFile;
    } catch {
      this.state = {};
    }
  }

  get(key: string): SessionState {
    const existing = this.state[key];
    if (existing) return existing;
    const created: SessionState = { cwd: this.defaultCwd };
    this.state[key] = created;
    this.flush();
    return created;
  }

  update(key: string, patch: Partial<SessionState>): SessionState {
    const next = { ...this.get(key), ...patch };
    this.state[key] = next;
    this.flush();
    return next;
  }

  clearAgent(key: string): void {
    const current = this.get(key);
    delete current.agentId;
    this.flush();
  }

  private flush(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.state, null, 2), "utf8");
  }
}
