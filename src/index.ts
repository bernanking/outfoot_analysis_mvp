import Anthropic from "@anthropic-ai/sdk";

// Resolves credentials from the environment: ANTHROPIC_API_KEY,
// ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile. Don't hardcode a key.
const client = new Anthropic();

const MODEL = "claude-opus-5";

const SYSTEM_PROMPT = "You are a precise analyst. Answer directly, no preamble.";

async function ask(question: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    // Adaptive thinking: Claude decides how much to reason. `display: "summarized"`
    // opts into a readable summary — the default returns empty thinking text.
    thinking: { type: "adaptive", display: "summarized" },
    // effort: low | medium | high | xhigh | max. Default is high.
    output_config: { effort: "high" },
    messages: [{ role: "user", content: question }],
  });

  // Always check stop_reason before reading content.
  if (response.stop_reason === "refusal") {
    throw new Error(
      `Refused (${response.stop_details?.category}): ${response.stop_details?.explanation}`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    console.warn("Warning: response was truncated at max_tokens.");
  }

  // content is a discriminated union — narrow by .type before reading .text.
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const { input_tokens, output_tokens, cache_read_input_tokens } = response.usage;
  console.error(
    `[usage] in=${input_tokens} out=${output_tokens} cached=${cache_read_input_tokens ?? 0}`,
  );

  return text;
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error(
      "No credentials found. Set ANTHROPIC_API_KEY, or run `ant auth login`\n" +
        "to store a profile the SDK picks up automatically.",
    );
    process.exitCode = 1;
    return;
  }

  const question = process.argv.slice(2).join(" ") || "What is the capital of France?";

  try {
    console.log(await ask(question));
  } catch (error) {
    // Typed exception classes, most specific first — never string-match messages.
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Invalid or missing API key. Set ANTHROPIC_API_KEY.");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error("Rate limited — retry after a backoff.");
    } else if (error instanceof Anthropic.BadRequestError) {
      console.error("Bad request:", error.message);
    } else if (error instanceof Anthropic.APIConnectionError) {
      console.error("Network error reaching the API:", error.message);
    } else if (error instanceof Anthropic.APIError) {
      console.error(`API error ${error.status}:`, error.message);
    } else {
      throw error;
    }
    process.exitCode = 1;
  }
}

await main();
