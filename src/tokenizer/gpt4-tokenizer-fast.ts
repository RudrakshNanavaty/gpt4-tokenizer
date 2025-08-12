import { GPT4Tokenizer } from './gpt4-tokenizer';
import * as fs from 'fs';

export class FastGPT4Tokenizer extends GPT4Tokenizer {
  async fastTrain(textFilePath: string, vocabSize: number = 20000): Promise<void> {
    console.log('Starting FAST GPT-4 training...');

    // Read limited amount of data
    const maxFileSize = 500 * 1024 * 1024; // 500MB max
    const stats = fs.statSync(textFilePath);

    let text: string;
    if (stats.size > maxFileSize) {
      console.log(`File too large (${Math.round(stats.size/1024/1024)}MB), reading first 500MB only...`);
      const buffer = Buffer.alloc(maxFileSize);
      const fd = fs.openSync(textFilePath, 'r');
      fs.readSync(fd, buffer, 0, maxFileSize, 0);
      fs.closeSync(fd);
      text = buffer.toString('utf8');
    } else {
      console.log('Reading entire file...');
      text = fs.readFileSync(textFilePath, 'utf8');
    }

    // Quick pre-tokenization
    console.log('Pre-tokenizing...');
    const chunks = Array.from(text.matchAll(this.gpt4Pattern), m => m[0]);
    console.log(`Found ${chunks.length} chunks`);

    // Count frequencies (faster than batch processing)
    const vocab = new Map<string, number>();

    for (const chunk of chunks) {
      const bytes = Array.from(new TextEncoder().encode(chunk));
      const key = JSON.stringify(bytes);
      vocab.set(key, (vocab.get(key) || 0) + 1);
    }

    console.log(`Built vocabulary with ${vocab.size} unique sequences`);

    // Fast BPE merging with early stopping
    let mergeCount = 0;
    const maxMerges = vocabSize - this.vocab.size;

    while (this.vocab.size < vocabSize && mergeCount < maxMerges) {
      const pairs = this.getStats(vocab);
      if (pairs.size === 0) break;

      // Find best pair
      let bestPair = '';
      let maxCount = 0;

      for (const [pair, count] of pairs) {
        if (count > maxCount) {
          maxCount = count;
          bestPair = pair;
        }
      }

      if (maxCount < 3) break; // Higher threshold for speed

      // Apply merge
      this.merges.set(bestPair, this.nextTokenId);
      this.vocab.set(`merge_${bestPair.replace(',', '_')}`, this.nextTokenId);

      // Update vocab
      vocab = this.mergeBestPair(vocab, bestPair);

      mergeCount++;
      if (mergeCount % 100 === 0) {
        console.log(`Merge ${mergeCount}/${maxMerges}, vocab: ${this.vocab.size}`);
      }

      this.nextTokenId++;
    }

    console.log(`Fast training complete! Vocab size: ${this.vocab.size}`);
  }
}
