"use client";
import React, { useState } from "react";
import { ApprovedArticle, ArticleReportContract } from "@/types/article";

interface ModalArticleRejectionStatusProps {
	selectedArticle: ApprovedArticle;
	token: string;
	onClose: () => void;
	onRefresh: () => void;
}

interface ContractWithOriginal extends ArticleReportContract {
	originalIsAccepted: boolean;
}

export const ModalArticleRejectionStatus: React.FC<
	ModalArticleRejectionStatusProps
> = ({ selectedArticle, token, onClose, onRefresh }) => {
	const [contracts, setContracts] = useState<ContractWithOriginal[]>(
		selectedArticle?.ArticleReportContracts?.map((contract) => ({
			...contract,
			originalIsAccepted: contract.isAccepted,
		})) || []
	);

	const isOriginalValueSame = (contract: ContractWithOriginal): boolean => {
		return contract.isAccepted === contract.originalIsAccepted;
	};

	const handleToggleAcceptance = (contractId: number) => {
		setContracts((prevContracts) =>
			prevContracts.map((item) =>
				item.id === contractId
					? { ...item, isAccepted: !item.isAccepted }
					: item
			)
		);
	};

	const handleUpdateRejectionReason = (contractId: number, reason: string) => {
		setContracts((prevContracts) =>
			prevContracts.map((item) =>
				item.id === contractId ? { ...item, rejectionReason: reason } : item
			)
		);
	};

	const handleSubmit = async (contract: ContractWithOriginal) => {
		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL}/reports/toggle-article-rejection/${contract.id}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						articleRejectionReason: contract.rejectionReason,
					}),
				}
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Server Error: ${errorText}`);
			}

			alert(
				`Article acceptance status for report ID: ${contract.reportId} updated successfully!`
			);
			onRefresh();
			onClose();
		} catch (error) {
			console.error("Error updating article acceptance status:", error);
			alert("Error updating acceptance status. Please try again.");
		}
	};

	return (
		<div className="p-6 sm:p-8">
			{/* Title */}
			<div className="mb-6">
				<h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
					Report Rejection Status for Article ID: {selectedArticle?.id}
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
								<th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
									Accepted
								</th>
								<th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
									Rejection Reason
								</th>
								<th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
									Submit
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
							{contracts.map((contract) => {
								const isOriginal = isOriginalValueSame(contract);

								return (
									<tr
										key={contract.id}
										className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
									>
										<td className="px-4 py-3 text-gray-700 dark:text-gray-300">
											{contract.reportId}
										</td>
										<td className="px-4 py-3 text-center">
											<button
												onClick={() => handleToggleAcceptance(contract.id)}
												className={`px-4 py-1.5 rounded font-medium transition-colors ${
													isOriginal
														? contract.isAccepted
															? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
															: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
														: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
												}`}
											>
												{contract.isAccepted ? "Yes" : "No"}
											</button>
										</td>
										<td className="px-4 py-3">
											<input
												type="text"
												disabled={isOriginal}
												value={contract.rejectionReason || ""}
												onChange={(e) =>
													handleUpdateRejectionReason(
														contract.id,
														e.target.value
													)
												}
												className={`w-full px-3 py-1.5 border rounded transition-colors ${
													isOriginal
														? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
														: "bg-white dark:bg-gray-900 border-brand-500 dark:border-brand-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
												}`}
												placeholder={
													contract.isAccepted ? "" : "Enter rejection reason"
												}
											/>
										</td>
										<td className="px-4 py-3 text-center">
											{!isOriginal ? (
												<button
													onClick={() => handleSubmit(contract)}
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
