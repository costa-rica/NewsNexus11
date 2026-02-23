export default function AccessRestricted() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
			<div className="text-center">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
					Access Restricted
				</h1>
				<p className="text-lg text-gray-600 dark:text-gray-400">
					Request access from your administrator
				</p>
			</div>
			<div className="mt-4">
				<svg
					className="w-24 h-24 text-gray-300 dark:text-gray-700"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					/>
				</svg>
			</div>
		</div>
	);
}
