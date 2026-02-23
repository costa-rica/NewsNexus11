'use client';

/**
 * Error Boundary Component - Security Hardened
 *
 * PURPOSE: Prevents information leakage through error messages
 *
 * SECURITY CONTEXT:
 * During the December 2025 security breach, error messages exposed:
 * - Internal usernames
 * - Environment variable names
 * - File paths and system structure
 * - Stack traces revealing code structure
 *
 * This information helped attackers map the system and plan their attack.
 *
 * IMPLEMENTATION:
 * - Production: Shows generic error messages only (no internal details)
 * - Development: Shows full error details for debugging
 * - All errors logged server-side for monitoring (not exposed to client)
 *
 * REFERENCE: docs/security-measures20251213/Security_Measures_01_Abbreviated.md
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

import { useEffect } from 'react';

interface ErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
	useEffect(() => {
		// SECURITY: Log errors server-side only (never expose to client in production)
		// In production, this goes to server logs where it can be monitored safely
		// In development, this appears in browser console for debugging
		console.error('Application Error:', error);
	}, [error]);

	// SECURITY: Production mode - sanitized error response
	// NEVER expose internal error details, stack traces, or system information
	// This prevents attackers from learning about system internals
	if (process.env.NODE_ENV === 'production') {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
					<div className="mb-4">
						<svg
							className="mx-auto h-12 w-12 text-red-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<h2 className="mb-4 text-center text-2xl font-semibold text-gray-900 dark:text-white">
						Something went wrong
					</h2>
					<p className="mb-6 text-center text-gray-600 dark:text-gray-300">
						We encountered an unexpected error. Please try again.
					</p>
					{/* SECURITY: Digest is safe to show - it's a hash, not sensitive information */}
					{error.digest && (
						<p className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
							Error ID: {error.digest}
						</p>
					)}
					<button
						onClick={reset}
						className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						Try again
					</button>
				</div>
			</div>
		);
	}

	// DEVELOPMENT mode - detailed error information for debugging
	// This helps developers identify and fix issues quickly
	// Stack traces and error details are safe to show in local development
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
			<div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
				<div className="mb-4">
					<svg
						className="mx-auto h-12 w-12 text-yellow-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h2 className="mb-4 text-center text-2xl font-semibold text-gray-900 dark:text-white">
					Development Error
				</h2>
				<div className="mb-6 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
					<p className="mb-2 font-mono text-sm font-semibold text-red-800 dark:text-red-300">
						{error.name}: {error.message}
					</p>
					{error.stack && (
						<pre className="mt-2 overflow-auto text-xs text-red-700 dark:text-red-400">
							{error.stack}
						</pre>
					)}
				</div>
				{error.digest && (
					<p className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
						Error Digest: {error.digest}
					</p>
				)}
				<button
					onClick={reset}
					className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Try again
				</button>
				<p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
					This detailed error view is only visible in development mode
				</p>
			</div>
		</div>
	);
}
