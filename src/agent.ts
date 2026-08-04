import { Agent, CursorAgentError, type Run, type SDKAgent } from "@cursor/sdk";
import { config } from "./config.js";
import type { SessionStore } from "./store.js";

export interface StreamSnapshot {
  text: string;
  status: string;
}

export interface RunOutcome {
  text: string;
  status: "finished" | "error" | "cancelled";
  detail?: string;
}

const CHINESE_INSTRUCTION = [
  "你是通过飞书与用户对话的 Cursor 编程助手。请始终使用简体中文回复，语气简洁专业。",
  "只回答用户当前这条消息的真实需求，不要延续无关的旧话题，不要输出与问题无关的长篇模板。",
  "本机已安装飞书 CLI（lark-cli），可直接执行 shell 命令操作飞书：",
  "- 查看登录：lark-cli auth status",
  "- 用户身份登录：lark-cli auth login --recommend",
  "- 创建文档：lark-cli docs +create --as user --title \"标题\" --doc-format markdown --content \"# 内容\"",
  "用户要求登录飞书、创建文档、查权限等，优先在本机执行 lark-cli 并把结果简要回报，而不是只给操作说明。",
].join("\n");

const TOOL_LABELS: Record<string, string> = {
  read: "读取文件",
  write: "写入文件",
  edit: "编辑文件",
  ls: "列目录",
  glob: "查找文件",
  grep: "搜索内容",
  shell: "执行命令",
  semsearch: "语义检索",
  update_todos: "更新任务",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name.toLowerCase()] ?? name;
}

/**
 * One Feishu conversation mapped onto one Cursor agent. Runs are serialized:
 * a message that arrives mid-run waits for the current one to finish, which
 * keeps the agent's conversation history linear.
 */
export class AgentSession {
  private agent?: SDKAgent;
  private queue: Promise<unknown> = Promise.resolve();
  private activeRun?: Run;

  constructor(
    private readonly key: string,
    private readonly store: SessionStore,
  ) {}

  get cwd(): string {
    return this.store.get(this.key).cwd;
  }

  get busy(): boolean {
    return this.activeRun !== undefined;
  }

  async setCwd(cwd: string): Promise<void> {
    this.store.update(this.key, { cwd });
    await this.reset();
  }

  async reset(): Promise<void> {
    const agent = this.agent;
    this.agent = undefined;
    this.store.clearAgent(this.key);
    await agent?.[Symbol.asyncDispose]().catch(() => undefined);
  }

  async stop(): Promise<boolean> {
    const run = this.activeRun;
    if (!run) return false;
    if (!run.supports("cancel")) return false;
    await run.cancel().catch(() => undefined);
    return true;
  }

  /** Queues a prompt and resolves once its run reaches a terminal state. */
  run(prompt: string, onUpdate: (snapshot: StreamSnapshot) => void): Promise<RunOutcome> {
    const task = this.queue.then(() => this.execute(prompt, onUpdate));
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async ensureAgent(): Promise<SDKAgent> {
    if (this.agent) return this.agent;

    const state = this.store.get(this.key);
    const options = {
      apiKey: config.cursor.apiKey,
      model: { id: config.cursor.model },
      local: { cwd: state.cwd },
    };

    if (state.agentId) {
      try {
        this.agent = await Agent.resume(state.agentId, options);
        return this.agent;
      } catch (error) {
        console.warn(`[agent] resume failed for ${state.agentId}, creating a new agent:`, error);
        this.store.clearAgent(this.key);
      }
    }

    this.agent = await Agent.create(options);
    this.store.update(this.key, { agentId: this.agent.agentId });
    return this.agent;
  }

  private async execute(
    prompt: string,
    onUpdate: (snapshot: StreamSnapshot) => void,
  ): Promise<RunOutcome> {
    let agent: SDKAgent;
    try {
      agent = await this.ensureAgent();
    } catch (error) {
      return {
        text: "",
        status: "error",
        detail: error instanceof CursorAgentError ? error.message : String(error),
      };
    }

    let text = "";
    let status = "启动中…";

    try {
      const run = await agent.send(`${CHINESE_INSTRUCTION}\n\n${prompt}`);
      this.activeRun = run;
      console.log(`[agent] session=${this.key} run=${run.id} agent=${agent.agentId}`);

      for await (const event of run.stream()) {
        if (event.type === "assistant") {
          for (const block of event.message.content) {
            if (block.type === "text") text += block.text;
          }
        } else if (event.type === "tool_call") {
          const verb = event.status === "running" ? "正在" : "完成";
          status = `${verb}${toolLabel(event.name)}`;
        } else if (event.type === "thinking") {
          status = "思考中…";
        }
        onUpdate({ text, status });
      }

      const result = await run.wait();
      if (result.status === "error") {
        return { text, status: "error", detail: `run ${run.id} 执行失败` };
      }
      if (result.status === "cancelled") {
        return { text, status: "cancelled" };
      }
      return { text, status: "finished" };
    } catch (error) {
      if (error instanceof CursorAgentError) {
        return { text, status: "error", detail: `${error.message}（可重试：${error.isRetryable}）` };
      }
      return { text, status: "error", detail: String(error) };
    } finally {
      this.activeRun = undefined;
    }
  }
}
