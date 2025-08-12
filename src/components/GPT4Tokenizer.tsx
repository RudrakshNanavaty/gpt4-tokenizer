'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';

interface TokenizerData {
	vocab: Record<string, number>;
	merges: Record<string, number>;
	specialTokens: Record<string, number>;
}

export default function GPT4Tokenizer() {
	const [tokenizer, setTokenizer] = useState<TokenizerData | null>(null);
	const [systemText, setSystemText] = useState('You are a helpful assistant');
	const [userText, setUserText] = useState('');
	const [tokens, setTokens] = useState<number[]>([]);
	const [loading, setLoading] = useState(true);
	const { theme, setTheme } = useTheme();

	// GPT-4 regex pattern for pre-tokenization
	const gpt4Pattern =
		/'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

	useEffect(() => {
		async function loadTokenizer() {
			try {
				const [vocabResponse, mergesResponse] = await Promise.all([
					fetch('/tokenizer/vocab.json'),
					fetch('/tokenizer/merges.txt') // Note: .txt extension from Hugging Face
				]);

				const vocab = await vocabResponse.json();
				const mergesText = await mergesResponse.text();

				// Convert merges text to expected JSON format
				const merges: Record<string, number> = {};
				const lines = mergesText
					.split('\n')
					.filter(line => line.trim() && !line.startsWith('#'));

				lines.forEach((line, index) => {
					const parts = line.trim().split(' ');
					if (parts.length === 2) {
						const [first, second] = parts;
						// For GPT-4, we need to handle the special character encoding
						const firstBytes = Array.from(
							new TextEncoder().encode(first)
						);
						const secondBytes = Array.from(
							new TextEncoder().encode(second)
						);

						if (
							firstBytes.length === 1 &&
							secondBytes.length === 1
						) {
							merges[`${firstBytes[0]},${secondBytes[0]}`] =
								256 + index;
						} else {
							// Handle multi-byte characters or special tokens
							const key = `${first}_${second}`;
							merges[key] = 256 + index;
						}
					}
				});

				// Define special tokens for GPT-4 format
				const specialTokens: Record<string, number> = {
					'<|endoftext|>': 100257,
					'<|fim_prefix|>': 100258,
					'<|fim_middle|>': 100259,
					'<|fim_suffix|>': 100260,
					'<|im_start|>': 100264,
					'<|im_end|>': 100265,
					'<|im_sep|>': 100266
				};

				setTokenizer({ vocab, merges, specialTokens });
				setLoading(false);
			} catch (error) {
				console.error('Failed to load tokenizer:', error);
				setLoading(false);
			}
		}

		loadTokenizer();
	}, []);

	const encode = useCallback(
		(text: string): number[] => {
			if (!tokenizer) return [];

			// Handle special tokens first
			const processedText = text;
			const specialTokenMatches: Array<{
				token: string;
				id: number;
				start: number;
				end: number;
			}> = [];

			// Find all special tokens in the text
			for (const [specialToken, tokenId] of Object.entries(
				tokenizer.specialTokens
			)) {
				let startIndex = 0;
				while (true) {
					const index = processedText.indexOf(
						specialToken,
						startIndex
					);
					if (index === -1) break;

					specialTokenMatches.push({
						token: specialToken,
						id: tokenId,
						start: index,
						end: index + specialToken.length
					});
					startIndex = index + specialToken.length;
				}
			}

			// Sort special token matches by position
			specialTokenMatches.sort((a, b) => a.start - b.start);

			// Process text with special tokens
			const allTokens: number[] = [];
			let currentPos = 0;

			for (const match of specialTokenMatches) {
				// Process text before special token
				if (currentPos < match.start) {
					const beforeText = processedText.slice(
						currentPos,
						match.start
					);
					const beforeTokens = encodeRegularText(beforeText);
					allTokens.push(...beforeTokens);
				}

				// Add special token
				allTokens.push(match.id);
				currentPos = match.end;
			}

			// Process remaining text
			if (currentPos < processedText.length) {
				const remainingText = processedText.slice(currentPos);
				const remainingTokens = encodeRegularText(remainingText);
				allTokens.push(...remainingTokens);
			}

			return allTokens;
		},
		[tokenizer]
	);

	const encodeRegularText = (text: string): number[] => {
		if (!tokenizer || !text) return [];

		// Pre-tokenize using GPT-4 regex
		const chunks = Array.from(text.matchAll(gpt4Pattern), m => m[0]);
		const allTokens: number[] = [];

		for (const chunk of chunks) {
			// Convert to bytes and apply BPE
			let tokens = Array.from(new TextEncoder().encode(chunk));

			// Apply learned merges in order
			const sortedMerges = Object.entries(tokenizer.merges).sort(
				(a, b) => a[1] - b[1]
			);

			for (const [pairKey, newToken] of sortedMerges) {
				if (pairKey.includes(',')) {
					const [first, second] = pairKey.split(',').map(Number);
					tokens = applyMerge(tokens, first, second, newToken);
				}
			}

			allTokens.push(...tokens);
		}

		return allTokens;
	};

	const applyMerge = (
		tokens: number[],
		first: number,
		second: number,
		newToken: number
	): number[] => {
		const result: number[] = [];
		let i = 0;

		while (i < tokens.length) {
			if (
				i < tokens.length - 1 &&
				tokens[i] === first &&
				tokens[i + 1] === second
			) {
				result.push(newToken);
				i += 2;
			} else {
				result.push(tokens[i]);
				i += 1;
			}
		}

		return result;
	};

	const getTokenColor = (index: number) => {
		const colors = [
			'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
			'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
			'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
			'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
			'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
			'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
		];
		return colors[index % colors.length];
	};

	const renderColoredTokens = () => {
		const fullText = `<|im_start|>system<|im_sep|>${systemText}<|im_end|><|im_start|>user<|im_sep|>${userText}<|im_end|><|im_start|>assistant<|im_sep|>`;

		// Split by special tokens first to show them distinctly
		let displayText = fullText;
		const parts: Array<{ text: string; isSpecial: boolean }> = [];

		// Find special tokens
		for (const specialToken of Object.keys(
			tokenizer?.specialTokens || {}
		)) {
			displayText = displayText.replace(
				new RegExp(
					specialToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
					'g'
				),
				`|||${specialToken}|||`
			);
		}

		const segments = displayText.split('|||');
		segments.forEach(segment => {
			if (segment && tokenizer?.specialTokens[segment]) {
				parts.push({ text: segment, isSpecial: true });
			} else if (segment) {
				// Further split regular text by regex
				const chunks = Array.from(
					segment.matchAll(gpt4Pattern),
					m => m[0]
				);
				chunks.forEach(chunk => {
					if (chunk) parts.push({ text: chunk, isSpecial: false });
				});
			}
		});

		return parts.map((part, index) => (
			<span
				key={index}
				className={`inline-block px-2 py-1 m-1 rounded text-sm border ${
					part.isSpecial
						? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-bold border-red-300'
						: getTokenColor(index)
				}`}
			>
				{part.text}
			</span>
		));
	};

	useEffect(() => {
		const debounceTimeout = setTimeout(() => {
			if (tokenizer) {
				const fullText = `<|im_start|>system<|im_sep|>${systemText}<|im_end|><|im_start|>user<|im_sep|>${userText}<|im_end|><|im_start|>assistant<|im_sep|>`;
				const encoded = encode(fullText);
				setTokens(encoded);
			}
		}, 500); // 300ms debounce delay

		return () => clearTimeout(debounceTimeout);
	}, [systemText, userText, tokenizer, encode]);

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-lg'>Loading GPT-4 style tokenizer...</div>
			</div>
		);
	}

	if (!tokenizer) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-lg text-red-600'>
					Failed to load tokenizer
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-background'>
			<div className='container mx-auto p-6 max-w-4xl'>
				{/* Header with theme toggle */}
				<div className='flex justify-between items-center mb-8'>
					<h1 className='text-3xl font-bold'>GPT-4 Tokenizer</h1>
					<Select value={theme} onValueChange={setTheme}>
						<SelectTrigger className='w-32'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='light'>
								<div className='flex items-center gap-2'>
									<Sun className='h-4 w-4' />
									Light
								</div>
							</SelectItem>
							<SelectItem value='dark'>
								<div className='flex items-center gap-2'>
									<Moon className='h-4 w-4' />
									Dark
								</div>
							</SelectItem>
							<SelectItem value='system'>
								<div className='flex items-center gap-2'>
									<Monitor className='h-4 w-4' />
									System
								</div>
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Input Cards */}
				<div className='grid gap-6 mb-6'>
					<Card>
						<CardHeader>
							<Label htmlFor='system'>System</Label>
						</CardHeader>
						<CardContent>
							<Textarea
								id='system'
								value={systemText}
								onChange={e => setSystemText(e.target.value)}
								className='min-h-[60px] resize-none'
								placeholder='You are a helpful assistant'
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Label htmlFor='user'>User</Label>
						</CardHeader>
						<CardContent>
							<Textarea
								id='user'
								value={userText}
								onChange={e => setUserText(e.target.value)}
								className='min-h-[100px]'
								placeholder='Content'
							/>
						</CardContent>
					</Card>
				</div>

				{/* Add message button */}
				{/* <div className='mb-6'>
					<Button onClick={handleTokenize} className='w-full'>
						Add message
					</Button>
				</div> */}

				{/* Token visualization */}
				{tokens.length > 0 && (
					<div className='space-y-6'>
						<Card>
							<CardHeader>
								<div className='flex justify-between items-center'>
									<h3 className='text-lg font-semibold'>
										Token visualization
									</h3>
									<span className='text-sm text-muted-foreground'>
										Token count:{' '}
										<span className='font-semibold text-foreground'>
											{tokens.length}
										</span>
									</span>
								</div>
							</CardHeader>
							<CardContent>
								<div className='border rounded-lg p-4 bg-muted/50 overflow-auto'>
									{renderColoredTokens()}
								</div>
							</CardContent>
						</Card>

						{/* Token IDs */}
						<Card>
							<CardHeader>
								<h3 className='text-lg font-semibold'>
									Token IDs
								</h3>
							</CardHeader>
							<CardContent>
								<div className='font-mono text-sm bg-muted/50 p-4 rounded-lg overflow-x-auto'>
									{tokens.join(', ')}
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
