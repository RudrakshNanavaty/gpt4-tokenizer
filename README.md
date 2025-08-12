# [Live Demo](https://gpt4-tokenizer-sable.vercel.app/)

# GPT Tokenizer Next

A modern web application for experimenting with GPT-4 tokenization, built with Next.js and TypeScript. This project allows users to tokenize text using GPT-4's tokenizer, visualize token breakdowns, and explore vocabulary and merge rules interactively.

## Features

-   **Tokenize Text**: Input text and see how it is tokenized using GPT-4's tokenizer.
-   **Token Visualization**: View tokens, their IDs, and corresponding strings.
-   **Vocabulary Explorer**: Browse the vocabulary and merge rules used by the tokenizer.
-   **Modern UI**: Built with React, TypeScript, and a beautiful, responsive design.

## Project Structure

```
├── public/tokenizer/           # Tokenizer data files (vocab, merges, special tokens)
├── scripts/                    # Utility scripts (e.g., training tokenizer)
├── src/
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   ├── lib/                    # Utility functions
│   └── tokenizer/              # GPT-4 tokenizer implementation
├── package.json                # Project dependencies and scripts
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project documentation
```

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

```bash
pnpm install
```

### Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

### Building for Production

```bash
pnpm build
pnpm start
```

## Scripts

-   `pnpm dev` — Start the development server
-   `pnpm build` — Build the app for production
-   `pnpm start` — Start the production server
-   `pnpm lint` — Run ESLint
-   `pnpm format` — Format code with Prettier

## Tokenizer Data

Tokenizer files are located in `public/tokenizer/`:

-   `vocab.json` — Vocabulary mapping
-   `merges.txt` — Merge rules
-   `special_tokens_map.json` — Special tokens

## Contributing

Contributions are welcome! Please open issues or pull requests for improvements or bug fixes.

## License

MIT License

---

**Author:** Rudraksh Nanavaty
