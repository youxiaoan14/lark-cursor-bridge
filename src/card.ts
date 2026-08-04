/** Feishu rejects oversized card payloads, so long transcripts get trimmed from the front. */
const MAX_BODY_CHARS = 4000;

export type CardState = "running" | "done" | "error" | "stopped";

const HEADERS: Record<CardState, { template: string; title: string }> = {
  running: { template: "blue", title: "Cursor 正在处理" },
  done: { template: "green", title: "Cursor" },
  error: { template: "red", title: "Cursor 运行失败" },
  stopped: { template: "grey", title: "Cursor 已停止" },
};

export interface CardInput {
  state: CardState;
  body: string;
  status?: string;
}

function trim(text: string): string {
  if (text.length <= MAX_BODY_CHARS) return text;
  return `…（已省略前 ${text.length - MAX_BODY_CHARS} 字）\n${text.slice(-MAX_BODY_CHARS)}`;
}

export function buildCardObject({ state, body, status }: CardInput): object {
  const header = HEADERS[state];
  const elements: unknown[] = [
    {
      tag: "markdown",
      content: trim(body.trim() || "…"),
    },
  ];

  if (status) {
    elements.push({ tag: "hr" });
    elements.push({
      tag: "note",
      elements: [{ tag: "plain_text", content: status }],
    });
  }

  return {
    config: { wide_screen_mode: true, update_multi: true },
    header: {
      template: header.template,
      title: { tag: "plain_text", content: header.title },
    },
    elements,
  };
}
