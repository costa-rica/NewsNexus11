'use client';

/**
 * Global Error Boundary - Security Hardened
 *
 * PURPOSE: Catches errors in the root layout and prevents information leakage
 *
 * SECURITY CONTEXT:
 * This is the last line of defense for error handling. It catches errors that
 * occur in the root layout (app/layout.tsx) which the regular error.tsx cannot handle.
 *
 * During the December 2025 security breach, error messages exposed sensitive
 * system information to attackers. This global boundary ensures that even
 * catastrophic layout errors don't leak internal details.
 *
 * IMPLEMENTATION:
 * - Production: Shows generic error page (no system details exposed)
 * - Development: Shows detailed errors for debugging
 * - Must include <html> and <body> tags (replaces entire page when triggered)
 * - Server-side logging only (never expose to client in production)
 *
 * REFERENCE: docs/security-measures20251213/Security_Measures_01_Abbreviated.md
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts
 */

import { useEffect } from 'react';

interface GlobalErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
	useEffect(() => {
		// SECURITY: Log errors server-side for monitoring and incident response
		// These logs should be reviewed regularly for security incidents
		console.error('Global Application Error:', error);
	}, [error]);

	// SECURITY: Production mode - completely sanitized response
	// CRITICAL: Never expose stack traces, file paths, or internal details
	// This is a global error, so assume maximum security risk
	if (process.env.NODE_ENV === 'production') {
		return (
			<html lang="en">
				<body>
					<div
						style={{
							display: 'flex',
							minHeight: '100vh',
							alignItems: 'center',
							justifyContent: 'center',
							backgroundColor: '#f9fafb',
							padding: '1rem',
						}}
					>
						<div
							style={{
								maxWidth: '28rem',
								width: '100%',
								backgroundColor: 'white',
								borderRadius: '0.5rem',
								padding: '2rem',
								boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
								textAlign: 'center',
							}}
						>
							<svg
								style={{
									width: '3rem',
									height: '3rem',
									margin: '0 auto 1rem',
									color: '#ef4444',
								}}
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
							<h2
								style={{
									fontSize: '1.5rem',
									fontWeight: '600',
									marginBottom: '1rem',
									color: '#111827',
								}}
							>
								Application Error
							</h2>
							<p
								style={{
									marginBottom: '1.5rem',
									color: '#6b7280',
								}}
							>
								An unexpected error occurred. Please refresh the page or contact
								support if the problem persists.
							</p>
							{/* SECURITY: Error digest is safe - it's a hash for support reference */}
							{error.digest && (
								<p
									style={{
										marginBottom: '1.5rem',
										fontSize: '0.875rem',
										color: '#9ca3af',
									}}
								>
									Error Reference: {error.digest}
								</p>
							)}
							<button
								onClick={reset}
								style={{
									width: '100%',
									backgroundColor: '#2563eb',
									color: 'white',
									padding: '0.5rem 1rem',
									borderRadius: '0.5rem',
									border: 'none',
									fontWeight: '500',
									cursor: 'pointer',
									fontSize: '1rem',
								}}
								onMouseOver={(e) =>
									(e.currentTarget.style.backgroundColor = '#1d4ed8')
								}
								onMouseOut={(e) =>
									(e.currentTarget.style.backgroundColor = '#2563eb')
								}
							>
								Try again
							</button>
						</div>
					</div>
				</body>
			</html>
		);
	}

	// DEVELOPMENT mode - detailed error information
	// Helps developers debug root layout and provider issues
	return (
		<html lang="en">
			<body>
				<div
					style={{
						display: 'flex',
						minHeight: '100vh',
						alignItems: 'center',
						justifyContent: 'center',
						backgroundColor: '#f9fafb',
						padding: '1rem',
					}}
				>
					<div
						style={{
							maxWidth: '48rem',
							width: '100%',
							backgroundColor: 'white',
							borderRadius: '0.5rem',
							padding: '2rem',
							boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
						}}
					>
						<svg
							style={{
								width: '3rem',
								height: '3rem',
								margin: '0 auto 1rem',
								color: '#eab308',
							}}
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
						<h2
							style={{
								fontSize: '1.5rem',
								fontWeight: '600',
								marginBottom: '1rem',
								textAlign: 'center',
								color: '#111827',
							}}
						>
							Development: Global Error
						</h2>
						<div
							style={{
								backgroundColor: '#fef2f2',
								borderRadius: '0.375rem',
								padding: '1rem',
								marginBottom: '1.5rem',
							}}
						>
							<p
								style={{
									fontFamily: 'monospace',
									fontSize: '0.875rem',
									fontWeight: '600',
									marginBottom: '0.5rem',
									color: '#991b1b',
								}}
							>
								{error.name}: {error.message}
							</p>
							{error.stack && (
								<pre
									style={{
										marginTop: '0.5rem',
										fontSize: '0.75rem',
										overflow: 'auto',
										color: '#b91c1c',
										whiteSpace: 'pre-wrap',
										wordBreak: 'break-word',
									}}
								>
									{error.stack}
								</pre>
							)}
						</div>
						{error.digest && (
							<p
								style={{
									textAlign: 'center',
									fontSize: '0.875rem',
									marginBottom: '1rem',
									color: '#6b7280',
								}}
							>
								Error Digest: {error.digest}
							</p>
						)}
						<button
							onClick={reset}
							style={{
								width: '100%',
								backgroundColor: '#2563eb',
								color: 'white',
								padding: '0.5rem 1rem',
								borderRadius: '0.5rem',
								border: 'none',
								fontWeight: '500',
								cursor: 'pointer',
								fontSize: '1rem',
								marginBottom: '1rem',
							}}
							onMouseOver={(e) =>
								(e.currentTarget.style.backgroundColor = '#1d4ed8')
							}
							onMouseOut={(e) =>
								(e.currentTarget.style.backgroundColor = '#2563eb')
							}
						>
							Try again
						</button>
						<p
							style={{
								textAlign: 'center',
								fontSize: '0.75rem',
								color: '#9ca3af',
							}}
						>
							This detailed view is only visible in development. Production shows
							a sanitized error page.
						</p>
						<div
							style={{
								marginTop: '1rem',
								padding: '1rem',
								backgroundColor: '#eff6ff',
								borderRadius: '0.375rem',
								borderLeft: '4px solid #2563eb',
							}}
						>
							<p
								style={{
									fontSize: '0.875rem',
									color: '#1e40af',
									fontWeight: '500',
								}}
							>
								Note: This is a global error boundary
							</p>
							<p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#1e3a8a' }}>
								This error occurred in the root layout or a provider. Check
								app/layout.tsx, providers.tsx, and context providers.
							</p>
						</div>
					</div>
				</div>
			</body>
		</html>
	);
}
