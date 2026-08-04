# lark-cursor-bridge

把飞书 / Lark 聊天桥接到本机的 Cursor agent。飞书里给机器人发消息，消息通过 [@larksuite/channel](https://github.com/larksuite/channel-sdk-node) 长连接进入本服务，由 [Cursor SDK](https://cursor.com/docs/sdk/typescript) 在本地跑一个 agent，输出以流式卡片回到同一个会话。

现成的 `lark-channel-bridge` 只支持 Claude Code 和 Codex，这个项目是等价功能的 Cursor 版本。

## 能力

- 私聊直接对话；群聊 @ 机器人触发。
- 流式卡片：正文实时更新，底部注释显示当前工具调用。
- 会话隔离：一个话题（thread）或一个群 = 一个 Cursor agent，历史连续，重启后按 agentId 恢复。
- 串行执行：运行中收到的新消息排队，不会打断当前任务。
- 工作目录可切换，按会话记忆。

## 前置条件

- Node.js ≥ 22.13
- Cursor API Key：<https://cursor.com/dashboard/integrations>
- 飞书自建应用（见下）

## 创建飞书应用

1. 打开 [飞书开放平台](https://open.feishu.cn/app) → 创建企业自建应用。
2. **添加应用能力** → 机器人。
3. **权限管理** 中开通：
   - `im:message`（获取与发送单聊、群组消息）
   - `im:message:send_as_bot`（以应用身份发消息）
   - `im:chat:readonly`（获取群信息）
4. **事件与回调** → 订阅方式选择 **长连接**，添加事件 `接收消息 im.message.receive_v1`。
5. **版本管理与发布** 中发布应用（企业内自建应用需管理员审核）。
6. 在 **凭证与基础信息** 里复制 App ID / App Secret。

## 配置

```bash
cp .env.example .env   # Windows: copy .env.example .env
```

填写 `.env`：

| 变量 | 说明 |
| --- | --- |
| `LARK_APP_ID` / `LARK_APP_SECRET` | 飞书应用凭证 |
| `LARK_TENANT` | `feishu`（国内）或 `lark`（国际版） |
| `CURSOR_API_KEY` | Cursor API Key |
| `CURSOR_MODEL` | 默认 `composer-2.5` |
| `WORKSPACE_DIR` | 新会话的默认工作目录 |
| `ALLOWED_OPEN_IDS` | 允许使用的用户 `open_id`，逗号分隔；留空表示不限制 |

`ALLOWED_OPEN_IDS` 留空时，任何能给机器人发消息的人都会被接受。个人机器上可以接受，多人环境务必填上自己的 `open_id`（启动后随便发一条消息，日志里会打印发送者 ID）。

## 运行

```bash
npm install
npm run build
npm start
```

看到 `connected to Feishu, waiting for messages` 后，在飞书里私聊机器人发一句话即可。

## 聊天命令

| 命令 | 作用 |
| --- | --- |
| `/new`、`/reset` | 清空当前会话 |
| `/cd <路径>` | 切换工作目录并重置会话 |
| `/status` | 查看工作目录、模型与运行状态 |
| `/stop` | 中止正在执行的任务 |
| `/help` | 帮助 |

## 注意

Agent 在本机以完整权限运行，可以读写 `WORKSPACE_DIR` 之外的文件、执行命令。工作目录只决定 agent 的起始位置，不是沙箱。请务必限制可用人员。

会话状态保存在 `state/sessions.json`，删掉即可全部重来。
