'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { GPT4Tokenizer, TokenizerData } from '@/tokenizer/gpt4-tokenizer';
import { CheckCircle, Laptop, Loader2, Moon, Sun, XCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';


export default function GPT4TokenizerDemo() {
	const { theme, setTheme } = useTheme();
	const [systemText, setSystemText] = useState<string>(
		'You are a helpful AI assistant. Please provide accurate and helpful responses to user questions.'
	);
	const [userText, setUserText] = useState<string>(
		'What is the capital of France and what makes it culturally significant?'
	);
	const [tokens, setTokens] = useState<string[]>([]);
	const [tokenIds, setTokenIds] = useState<number[]>([]);
	const [decodedText, setDecodedText] = useState('');
	const [isVerified, setIsVerified] = useState(false);
	const [tokenizer, setTokenizer] = useState<GPT4Tokenizer | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		async function loadTokenizer() {
			try {
				const [vocabResponse, mergesResponse] = await Promise.all([
					fetch('/tokenizer/vocab.json'),
					fetch('/tokenizer/merges.txt')
				]);

				if (!vocabResponse.ok || !mergesResponse.ok) {
					throw new Error('Failed to load tokenizer files');
				}

				const vocab = await vocabResponse.json();
				const mergesText = await mergesResponse.text();

				const merges = mergesText
					.split('\n')
					.filter(line => line.trim() && !line.startsWith('#version'))
					.slice(1);

				const tokenizerData: TokenizerData = { vocab, merges };
				const newTokenizer = new GPT4Tokenizer(tokenizerData);

				if (isMounted) {
					setTokenizer(newTokenizer);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					setError(
						err instanceof Error ? err.message : 'Unknown error'
					);
					setLoading(false);
				}
			}
		}

		loadTokenizer();
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		if (tokenizer && (systemText || userText)) {
			try {
				const formattedText = tokenizer.formatChatMessages(
					systemText,
					userText
				);
				const newTokens = tokenizer.tokenize(formattedText);
				const newTokenIds = tokenizer.encode(formattedText);
				const decoded = tokenizer.decode(newTokenIds);

				setTokens(newTokens);
				setTokenIds(newTokenIds);
				setDecodedText(decoded);
				setIsVerified(formattedText === decoded);
			} catch (err) {
				console.error('Tokenization error:', err);
				setTokens([]);
				setTokenIds([]);
				setDecodedText('');
				setIsVerified(false);
			}
		}
	}, [systemText, userText, tokenizer]);

	if (loading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='flex items-center gap-3 animate-pulse'>
					<Loader2 className='h-8 w-8 animate-spin text-blue-500' />
					<span className='text-lg animate-bounce'>
						Loading tokenizer...
					</span>
					<div className='flex space-x-1'>
						<div
							className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'
							style={{ animationDelay: '0ms' }}
						></div>
						<div
							className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'
							style={{ animationDelay: '150ms' }}
						></div>
						<div
							className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'
							style={{ animationDelay: '300ms' }}
						></div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='max-w-4xl mx-auto p-6'>
				<Alert
					variant='destructive'
					className='animate-in slide-in-from-top-5 duration-500'
				>
					<XCircle className='h-4 w-4 animate-spin' />
					<AlertDescription className='animate-in fade-in-50 delay-300'>
						Error: {error}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const originalText =
		tokenizer?.formatChatMessages(systemText, userText) || '';

	const getTokenColor = (token: string, index: number) => {
		if (tokenizer?.isSpecialToken(token)) {
			if (token === '<|im_start|>' || token === '<|im_end|>') {
				return 'bg-[var(--token-purple-bg)] text-[var(--token-purple-text)] border-[var(--token-purple-border)] hover:bg-[var(--token-purple-hover)]';
			}
			return 'bg-[var(--token-rose-bg)] text-[var(--token-rose-text)] border-[var(--token-rose-border)] hover:bg-[var(--token-rose-hover)]';
		}

		const colors = [
			'bg-[var(--token-blue-bg)] text-[var(--token-blue-text)] border-[var(--token-blue-border)] hover:bg-[var(--token-blue-hover)]',
			'bg-[var(--token-green-bg)] text-[var(--token-green-text)] border-[var(--token-green-border)] hover:bg-[var(--token-green-hover)]',
			'bg-[var(--token-yellow-bg)] text-[var(--token-yellow-text)] border-[var(--token-yellow-border)] hover:bg-[var(--token-yellow-hover)]',
			'bg-[var(--token-indigo-bg)] text-[var(--token-indigo-text)] border-[var(--token-indigo-border)] hover:bg-[var(--token-indigo-hover)]',
			'bg-[var(--token-pink-bg)] text-[var(--token-pink-text)] border-[var(--token-pink-border)] hover:bg-[var(--token-pink-hover)]',
			'bg-[var(--token-cyan-bg)] text-[var(--token-cyan-text)] border-[var(--token-cyan-border)] hover:bg-[var(--token-cyan-hover)]',
			'bg-[var(--token-orange-bg)] text-[var(--token-orange-text)] border-[var(--token-orange-border)] hover:bg-[var(--token-orange-hover)]',
			'bg-[var(--token-teal-bg)] text-[var(--token-teal-text)] border-[var(--token-teal-border)] hover:bg-[var(--token-teal-hover)]'
		];

		return colors[index % colors.length];
	};

	const getTokenIdColor = (id: number, index: number) => {
		const colors = [
			'bg-[var(--tokenid-slate-bg)] text-[var(--tokenid-slate-text)] border-[var(--tokenid-slate-border)] hover:bg-[var(--tokenid-slate-hover)]',
			'bg-[var(--tokenid-gray-bg)] text-[var(--tokenid-gray-text)] border-[var(--tokenid-gray-border)] hover:bg-[var(--tokenid-gray-hover)]',
			'bg-[var(--tokenid-zinc-bg)] text-[var(--tokenid-zinc-text)] border-[var(--tokenid-zinc-border)] hover:bg-[var(--tokenid-zinc-hover)]',
			'bg-[var(--tokenid-neutral-bg)] text-[var(--tokenid-neutral-text)] border-[var(--tokenid-neutral-border)] hover:bg-[var(--tokenid-neutral-hover)]',
			'bg-[var(--tokenid-stone-bg)] text-[var(--tokenid-stone-text)] border-[var(--tokenid-stone-border)] hover:bg-[var(--tokenid-stone-hover)]'
		];

		return colors[index % colors.length];
	};

	return (
		<div className='max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in-0 slide-in-from-bottom-5 duration-700'>
			{/* Theme Toggle Dropdown */}
			<div className='flex justify-end items-center mb-2'>
				<Select value={theme} onValueChange={setTheme}>
					<SelectTrigger className='w-36'>
						<SelectValue placeholder='Theme' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='light'>
							<span className='flex items-center gap-2'>
								<Sun className='w-4 h-4 text-yellow-500' />
								Light
							</span>
						</SelectItem>
						<SelectItem value='dark'>
							<span className='flex items-center gap-2'>
								<Moon className='w-4 h-4 text-blue-600' />
								Dark
							</span>
						</SelectItem>
						<SelectItem value='system'>
							<span className='flex items-center gap-2'>
								<Laptop className='w-4 h-4 text-gray-500' />
								System
							</span>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className='text-center animate-in slide-in-from-top-3 duration-500'>
				<h1 className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-in zoom-in-50 duration-700 hover:scale-105 transition-transform cursor-default'>
					GPT-4 Tokenizer Demo
				</h1>
				<p className='text-muted-foreground mt-3 animate-in slide-in-from-top-5 delay-200 duration-500 hover:scale-105 transition-all cursor-default'>
					Test encoding and decoding with system and user messages
				</p>
				<div className='mt-4 w-32 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto animate-in slide-in-from-left-5 delay-300 duration-500'></div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
				<Card className='animate-in slide-in-from-left-5 delay-300 duration-500 hover:shadow-2xl hover:-translate-y-1 transition-all group'>
					<CardHeader className='group-hover:translate-y-[-2px] transition-transform duration-300'>
						<CardTitle className='flex items-center gap-3'>
							<div className='w-3 h-3 bg-blue-500 rounded-full animate-pulse group-hover:animate-bounce'></div>
							<span className='group-hover:text-blue-600 transition-colors duration-300'>
								Input Messages
							</span>
						</CardTitle>
						<CardDescription className='group-hover:text-gray-600 transition-colors duration-300'>
							Enter system and user messages to tokenize
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-6'>
						<div className='animate-in slide-in-from-left-5 delay-400 duration-500'>
							<Label
								htmlFor='system-text'
								className='text-sm font-medium hover:text-blue-600 transition-colors duration-200'
							>
								System Message
							</Label>
							<Textarea
								id='system-text'
								value={systemText}
								onChange={e => setSystemText(e.target.value)}
								placeholder='Enter system message...'
								className='min-h-[90px] transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:scale-[1.02] hover:shadow-md'
							/>
						</div>
						<div className='animate-in slide-in-from-left-5 delay-500 duration-500'>
							<Label
								htmlFor='user-text'
								className='text-sm font-medium hover:text-blue-600 transition-colors duration-200'
							>
								User Message
							</Label>
							<Textarea
								id='user-text'
								value={userText}
								onChange={e => setUserText(e.target.value)}
								placeholder='Enter user message...'
								className='min-h-[90px] transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:scale-[1.02] hover:shadow-md'
							/>
						</div>
					</CardContent>
				</Card>

				<Card className='animate-in slide-in-from-right-5 delay-300 duration-500 hover:shadow-2xl hover:-translate-y-1 transition-all group'>
					<CardHeader className='group-hover:translate-y-[-2px] transition-transform duration-300'>
						<CardTitle className='flex items-center gap-3'>
							<div className='w-3 h-3 bg-green-500 rounded-full animate-pulse group-hover:animate-bounce'></div>
							<span className='group-hover:text-green-600 transition-colors duration-300'>
								Statistics & Verification
							</span>
						</CardTitle>
						<CardDescription className='group-hover:text-gray-600 transition-colors duration-300'>
							Token statistics and encoding verification
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-2 gap-6 mb-6'>
							<div className='text-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg transform transition-transform duration-300 hover:scale-105 hover:rotate-1 cursor-pointer group/stat'>
								<div className='text-4xl font-bold text-blue-600 transition-transform duration-300 group-hover/stat:scale-110'>
									{originalText.length}
								</div>
								<div className='text-sm text-blue-600 transition-colors duration-300 group-hover/stat:font-semibold'>
									Characters
								</div>
							</div>
							<div className='text-center p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg transform transition-transform duration-300 hover:scale-105 hover:rotate-[-1deg] cursor-pointer group/stat'>
								<div className='text-4xl font-bold text-green-600 transition-transform duration-300 group-hover/stat:scale-110'>
									{tokens.length}
								</div>
								<div className='text-sm text-green-600 transition-colors duration-300 group-hover/stat:font-semibold'>
									Tokens
								</div>
							</div>
						</div>

						<div
							className={`flex items-center gap-3 p-5 rounded-lg border animate-in slide-in-from-bottom-3 delay-800 duration-500 transition-all hover:scale-105 hover:shadow-lg cursor-pointer ${
								isVerified
									? 'bg-green-50 border-green-200 hover:bg-green-100'
									: 'bg-red-50 border-red-200 hover:bg-red-100'
							}`}
						>
							{isVerified ? (
								<CheckCircle className='h-6 w-6 text-green-500 animate-bounce hover:animate-spin transition-all' />
							) : (
								<XCircle className='h-6 w-6 text-red-500 animate-pulse hover:animate-ping transition-all' />
							)}
							<span
								className={`font-medium transition-all hover:font-bold ${
									isVerified
										? 'text-green-700'
										: 'text-red-700'
								}`}
							>
								{isVerified
									? 'Encoding verified ✓'
									: 'Encoding mismatch ✗'}
							</span>
						</div>

						<div className='mt-6 animate-in slide-in-from-bottom-5 delay-900 duration-500'>
							<Label className='text-sm font-medium flex items-center gap-2 hover:text-purple-600 transition-colors'>
								<div className='w-2 h-2 bg-purple-500 rounded-full animate-pulse hover:animate-bounce'></div>
								Special Tokens Used
							</Label>
							<div className='mt-2 text-sm text-muted-foreground hover:text-purple-600 transition-colors'>
								<span className='font-semibold text-purple-600 animate-pulse hover:animate-bounce inline-block'>
									{
										tokens.filter(token =>
											tokenizer?.isSpecialToken(token)
										).length
									}
								</span>{' '}
								special tokens detected
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className='animate-in slide-in-from-bottom-3 delay-400 duration-500 hover:shadow-2xl hover:-translate-y-1 transition-all group'>
				<CardHeader className='group-hover:translate-y-[-2px] transition-transform duration-300'>
					<CardTitle className='flex items-center gap-3'>
						<div className='w-3 h-3 bg-purple-500 rounded-full animate-pulse group-hover:animate-bounce'></div>
						<span className='group-hover:text-purple-600 transition-colors duration-300'>
							Formatted Input Text
						</span>
					</CardTitle>
					<CardDescription className='group-hover:text-gray-600 transition-colors duration-300'>
						Text with special tokens as sent to the model
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='p-5 bg-accent rounded-lg font-mono text-sm whitespace-pre-wrap break-all border animate-in fade-in-0 delay-1000 duration-500 hover:shadow-inner hover:scale-[1.01] transition-all cursor-text'>
						{originalText}
					</div>
				</CardContent>
			</Card>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
				<Card className='animate-in slide-in-from-left-5 delay-500 duration-500 hover:shadow-2xl hover:-translate-y-1 transition-all group'>
					<CardHeader className='group-hover:translate-y-[-2px] transition-transform duration-300'>
						<CardTitle className='flex items-center gap-3'>
							<div className='w-3 h-3 bg-cyan-500 rounded-full animate-pulse group-hover:animate-bounce'></div>
							<span className='group-hover:text-cyan-600 transition-colors duration-300'>
								Tokens ({tokens.length})
							</span>
						</CardTitle>
						<CardDescription className='group-hover:text-gray-600 transition-colors duration-300'>
							Individual tokens from BPE encoding
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='max-h-80 overflow-y-auto hover:max-h-96 transition-all duration-500'>
							<div className='flex flex-wrap gap-2 p-3'>
								{tokens.map((token, index) => (
									<Badge
										key={index}
										className={`font-mono text-xs transition-all duration-500 hover:scale-125 hover:-rotate-2 hover:shadow-lg hover:z-10 cursor-pointer animate-in fade-in-0 slide-in-from-bottom-2 border relative group/token ${getTokenColor(
											token,
											index
										)}`}
										style={{
											animationDelay: `${
												index * 30 + 1100
											}ms`
										}}
										title={`Token ${index}: "${token}"`}
									>
										<span className='group-hover/token:animate-pulse'>
											{token
												.replace(/\s/g, '·')
												.replace(/\n/g, '↵')}
										</span>
									</Badge>
								))}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className='animate-in slide-in-from-right-5 delay-500 duration-500 hover:shadow-2xl hover:-translate-y-1 transition-all group'>
					<CardHeader className='group-hover:translate-y-[-2px] transition-transform duration-300'>
						<CardTitle className='flex items-center gap-3'>
							<div className='w-3 h-3 bg-orange-500 rounded-full animate-pulse group-hover:animate-bounce'></div>
							<span className='group-hover:text-orange-600 transition-colors duration-300'>
								Token IDs ({tokenIds.length})
							</span>
						</CardTitle>
						<CardDescription className='group-hover:text-gray-600 transition-colors duration-300'>
							Numeric token identifiers
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='max-h-80 overflow-y-auto hover:max-h-96 transition-all duration-500'>
							<div className='flex flex-wrap gap-2 p-3'>
								{tokenIds.map((id, index) => (
									<Badge
										key={index}
										className={`font-mono text-xs transition-all duration-500 hover:scale-125 hover:rotate-2 hover:shadow-lg hover:z-10 cursor-pointer animate-in fade-in-0 slide-in-from-bottom-2 border relative group/token ${getTokenIdColor(
											id,
											index
										)}`}
										style={{
											animationDelay: `${
												index * 30 + 1100
											}ms`
										}}
										title={`Token ${index}: "${tokens[index]}" → ${id}`}
									>
										<span className='group-hover/token:animate-pulse'>
											{id}
										</span>
									</Badge>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className='animate-in slide-in-from-bottom-5 delay-600 duration-500 hover:shadow-2xl hover:-translate-y-1 transition-all group'>
				<CardHeader className='group-hover:translate-y-[-2px] transition-transform duration-300'>
					<CardTitle className='flex items-center gap-3'>
						<div className='w-3 h-3 bg-emerald-500 rounded-full animate-pulse group-hover:animate-bounce'></div>
						<span className='group-hover:text-emerald-600 transition-colors duration-300'>
							Decoded Text
						</span>
					</CardTitle>
					<CardDescription className='group-hover:text-gray-600 transition-colors duration-300'>
						Text reconstructed from token IDs
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='p-5 bg-accent rounded-lg font-mono text-sm whitespace-pre-wrap break-all border animate-in fade-in-0 delay-1200 duration-500 hover:shadow-inner hover:scale-[1.01] transition-all cursor-text'>
						{decodedText}
					</div>
				</CardContent>
			</Card>

			{/* Floating animation elements */}
			<div
				className='fixed top-10 left-10 w-4 h-4 bg-blue-200 rounded-full animate-bounce opacity-20 pointer-events-none'
				style={{ animationDelay: '0s', animationDuration: '3s' }}
			></div>
			<div
				className='fixed top-20 right-20 w-3 h-3 bg-purple-200 rounded-full animate-bounce opacity-20 pointer-events-none'
				style={{ animationDelay: '1s', animationDuration: '4s' }}
			></div>
			<div
				className='fixed bottom-20 left-20 w-5 h-5 bg-green-200 rounded-full animate-bounce opacity-20 pointer-events-none'
				style={{ animationDelay: '2s', animationDuration: '5s' }}
			></div>
			<div
				className='fixed bottom-10 right-10 w-2 h-2 bg-orange-200 rounded-full animate-bounce opacity-20 pointer-events-none'
				style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}
			></div>
		</div>
	);
}
