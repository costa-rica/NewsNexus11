"use client";
import React, { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import TableNewsOrgsGoogleRssFeed from "@/components/tables/TableNewsOrgsGoogleRssFeed";
import { Modal } from "@/components/ui/modal";
import { ModalInformationYesOrNo } from "@/components/ui/modal/ModalInformationYesOrNo";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";
import type {
	GoogleRssArticle,
	GoogleRssMakeRequestResponse,
} from "@/types/article";
import { LoadingDots } from "@/components/common/LoadingDots";

export default function GoogleRssPage() {
	const { token } = useAppSelector((state) => state.user);

	// Form state
	const [andKeywords, setAndKeywords] = useState("");
	const [andExactPhrases, setAndExactPhrases] = useState("");
	const [orKeywords, setOrKeywords] = useState("");
	const [orExactPhrases, setOrExactPhrases] = useState("");
	const [timeRange, setTimeRange] = useState("7");

	// Response state
	const [requestUrl, setRequestUrl] = useState("");
	const [articles, setArticles] = useState<GoogleRssArticle[]>([]);
	const [loading, setLoading] = useState(false);

	// Modal state
	const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
	const [alertModal, setAlertModal] = useState<{
		show: boolean;
		variant: "success" | "error" | "warning";
		title: string;
		message: string;
	}>({
		show: false,
		variant: "success",
		title: "",
		message: "",
	});

	// Handle make request to Google RSS
	const handleMakeRequest = async () => {
		if (
			!andKeywords &&
			!andExactPhrases &&
			!orKeywords &&
			!orExactPhrases
		) {
			setAlertModal({
				show: true,
				variant: "warning",
				title: "Missing Required Fields",
				message:
					"At least one of: AND Keywords, AND Exact Phrases, OR Keywords, or OR Exact Phrases must be provided",
			});
			return;
		}

		try {
			setLoading(true);
			const bodyObj = {
				and_keywords: andKeywords,
				and_exact_phrases: andExactPhrases,
				or_keywords: orKeywords,
				or_exact_phrases: orExactPhrases,
				time_range: timeRange ? `${timeRange}d` : "7d",
			};

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL}/google-rss/make-request`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(bodyObj),
				}
			);

			const data: GoogleRssMakeRequestResponse = await response.json();

			if (!response.ok || !data.success) {
				setAlertModal({
					show: true,
					variant: "error",
					title: "Request Failed",
					message:
						data.message ||
						data.error ||
						"Failed to fetch articles from Google RSS feed",
				});
				return;
			}

			// Add selected property to each article
			const articlesWithSelection = (data.articlesArray || []).map((article) => ({
				...article,
				selected: false,
			}));

			setRequestUrl(data.url || "");
			setArticles(articlesWithSelection);

			setAlertModal({
				show: true,
				variant: "success",
				title: "Request Successful",
				message: `Successfully fetched ${data.count || 0} articles from Google RSS feed`,
			});
		} catch (error) {
			console.error("Error making request:", error);
			setAlertModal({
				show: true,
				variant: "error",
				title: "Request Error",
				message:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
			});
		} finally {
			setLoading(false);
		}
	};

	// Handle row selection
	const handleRowSelect = (article: GoogleRssArticle) => {
		setArticles((prev) =>
			prev.map((a) =>
				a.link === article.link ? { ...a, selected: !a.selected } : a
			)
		);
	};

	// Handle select all / deselect all
	const handleToggleSelectAll = () => {
		const allSelected = articles.every((a) => a.selected);
		setArticles((prev) =>
			prev.map((a) => ({ ...a, selected: !allSelected }))
		);
	};

	// Handle add to database
	const handleAddToDatabase = async () => {
		const selectedArticles = articles.filter((a) => a.selected);

		if (selectedArticles.length === 0) {
			setAlertModal({
				show: true,
				variant: "warning",
				title: "No Articles Selected",
				message: "Please select at least one article to add to the database",
			});
			return;
		}

		try {
			setLoading(true);
			const bodyObj = {
				articlesArray: selectedArticles.map((article) => ({
					title: article.title,
					link: article.link,
					description: article.description,
					source: article.source,
					pubDate: article.pubDate,
					content: article.content,
				})),
				url: requestUrl,
				and_keywords: andKeywords,
				and_exact_phrases: andExactPhrases,
				or_keywords: orKeywords,
				or_exact_phrases: orExactPhrases,
				time_range: timeRange ? `${timeRange}d` : "7d",
			};

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL}/google-rss/add-to-database`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(bodyObj),
				}
			);

			const data = await response.json();

			if (!response.ok || !data.success) {
				setAlertModal({
					show: true,
					variant: "error",
					title: "Database Add Failed",
					message: data.message || "Failed to add articles to database",
				});
				return;
			}

			setAlertModal({
				show: true,
				variant: "success",
				title: "Articles Added",
				message: data.message || `Successfully added ${data.articlesSaved} of ${data.articlesReceived} articles to database`,
			});

			// Clear selection after successful add
			setArticles((prev) => prev.map((a) => ({ ...a, selected: false })));
		} catch (error) {
			console.error("Error adding to database:", error);
			setAlertModal({
				show: true,
				variant: "error",
				title: "Database Error",
				message:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
			});
		} finally {
			setLoading(false);
			setIsConfirmModalOpen(false);
		}
	};

	const selectedCount = articles.filter((a) => a.selected).length;
	const allSelected = articles.length > 0 && articles.every((a) => a.selected);

	return (
		<div className="p-6 space-y-6">
			{/* Page Title */}
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					Google RSS Feed Query
				</h1>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Search Google News RSS feed and add articles to the database
				</p>
			</div>

			{/* Form Section */}
			<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
					Search Parameters
				</h2>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* AND Keywords */}
					<div>
						<Label htmlFor="and_keywords">AND Keywords</Label>
						<Input
							id="and_keywords"
							type="text"
							value={andKeywords}
							onChange={(e) => setAndKeywords(e.target.value)}
							placeholder="e.g., product recall, consumer safety"
							hint="Comma-separated keywords (all must be present)"
						/>
					</div>

					{/* AND Exact Phrases */}
					<div>
						<Label htmlFor="and_exact_phrases">AND Exact Phrases</Label>
						<Input
							id="and_exact_phrases"
							type="text"
							value={andExactPhrases}
							onChange={(e) => setAndExactPhrases(e.target.value)}
							placeholder='e.g., "product recall", "consumer safety"'
							hint="Quoted exact phrases (all must be present)"
						/>
					</div>

					{/* OR Keywords */}
					<div>
						<Label htmlFor="or_keywords">OR Keywords</Label>
						<Input
							id="or_keywords"
							type="text"
							value={orKeywords}
							onChange={(e) => setOrKeywords(e.target.value)}
							placeholder="e.g., fire, burn, explode"
							hint="Comma-separated keywords (at least one must be present)"
						/>
					</div>

					{/* OR Exact Phrases */}
					<div>
						<Label htmlFor="or_exact_phrases">OR Exact Phrases</Label>
						<Input
							id="or_exact_phrases"
							type="text"
							value={orExactPhrases}
							onChange={(e) => setOrExactPhrases(e.target.value)}
							placeholder='e.g., "fire hazard", "burn risk"'
							hint="Quoted exact phrases (at least one must be present)"
						/>
					</div>

					{/* Time Range */}
					<div>
						<Label htmlFor="time_range">Time Range (days)</Label>
						<Input
							id="time_range"
							type="number"
							value={timeRange}
							onChange={(e) => setTimeRange(e.target.value)}
							placeholder="7"
							min="1"
							hint="Number of days to search back (e.g., 7, 30, 180)"
						/>
					</div>
				</div>

				{/* Request Button */}
				<div className="mt-6 flex justify-end">
					<Button
						onClick={handleMakeRequest}
						disabled={loading}
						size="md"
						variant="primary"
					>
						{loading ? "Requesting..." : "Request"}
					</Button>
				</div>
			</div>

			{/* URL Display Section */}
			{requestUrl && (
				<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
						Google RSS Feed URL
					</h3>
					<div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
						<code className="text-xs text-gray-800 dark:text-gray-200 break-all">
							{requestUrl}
						</code>
					</div>
					<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
						Copy this URL to view the raw RSS feed in your browser
					</p>
				</div>
			)}

			{/* Table Section */}
			{articles.length > 0 && (
				<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
					{/* Header with buttons */}
					<div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-800">
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
							Google RSS Query Articles
							{selectedCount > 0 && (
								<span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
									({selectedCount} selected)
								</span>
							)}
						</h2>
						<div className="flex gap-3">
							<Button
								onClick={handleToggleSelectAll}
								size="sm"
								variant="outline"
							>
								{allSelected ? "Deselect All" : "Select All"}
							</Button>
							<Button
								onClick={() => setIsConfirmModalOpen(true)}
								disabled={selectedCount === 0}
								size="sm"
								variant="primary"
							>
								Add to Database
							</Button>
						</div>
					</div>

					{/* Table */}
					<div className="p-6">
						<TableNewsOrgsGoogleRssFeed
							data={articles}
							loading={loading}
							onRowSelect={handleRowSelect}
						/>
					</div>
				</div>
			)}

			{/* Loading state when no articles yet */}
			{loading && articles.length === 0 && (
				<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
					<LoadingDots className="py-20" />
				</div>
			)}

			{/* Confirmation Modal */}
			<Modal
				isOpen={isConfirmModalOpen}
				onClose={() => setIsConfirmModalOpen(false)}
			>
				<ModalInformationYesOrNo
					title="Confirm Add to Database"
					message={`Are you sure you want to add ${selectedCount} selected article${
						selectedCount !== 1 ? "s" : ""
					} to the database?`}
					yesButtonText="Add to Database"
					noButtonText="Cancel"
					yesButtonStyle="primary"
					onYes={handleAddToDatabase}
					onClose={() => setIsConfirmModalOpen(false)}
				/>
			</Modal>

			{/* Alert Modal */}
			<Modal
				isOpen={alertModal.show}
				onClose={() => setAlertModal({ ...alertModal, show: false })}
			>
				<ModalInformationOk
					title={alertModal.title}
					message={alertModal.message}
					variant={alertModal.variant}
					onClose={() => setAlertModal({ ...alertModal, show: false })}
				/>
			</Modal>
		</div>
	);
}
