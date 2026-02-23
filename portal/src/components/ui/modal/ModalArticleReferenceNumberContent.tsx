"use client";
import React, { useState } from "react";
import { ApprovedArticle, ArticleReportContract } from "@/types/article";

interface ModalArticleReferenceNumberContentProps {
	selectedArticle: ApprovedArticle;
	token: string;
	onClose: () => void;
	onRefresh: () => void;
}

interface ContractWithEdit extends ArticleReportContract {
	toggleEdit: boolean;
	originalArticleReferenceNumberInReport: string;
}

export const ModalArticleReferenceNumberContent: React.FC<
	ModalArticleReferenceNumberContentProps
> = ({ selectedArticle, token, onClose, onRefresh }) => {
	const [contracts, setContracts] = useState<ContractWithEdit[]>(
		selectedArticle?.ArticleReportContracts?.map((contract) => ({
			...contract,
			toggleEdit: true,
			originalArticleReferenceNumberInReport:
				contract.articleReferenceNumberInReport,
		})) || []
	);

	const isOriginalValueSame = (contract: ContractWithEdit): boolean => {
		return (
			contract.articleReferenceNumberInReport ===
			contract.originalArticleReferenceNumberInReport
		);
	};

	const handleUpdateReferenceNumber = async (contract: ContractWithEdit) => {
		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL}/reports/update-article-report-reference-number/${contract.id}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						articleReferenceNumberInReport:
							contract.articleReferenceNumberInReport,
					}),
				}
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Server Error: ${errorText}`);
			}

			alert(
				`Article reference number for report ID: ${contract.reportId} updated successfully!`
			);
			onRefresh();
			onClose();
		} catch (error) {
			console.error("Error updating article reference number:", error);
			alert("Error updating reference number. Please try again.");
		}
	};

	const handleToggleEdit = (contractId: number) => {
		setContracts((prevContracts) =>
			prevContracts.map((item) => {
				if (item.id === contractId) {
					const isCurrentlyEditing = !item.toggleEdit;
					return {
						...item,
						toggleEdit: !item.toggleEdit,
						articleReferenceNumberInReport: isCurrentlyEditing
							? item.originalArticleReferenceNumberInReport
							: item.articleReferenceNumberInReport,
					};
				}
				return item;
			})
		);
	};

	const handleInputChange = (contractId: number, value: string) => {
		setContracts((prevContracts) =>
			prevContracts.map((item) =>
				item.id === contractId
					? { ...item, articleReferenceNumberInReport: value }
					: item
			)
		);
	};

	return (
		<div className="p-6 sm:p-8">
			{/* Title */}
			<div className="mb-6">
				<h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
					Article-Report Reference Numbers for Article ID: {selectedArticle?.id}
				</h2>
				<p className="text-sm text-gray-600 dark:text-gray-400 truncate">
					Title: {selectedArticle?.title}
				</p>
			</div>

			{/* Content */}
			<div className="mb-6">
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					This article was included in the following reports:
				</p>

				<div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 dark:bg-gray-800">
							<tr>
								<th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
									Report ID
								</th>
								<th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
									Reference Number
								</th>
								<th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
									Action
								</th>
								<th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
									Submit
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
							{contracts.map((contract) => {
								const isOriginal = isOriginalValueSame(contract);
								const hasValue = Boolean(contract.articleReferenceNumberInReport);

								return (
									<tr
										key={contract.id}
										className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
									>
										<td className="px-4 py-3 text-gray-700 dark:text-gray-300">
											{contract.reportId}
										</td>
										<td className="px-4 py-3">
											<input
												type="text"
												disabled={contract.toggleEdit}
												value={contract.articleReferenceNumberInReport || ""}
												onChange={(e) =>
													handleInputChange(contract.id, e.target.value)
												}
												className={`w-full px-3 py-1.5 border rounded transition-colors ${
													contract.toggleEdit
														? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
														: "bg-white dark:bg-gray-900 border-brand-500 dark:border-brand-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
												}`}
											/>
										</td>
										<td className="px-4 py-3 text-center">
											<button
												onClick={() => handleToggleEdit(contract.id)}
												className={`px-4 py-1.5 rounded font-medium transition-colors ${
													isOriginal
														? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
														: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
												} ${
													!hasValue
														? "border border-red-300 dark:border-red-700"
														: ""
												}`}
											>
												{isOriginal ? "Edit" : "Undo"}
											</button>
										</td>
										<td className="px-4 py-3 text-center">
											{!isOriginal ? (
												<button
													onClick={() => handleUpdateReferenceNumber(contract)}
													className="px-4 py-1.5 bg-brand-500 text-white rounded font-medium hover:bg-brand-600 transition-colors dark:bg-brand-600 dark:hover:bg-brand-700"
												>
													Submit
												</button>
											) : (
												<div className="h-8"></div>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Actions */}
			<div className="flex justify-end">
				<button
					onClick={onClose}
					className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					Done
				</button>
			</div>
		</div>
	);
};
