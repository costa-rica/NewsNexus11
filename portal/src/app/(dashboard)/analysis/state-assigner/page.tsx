"use client";
import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import TableReviewStateAssigner from "@/components/tables/TableReviewStateAssigner";
import type { StateAssignerArticle } from "@/types/article";
import { LoadingDots } from "@/components/common/LoadingDots";

const StateAssignerPage: React.FC = () => {
	const [articles, setArticles] = useState<StateAssignerArticle[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { token } = useAppSelector((state) => state.user);

	useEffect(() => {
		const fetchArticles = async () => {
			if (!token) {
				setError("Authentication token not found");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_BASE_URL}/analysis/state-assigner/`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							targetArticleThresholdDaysOld: 180,
						}),
					}
				);

				if (!response.ok) {
					throw new Error(`Failed to fetch articles: ${response.statusText}`);
				}

				const data = await response.json();
				setArticles(data.articles || []);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
			} finally {
				setLoading(false);
			}
		};

		fetchArticles();
	}, [token]);

	const handleArticleUpdate = (articleId: number, isHumanApproved: boolean) => {
		setArticles((prevArticles) =>
			prevArticles.map((article) =>
				article.id === articleId
					? {
							...article,
							stateAssignment: {
								...article.stateAssignment,
								isHumanApproved,
							},
					  }
					: article
			)
		);
	};

	if (loading) {
		return (
			<div className="flex flex-col gap-6">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						AI State Assigner
					</h1>
				</div>
				<LoadingDots className="py-20" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col gap-6">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						AI State Assigner
					</h1>
				</div>
				<div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
					<p className="text-red-700 dark:text-red-400">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					AI State Assigner
				</h1>
			</div>

			<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					Review and approve or reject AI-assigned state assignments for articles.
				</p>
			</div>

			{articles.length === 0 ? (
				<div className="rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-white/[0.03]">
					<p className="text-center text-gray-600 dark:text-gray-400">
						No AI reviewed articles with state assignments
					</p>
				</div>
			) : (
				<TableReviewStateAssigner
					data={articles}
					onArticleUpdate={handleArticleUpdate}
				/>
			)}
		</div>
	);
};

export default StateAssignerPage;
