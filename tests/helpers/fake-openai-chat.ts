/**
 * A real HTTP server speaking enough of OpenAI's Chat Completions API, as OpenCode 2.x's
 * `openai-compatible` provider streams it, for the real OpenCode CLI to run one scripted turn with
 * no account: OpenCode is given a made-up provider whose `baseURL` is this server
 * (`fakeChatProvider`), so nothing reaches a model provider and nothing is billed.
 *
 * The script is one call, then done: OpenCode's `shell` tool with one command. A request that
 * carries that call's output gets a short reply, and a side request with no tools (a session
 * title) gets a few words. It listens on every address of this computer, and its URL names the
 * computer, never loopback: newer 2.x reaches loopback past the sandbox's proxy, and on Linux a
 * sandboxed session's loopback is its own.
 */
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";

/** What the fake says once the command has run. */
export const FAKE_CHAT_DONE_TEXT = "Done: the command ran.";
/** The made-up provider and model, as OpenCode names them (`provider/model`). */
export const FAKE_CHAT_MODEL = "genex-fake/m1";
const SIDE_TEXT = "Fake title";
const SHELL_TOOL = "shell";

export interface FakeChat {
  /** The host a session must be let reach. */
  host: string;
  /** OpenCode's config naming the fake as a provider, for `opencode.json`. */
  config: string;
  /** What OpenCode sent back for the scripted command, once it ran. */
  commandOutput: () => string | null;
  close: () => Promise<void>;
}

interface ChatBody {
  model?: string;
  tools?: Array<{ function?: { name?: string } }>;
  messages?: Array<{ role?: string; content?: unknown }>;
}

/** One Chat Completions stream: `delta`, then why it ended, then the tokens. */
function stream(res: ServerResponse, model: string, delta: Record<string, unknown>, finish: string): void {
  const chunk = (data: Record<string, unknown>) =>
    res.write(
      `data: ${JSON.stringify({ id: "chatcmpl-fake", object: "chat.completion.chunk", created: 1, model, ...data })}\n\n`,
    );
  res.writeHead(200, { "content-type": "text/event-stream" });
  chunk({ choices: [{ index: 0, delta: { role: "assistant", ...delta }, finish_reason: null }] });
  chunk({ choices: [{ index: 0, delta: {}, finish_reason: finish }] });
  chunk({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } });
  res.end("data: [DONE]\n\n");
}

/** A tool message's text, however OpenCode shaped it. */
const textOf = (content: unknown): string => (typeof content === "string" ? content : JSON.stringify(content));

/** Start the fake; its one scripted turn runs `command` with OpenCode's shell tool. */
export async function startFakeChat(command: string): Promise<FakeChat> {
  let output: string | null = null;
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const part of req) raw += part;
    const body = (raw ? JSON.parse(raw) : {}) as ChatBody;
    const model = body.model ?? "m1";
    const ran = body.messages?.findLast((message) => message.role === "tool");
    const shell = body.tools?.some((tool) => tool.function?.name === SHELL_TOOL);
    if (ran) {
      output = textOf(ran.content);
      stream(res, model, { content: FAKE_CHAT_DONE_TEXT }, "stop");
    } else if (shell) {
      const call = {
        index: 0,
        id: "call_fake_1",
        type: "function",
        function: { name: SHELL_TOOL, arguments: JSON.stringify({ command }) },
      };
      stream(res, model, { tool_calls: [call] }, "tool_calls");
    } else stream(res, model, { content: SIDE_TEXT }, "stop");
  });
  await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  const { port } = server.address() as AddressInfo;
  const host = os.hostname();
  const [provider, model] = FAKE_CHAT_MODEL.split("/");
  const config = JSON.stringify({
    provider: {
      [provider ?? ""]: {
        npm: "@ai-sdk/openai-compatible",
        name: "Genex fake",
        options: { baseURL: `http://${host}:${port}/v1`, apiKey: "fake-key" },
        models: { [model ?? ""]: { name: "Fake model" } },
      },
    },
  });
  return {
    host,
    config,
    commandOutput: () => output,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
