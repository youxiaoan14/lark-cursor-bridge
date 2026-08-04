import type { LarkChannel, NormalizedMessage } from "@larksuite/channel";
import { buildCardObject, type CardInput } from "./card.js";

export type MessageRef = Pick<NormalizedMessage, "chatId" | "messageId" | "threadId">;

/**
 * A single Feishu card that is patched in place while the agent streams.
 * Updates are throttled because Feishu rate-limits message patching.
 */
export class LiveCard {
  private cardMessageId?: string;
  private lastSentAt = 0;
  private lastPayload = "";
  private pending?: NodeJS.Timeout;
  private closed = false;

  constructor(
    private readonly channel: LarkChannel,
    private readonly msg: MessageRef,
    private readonly minIntervalMs: number,
  ) {}

  async update(input: CardInput, force = false): Promise<void> {
    if (this.closed && !force) return;
    const card = buildCardObject(input);
    const payload = JSON.stringify(card);
    if (payload === this.lastPayload && !force) return;

    const wait = this.minIntervalMs - (Date.now() - this.lastSentAt);
    if (wait > 0 && !force) {
      clearTimeout(this.pending);
      this.pending = setTimeout(() => void this.update(input), wait);
      return;
    }

    clearTimeout(this.pending);
    this.lastSentAt = Date.now();
    this.lastPayload = payload;

    try {
      if (!this.cardMessageId) {
        const res = await this.channel.reply(this.msg, { card });
        this.cardMessageId = res.messageId;
      } else {
        await this.channel.updateCard(this.cardMessageId, card);
      }
    } catch (error) {
      console.error("[lark] card update failed:", error);
    }
  }

  async finish(input: CardInput): Promise<void> {
    clearTimeout(this.pending);
    await this.update(input, true);
    this.closed = true;
  }
}

export async function replyText(
  channel: LarkChannel,
  msg: MessageRef,
  text: string,
): Promise<void> {
  await channel.reply(msg, { text });
}
