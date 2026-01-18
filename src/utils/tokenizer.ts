type Tokenizer = {
  encode: (text: string) => number[];
  decode: (tokens: number[]) => string;
};

let tokenizerCache: Tokenizer | null = null;

async function getTokenizer(model?: string): Promise<Tokenizer> {
  if (tokenizerCache) return tokenizerCache;

  const tiktoken = await import("@dqbd/tiktoken");
  let encoding: Tokenizer;

  try {
    encoding = tiktoken.encoding_for_model(model ?? "gpt-4o-mini") as Tokenizer;
  } catch {
    encoding = tiktoken.get_encoding("cl100k_base") as Tokenizer;
  }

  tokenizerCache = encoding;
  return encoding;
}

export async function countTokens(text: string, model?: string): Promise<number> {
  try {
    const tokenizer = await getTokenizer(model);
    return tokenizer.encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

export async function trimToTokenWindow(
  text: string,
  maxTokens: number,
  model?: string,
  selection?: string
): Promise<string> {
  try {
    const tokenizer = await getTokenizer(model);
    const tokens = tokenizer.encode(text);
    if (tokens.length <= maxTokens) return text;

    if (selection) {
      const selectionIndex = text.indexOf(selection);
      if (selectionIndex >= 0) {
        const prefixTokens = tokenizer.encode(text.slice(0, selectionIndex));
        const selectionTokens = tokenizer.encode(selection);
        const available = Math.max(0, maxTokens - selectionTokens.length);
        const beforeWindow = Math.floor(available / 2);
        let start = Math.max(0, prefixTokens.length - beforeWindow);
        let end = Math.min(tokens.length, start + maxTokens);
        if (end - start < maxTokens && start > 0) {
          start = Math.max(0, end - maxTokens);
        }
        return tokenizer.decode(tokens.slice(start, end));
      }
    }

    return tokenizer.decode(tokens.slice(0, maxTokens));
  } catch {
    const fallbackChars = Math.max(1, maxTokens * 4);
    return text.slice(0, fallbackChars);
  }
}
