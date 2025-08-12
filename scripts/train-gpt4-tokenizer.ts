import { GPT4Tokenizer } from '../src/tokenizer/gpt4-tokenizer';
import * as fs from 'fs';
import * as readline from 'readline';

async function main() {
  const tokenizer = new GPT4Tokenizer();

  // Process in smaller batches to avoid memory issues
  await tokenizer.trainFromFile('./training_data/realnewslike_train.txt', 30000, 100000); // Process 100k lines at a time

  tokenizer.save('./public/tokenizer');

  const testText = "Hello, world! This is a test sentence.";
  const tokens = tokenizer.encode(testText);
  console.log('Test encoding:', tokens);
  console.log('Token count:', tokens.length);
}

main().catch(console.error);
