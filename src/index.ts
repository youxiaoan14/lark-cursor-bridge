import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createLarkChannel, type NormalizedMessage } from "@larksuite/channel";
import { AgentSession } from "./agent.js";
import { config } from "./config.js";
import { LiveCard, replyText, type MessageRef } from "./lark.js";
import { SessionStore } from "./store.js";

const HELP = [
  "Cursor ↔ 飞书桥接",
  "",
  "直接发消息即可与本地 Cursor agent 对话（群里需要 @ 机器人）。",
  "",
  "/new 或 /reset — 清空当前会话",
  "/cd <路径> — 切换工作目录并重置会话",
  "/status — 查看当前目录、模型与运行状态",
  "/stop — 中止正在执行的任务",
  "/help — 显示本帮助",
].join("\n");

const store = new SessionStore(config.stateFile, config.defaultWorkspace);
const sessions = new Map<string, AgentSession>();

const channel = createLarkChannel({
  appId: config.lark.appId,
  appSecret: config.lark.appSecret,
  domain: config.lark.domain,
  policy: {
    requireMention: true,
    dmMode: config.allowedUsers.length > 0 ? "allowlist" : "open",
    dmAllowlist: config.allowedUsers.length > 0 ? config.allowedUsers : undefined,
  },
});

function sessionFor(key: string): AgentSession {
  let session = sessions.get(key);
  if (!session) {
    session = new AgentSession(key, store);
    sessions.set(key, session);
  }
  return session;
}

function messageRef(msg: NormalizedMessage): MessageRef {
  return { chatId: msg.chatId, messageId: msg.messageId, threadId: msg.threadId };
}

async function handleCommand(
  command: string,
  args: string,
  session: AgentSession,
  msg: MessageRef,
): Promise<boolean> {
  switch (command) {
    case "/help":
      await replyText(channel, msg, HELP);
      return true;

    case "/new":
    case "/reset":
      await session.reset();
      await replyText(channel, msg, "会话已重置。");
      return true;

    case "/status":
      await replyText(
        channel,
        msg,
        [
          `工作目录：${session.cwd}`,
          `模型：${config.cursor.model}`,
          `状态：${session.busy ? "运行中" : "空闲"}`,
        ].join("\n"),
      );
      return true;

    case "/stop": {
      const stopped = await session.stop();
      await replyText(channel, msg, stopped ? "已请求中止当前任务。" : "当前没有正在运行的任务。");
      return true;
    }

    case "/cd": {
      const path = resolve(args);
      if (!args) {
        await replyText(channel, msg, "用法：/cd <绝对路径>");
        return true;
      }
      if (!existsSync(path) || !statSync(path).isDirectory()) {
        await replyText(channel, msg, `目录不存在：${path}`);
        return true;
      }
      await session.setCwd(path);
      await replyText(channel, msg, `工作目录已切换到 ${path}，会话已重置。`);
      return true;
    }

    default:
      return false;
  }
}

async function handleMessage(msg: NormalizedMessage): Promise<void> {
  console.log(`[bridge] message chat=${msg.chatId} sender=${msg.senderId} text=${msg.content.trim().slice(0, 80)}`);

  if (config.allowedUsers.length > 0 && !config.allowedUsers.includes(msg.senderId)) {
    console.warn(`[access] ignored message from ${msg.senderId}`);
    return;
  }

  const ref = messageRef(msg);
  const isText = msg.rawContentType === "text" || msg.rawContentType === "post";
  const text = msg.content.trim();

  if (!isText || !text) {
    await replyText(channel, ref, "目前只支持文本消息。");
    return;
  }

  const lower = text.toLowerCase();
  if (lower === "help" || lower === "帮助") {
    await replyText(channel, ref, HELP);
    return;
  }

  const key: string = msg.threadId || msg.chatId;
  const session = sessionFor(key);

  if (text.startsWith("/")) {
    const [command, ...rest] = text.split(/\s+/);
    if (await handleCommand(command.toLowerCase(), rest.join(" "), session, ref)) return;
  }

  if (session.busy) {
    await replyText(channel, ref, "当前任务还在执行，这条消息会排队处理。");
  }

  const card = new LiveCard(channel, ref, config.cardUpdateIntervalMs);
  await card.update({ state: "running", body: "…", status: "已收到，正在启动 agent" }, true);

  const outcome = await session.run(text, ({ text: body, status }) => {
    void card.update({ state: "running", body, status });
  });

  if (outcome.status === "finished") {
    await card.finish({ state: "done", body: outcome.text || "（本次运行没有文本输出）" });
  } else if (outcome.status === "cancelled") {
    await card.finish({ state: "stopped", body: outcome.text || "任务已中止。" });
  } else {
    await card.finish({
      state: "error",
      body: outcome.text || "运行失败。",
      status: outcome.detail,
    });
  }
}

channel.on("message", (msg) => {
  handleMessage(msg).catch((error) => console.error("[bridge] handler failed:", error));
});

channel.on("reconnecting", () => console.warn("[bridge] reconnecting…"));

channel.on("error", (error) => console.error("[bridge] channel error:", error));

if (config.allowedUsers.length === 0) {
  console.warn("[access] ALLOWED_OPEN_IDS is empty: every sender the bot can see is allowed.");
}
console.log(`[bridge] default workspace: ${config.defaultWorkspace}`);
console.log(`[bridge] model: ${config.cursor.model}`);

await channel.connect();
console.log("[bridge] connected to Feishu, waiting for messages");
