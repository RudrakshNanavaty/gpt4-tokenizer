import { FastGPT4Tokenizer } from '@/tokenizer/gpt4-tokenizer-fast';
import { GPT4Tokenizer } from '../src/tokenizer/gpt4-tokenizer';
import * as fs from 'fs';
import * as readline from 'readline';

async function main() {
  const tokenizer = new FastGPT4Tokenizer();

  // Super fast training - should complete in under 5 minutes
  await tokenizer.fastTrain('./training_data/realnewslike_train.txt', 20000);

  tokenizer.save('./public/tokenizer');

  // Test
  const testText = "Hello, world! This is a test.";
  const tokens = tokenizer.encode(testText);
  console.log('Test tokens:', tokens);
}

main().catch(console.error);
