import * as fs from 'fs';
import * as readline from 'readline';

export class GPT4Tokenizer {
  vocab: Map<string, number> = new Map();
  merges: Map<string, number> = new Map();
  private specialTokens: Map<string, number> = new Map();
  nextTokenId: number = 256;

  // GPT-4 regex pattern for pre-tokenization
  readonly gpt4Pattern = /'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

  constructor() {
    // Initialize byte-level vocabulary (0-255)
    for (let i = 0; i < 256; i++) {
      this.vocab.set(this.bytesToUnicode()[i], i);
    }

    // Add special tokens
    this.addSpecialTokens();
  }

  private bytesToUnicode(): string[] {
    // Create mapping from bytes to unicode strings
    const bs: number[] = [];

    // Printable ASCII
    for (let i = 33; i <= 126; i++) bs.push(i);
    for (let i = 161; i <= 172; i++) bs.push(i);
    for (let i = 174; i <= 255; i++) bs.push(i);

    const cs = [...bs];
    let n = 0;

    // Add shifted versions for non-printable bytes
    for (let b = 0; b < 256; b++) {
      if (!bs.includes(b)) {
        bs.push(b);
        cs.push(256 + n);
        n++;
      }
    }

    return cs.map(c => String.fromCharCode(c));
  }

  private addSpecialTokens(): void {
    const specialTokensList = [
      '<|endoftext|>',
      '<|im_start|>',
      '<|im_end|>',
      '<|im_sep|>'
    ];

    for (const token of specialTokensList) {
      this.specialTokens.set(token, this.nextTokenId);
      this.vocab.set(token, this.nextTokenId);
      this.nextTokenId++;
    }
  }

  private getPairs(word: number[]): Set<string> {
    const pairs = new Set<string>();
    let prevChar = word[0];

    for (let i = 1; i < word.length; i++) {
      pairs.add(`${prevChar},${word[i]}`);
      prevChar = word[i];
    }

    return pairs;
  }

  getStats(vocab: Map<string, number>): Map<string, number> {
    const pairs = new Map<string, number>();

    for (const [word, freq] of vocab) {
      const symbol = JSON.parse(word) as number[];
      const wordPairs = this.getPairs(symbol);

      for (const pair of wordPairs) {
        pairs.set(pair, (pairs.get(pair) || 0) + freq);
      }
    }

    return pairs;
  }

  mergeBestPair(vocab: Map<string, number>, bestPair: string): Map<string, number> {
    const [first, second] = bestPair.split(',').map(Number);
    const newVocab = new Map<string, number>();

    for (const [word, freq] of vocab) {
      const symbol = JSON.parse(word) as number[];
      const newWord: number[] = [];
      let i = 0;

      while (i < symbol.length) {
        if (i < symbol.length - 1 && symbol[i] === first && symbol[i + 1] === second) {
          newWord.push(this.nextTokenId - 1); // The newly created token
          i += 2;
        } else {
          newWord.push(symbol[i]);
          i += 1;
        }
      }

      newVocab.set(JSON.stringify(newWord), freq);
    }

    return newVocab;
  }

  async train(textFilePath: string, vocabSize: number = 50000): Promise<void> {
    console.log('Starting GPT-4 style BPE training...');

    // Read training text
    const text = fs.readFileSync(textFilePath, 'utf-8');

    // Step 1: Pre-tokenization using GPT-4 regex pattern
    const chunks = Array.from(text.matchAll(this.gpt4Pattern), m => m[0]);
    console.log(`Pre-tokenized into ${chunks.length} chunks`);

    // Step 2: Convert chunks to bytes and count frequencies
    const vocab = new Map<string, number>();

    for (const chunk of chunks) {
      const bytes = Array.from(new TextEncoder().encode(chunk));
      const key = JSON.stringify(bytes);

      vocab.set(key, (vocab.get(key) || 0) + 1);
    }

    console.log(`Created vocabulary with ${vocab.size} unique byte sequences`);

    // Step 3: Apply BPE merging
    let mergeCount = 0;

    while (this.vocab.size < vocabSize) {
      const pairs = this.getStats(vocab);

      if (pairs.size === 0) break;

      // Find most frequent pair
      let bestPair = '';
      let maxCount = 0;

      for (const [pair, count] of pairs) {
        if (count > maxCount) {
          maxCount = count;
          bestPair = pair;
        }
      }

      if (maxCount < 2) break;

      // Record the merge
      this.merges.set(bestPair, this.nextTokenId);

      // Add merged token to vocabulary
      const mergeKey = `merge_${bestPair.replace(',', '_')}`;
      this.vocab.set(mergeKey, this.nextTokenId);

      // Apply merge to vocabulary
      const newVocab = this.mergeBestPair(vocab, bestPair);
      vocab.clear();
      for (const [k, v] of newVocab) {
        vocab.set(k, v);
      }

      mergeCount++;
      if (mergeCount % 100 === 0) {
        console.log(`Completed ${mergeCount} merges, vocab size: ${this.vocab.size}`);
      }

      this.nextTokenId++;
    }

    console.log(`Training complete! Final vocabulary size: ${this.vocab.size}`);
  }

  // Add this method to your GPT4Tokenizer class
async trainFromFile(textFilePath: string, vocabSize: number = 50000, batchSize: number = 100000): Promise<void> {
  console.log('Starting memory-efficient GPT-4 style BPE training...');

  // Step 1: Count vocabulary in batches
  const vocab = new Map<string, number>();
  let totalLines = 0;

  const fileStream = fs.createReadStream(textFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let batchText = '';
  let linesInBatch = 0;

  for await (const line of rl) {
    batchText += line + '\n';
    linesInBatch++;
    totalLines++;

    // Process batch when it reaches batchSize
    if (linesInBatch >= batchSize) {
      console.log(`Processing batch ending at line ${totalLines}...`);
      this.processBatch(batchText, vocab);

      // Clear batch
      batchText = '';
      linesInBatch = 0;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }

  // Process final batch
  if (batchText) {
    console.log(`Processing final batch...`);
    this.processBatch(batchText, vocab);
  }

  console.log(`Total lines processed: ${totalLines}`);
  console.log(`Unique byte sequences: ${vocab.size}`);

  // Step 2: Apply BPE merging
  await this.performBPEMerging(vocab, vocabSize);

  console.log(`Training complete! Final vocabulary size: ${this.vocab.size}`);
}

private processBatch(text: string, vocab: Map<string, number>): void {
  // Pre-tokenize using GPT-4 regex pattern
  const chunks = Array.from(text.matchAll(this.gpt4Pattern), m => m[0]);

  // Count byte sequences
  for (const chunk of chunks) {
    const bytes = Array.from(new TextEncoder().encode(chunk));
    const key = JSON.stringify(bytes);
    vocab.set(key, (vocab.get(key) || 0) + 1);
  }
}

private async performBPEMerging(vocab: Map<string, number>, vocabSize: number): Promise<void> {
  let mergeCount = 0;

  while (this.vocab.size < vocabSize) {
    const pairs = this.getStats(vocab);

    if (pairs.size === 0) break;

    // Find most frequent pair
    let bestPair = '';
    let maxCount = 0;

    for (const [pair, count] of pairs) {
      if (count > maxCount) {
        maxCount = count;
        bestPair = pair;
      }
    }

    if (maxCount < 2) break;

    // Record the merge
    this.merges.set(bestPair, this.nextTokenId);

    // Add merged token to vocabulary
    const mergeKey = `merge_${bestPair.replace(',', '_')}`;
    this.vocab.set(mergeKey, this.nextTokenId);

    // Apply merge to vocabulary
    const newVocab = this.mergeBestPair(vocab, bestPair);
    vocab.clear();
    for (const [k, v] of newVocab) {
      vocab.set(k, v);
    }

    mergeCount++;
    if (mergeCount % 50 === 0) {
      console.log(`Completed ${mergeCount} merges, vocab size: ${this.vocab.size}`);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
    }

    this.nextTokenId++;
  }
}


  encode(text: string): number[] {
    // Handle special tokens first
    let processedText = text;
    const specialTokens: number[] = [];

    // Check for special tokens
    for (const [specialToken, tokenId] of this.specialTokens) {
      if (text.includes(specialToken)) {
        const parts = text.split(specialToken);
        if (parts.length > 1) {
          specialTokens.push(tokenId);
        }
      }
    }

    // Pre-tokenize using GPT-4 regex
    const chunks = Array.from(processedText.matchAll(this.gpt4Pattern), m => m[0]);
    const allTokens: number[] = [];

    for (const chunk of chunks) {
      // Check if this chunk is a special token
      const specialTokenId = this.specialTokens.get(chunk);
      if (specialTokenId !== undefined) {
        allTokens.push(specialTokenId);
        continue;
      }

      // Convert to bytes and apply BPE
      let tokens = Array.from(new TextEncoder().encode(chunk));

      // Apply learned merges in order
      const sortedMerges = Array.from(this.merges.entries())
        .sort((a, b) => a[1] - b[1]);

      for (const [pairKey, newToken] of sortedMerges) {
        const [first, second] = pairKey.split(',').map(Number);
        tokens = this.applyMerge(tokens, first, second, newToken);
      }

      allTokens.push(...tokens);
    }

    return allTokens;
  }

  private applyMerge(tokens: number[], first: number, second: number, newToken: number): number[] {
    const result: number[] = [];
    let i = 0;

    while (i < tokens.length) {
      if (i < tokens.length - 1 && tokens[i] === first && tokens[i + 1] === second) {
        result.push(newToken);
        i += 2;
      } else {
        result.push(tokens[i]);
        i += 1;
      }
    }

    return result;
  }

  save(directory: string): void {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    // Save vocabulary
    const vocabObj = Object.fromEntries(this.vocab);
    fs.writeFileSync(
      `${directory}/vocab.json`,
      JSON.stringify(vocabObj, null, 2)
    );

    // Save merges
    const mergesObj = Object.fromEntries(this.merges);
    fs.writeFileSync(
      `${directory}/merges.json`,
      JSON.stringify(mergesObj, null, 2)
    );

    // Save special tokens
    const specialTokensObj = Object.fromEntries(this.specialTokens);
    fs.writeFileSync(
      `${directory}/special_tokens.json`,
      JSON.stringify(specialTokensObj, null, 2)
    );

    console.log(`GPT-4 style tokenizer saved to ${directory}`);
  }

  load(directory: string): void {
    const vocabData = fs.readFileSync(`${directory}/vocab.json`, 'utf8');
    const vocabObj = JSON.parse(vocabData);
    this.vocab = new Map(Object.entries(vocabObj).map(([k, v]) => [k, v as number]));

    const mergesData = fs.readFileSync(`${directory}/merges.json`, 'utf8');
    const mergesObj = JSON.parse(mergesData);
    this.merges = new Map(Object.entries(mergesObj).map(([k, v]) => [k, v as number]));

    const specialTokensData = fs.readFileSync(`${directory}/special_tokens.json`, 'utf8');
    const specialTokensObj = JSON.parse(specialTokensData);
    this.specialTokens = new Map(Object.entries(specialTokensObj).map(([k, v]) => [k, v as number]));

    console.log('GPT-4 style tokenizer loaded successfully');
  }
}
