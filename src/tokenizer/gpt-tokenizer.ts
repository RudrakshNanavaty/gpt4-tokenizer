export interface TokenizerData {
  vocab: Record<string, number>;
  merges: string[];
}

export class GPTTokenizer {
  private vocab: Record<string, number>;
  private bpeRanks: Record<string, number>;
  private cache: Record<string, string[]> = {};
  private reverseVocab: Record<number, string> = {};

  // GPT'spre-tokenization regex pattern
  private readonly pattern = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

  // Complete set of special tokens used in GPT
  private specialTokens = {
    // Chat format tokens
    '<|im_start|>': 100264,
    '<|im_end|>': 100265,
    '<|im_sep|>': 100266,

    // System tokens
    '<|endoftext|>': 100257,
    '<|fim_prefix|>': 100258,
    '<|fim_middle|>': 100259,
    '<|fim_suffix|>': 100260,

    // Additional OpenAI tokens
    '<|startoftext|>': 100261,
    '<|endofprompt|>': 100262,
    '<|startofsystem|>': 100263,
    '<|endofsystem|>': 100267,
    '<|startofuser|>': 100268,
    '<|endofuser|>': 100269,
    '<|startofassistant|>': 100270,
    '<|endofassistant|>': 100271,

    // Function calling tokens
    '<|function_call|>': 100272,
    '<|function_response|>': 100273,

    // Tool use tokens
    '<|tool_call|>': 100274,
    '<|tool_response|>': 100275,

    // Additional system tokens
    '<|system|>': 100276,
    '<|user|>': 100277,
    '<|assistant|>': 100278,

    // Code tokens
    '<|code|>': 100279,
    '<|/code|>': 100280,

    // Thought tokens (for reasoning)
    '<|thought|>': 100281,
    '<|/thought|>': 100282
  };

  // Byte-to-character mapping used by GPT
  private byteEncoder!: Record<number, string>;
  private byteDecoder!: Record<string, number>;

  constructor(data: TokenizerData) {
    this.vocab = { ...data.vocab, ...this.specialTokens };

    // Create reverse vocab for decoding
    Object.entries(this.vocab).forEach(([token, id]) => {
      this.reverseVocab[id] = token;
    });

    // Create BPE ranks from merges
    this.bpeRanks = {};
    data.merges.forEach((merge, index) => {
      this.bpeRanks[merge] = index;
    });

    // Initialize byte encoder/decoder
    this.initializeByteMappings();
  }

  private initializeByteMappings() {
    // Create the byte-to-character mapping used by GPT
    const bytes: number[] = [];

    // Add printable ASCII characters
    for (let i = 33; i <= 126; i++) {
      bytes.push(i);
    }
    for (let i = 161; i <= 172; i++) {
      bytes.push(i);
    }
    for (let i = 174; i <= 255; i++) {
      bytes.push(i);
    }

  const cs = bytes.slice();
    let n = 0;

    // Add remaining bytes with offset
    for (let b = 0; b < 256; b++) {
      if (!bytes.includes(b)) {
        bytes.push(b);
        cs.push(256 + n);
        n++;
      }
    }

    // Create the mapping
    this.byteEncoder = {};
    this.byteDecoder = {};

    cs.forEach((c, i) => {
      const char = String.fromCharCode(c);
      this.byteEncoder[bytes[i]] = char;
      this.byteDecoder[char] = bytes[i];
    });
  }

  private getPairs(word: string[]): string[] {
    const pairs: string[] = [];
    for (let i = 0; i < word.length - 1; i++) {
      pairs.push(`${word[i]} ${word[i + 1]}`);
    }
    return pairs;
  }

  private bpe(token: string): string[] {
    if (this.cache[token]) {
      return this.cache[token];
    }

    // Convert to byte-level representation
    const utf8Bytes = Array.from(new TextEncoder().encode(token));
    let word = utf8Bytes.map(byte => this.byteEncoder[byte]);

    if (word.length <= 1) {
      this.cache[token] = word;
      return word;
    }

    while (true) {
      const pairs = this.getPairs(word);
      if (pairs.length === 0) break;

      let minPair: string | null = null;
      let minRank = Infinity;

      for (const pair of pairs) {
        const rank = this.bpeRanks[pair];
        if (rank !== undefined && rank < minRank) {
          minRank = rank;
          minPair = pair;
        }
      }

      if (minPair === null) break;

      const [first, second] = minPair.split(' ');
      const newWord: string[] = [];
      let i = 0;

      while (i < word.length) {
        const j = word.indexOf(first, i);

        if (j === -1) {
          newWord.push(...word.slice(i));
          break;
        }

        newWord.push(...word.slice(i, j));

        if (j < word.length && word[j] === first && j + 1 < word.length && word[j + 1] === second) {
          newWord.push(first + second);
          i = j + 2;
        } else {
          newWord.push(word[j]);
          i = j + 1;
        }
      }

      word = newWord;
      if (word.length === 1) break;
    }

    this.cache[token] = word;
    return word;
  }

  // Enhanced chat message formatting with more options
  public formatChatMessages(systemText: string, userText: string, useNewFormat: boolean = false): string {
    if (useNewFormat) {
      // Alternative format using newer tokens
      return `<|startofsystem|>${systemText}<|endofsystem|>\n<|startofuser|>${userText}<|endofuser|>\n<|startofassistant|>`;
    } else {
      // Standard OpenAI chat format
      return `<|im_start|>system\n${systemText}<|im_end|>\n<|im_start|>user\n${userText}<|im_end|>\n<|im_start|>assistant\n`;
    }
  }

  // Method to format function calling
  public formatFunctionCall(functionName: string, args: string): string {
    return `<|function_call|>\n{"name": "${functionName}", "arguments": ${args}}\n<|function_response|>`;
  }

  // Method to format tool use
  public formatToolCall(toolName: string, input: string): string {
    return `<|tool_call|>\n{"tool": "${toolName}", "input": "${input}"}\n<|tool_response|>`;
  }

  // Method to format code blocks
  public formatCodeBlock(code: string): string {
    return `<|code|>\n${code}\n<|/code|>`;
  }

  // Method to format reasoning/thoughts
  public formatThought(thought: string): string {
    return `<|thought|>\n${thought}\n<|/thought|>`;
  }

  private splitBySpecialTokens(text: string): Array<{ text: string; isSpecial: boolean }> {
    const specialTokenRegex = new RegExp(
      Object.keys(this.specialTokens)
        .sort((a, b) => b.length - a.length)
        .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
      'g'
    );

    const parts: Array<{ text: string; isSpecial: boolean }> = [];
    let lastIndex = 0;
    let match;

    while ((match = specialTokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          text: text.slice(lastIndex, match.index),
          isSpecial: false
        });
      }

      parts.push({
        text: match[0],
        isSpecial: true
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({
        text: text.slice(lastIndex),
        isSpecial: false
      });
    }

    return parts;
  }

  public encode(text: string): number[] {
    const parts = this.splitBySpecialTokens(text);
    const allTokens: string[] = [];

    for (const part of parts) {
      if (part.isSpecial) {
        allTokens.push(part.text);
      } else if (part.text) {
        const matches = Array.from(part.text.matchAll(this.pattern));
        for (const match of matches) {
          if (match[0]) {
            const bpeTokens = this.bpe(match[0]);
            allTokens.push(...bpeTokens);
          }
        }
      }
    }

    return allTokens.map(token => {
      const id = this.vocab[token];
      if (id === undefined) {
        console.warn(`Unknown token: ${JSON.stringify(token)}`);
        return this.vocab['<|endoftext|>'] || 0;
      }
      return id;
    });
  }

  public decode(tokenIds: number[]): string {
    const tokens = tokenIds.map(id => {
      const token = this.reverseVocab[id];
      if (token === undefined) {
        console.warn(`Unknown token ID: ${id}`);
        return '';
      }
      return token;
    });

    // Handle special tokens separately
    let result = '';
    for (const token of tokens) {
      if (Object.keys(this.specialTokens).includes(token)) {
        result += token;
      } else {
        // Convert byte-encoded token back to bytes
        const bytes: number[] = [];
        for (const char of token) {
          const byte = this.byteDecoder[char];
          if (byte !== undefined) {
            bytes.push(byte);
          }
        }

        try {
          result += new TextDecoder().decode(new Uint8Array(bytes));
        } catch {
          result += token; // Fallback
        }
      }
    }

    return result;
  }

  public tokenize(text: string): string[] {
    const parts = this.splitBySpecialTokens(text);
    const allTokens: string[] = [];

    for (const part of parts) {
      if (part.isSpecial) {
        allTokens.push(part.text);
      } else if (part.text) {
        const matches = Array.from(part.text.matchAll(this.pattern));
        for (const match of matches) {
          if (match[0]) {
            const bpeTokens = this.bpe(match[0]);
            allTokens.push(...bpeTokens);
          }
        }
      }
    }

    return allTokens;
  }

  // Utility method to get all special tokens
  public getSpecialTokens(): Record<string, number> {
    return { ...this.specialTokens };
  }

  // Method to check if a token is special
  public isSpecialToken(token: string): boolean {
    return token in this.specialTokens;
  }
}
