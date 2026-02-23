"use client";
import React, { useState } from "react";

interface Report {
	id: number;
	dateSubmittedToClient: string | null;
}

interface ModalReportDateContentProps {
	selectedReport: Report;
	onSubmit: (date: string) => void;
}

export const ModalReportDateContent: React.FC<ModalReportDateContentProps> = ({
	selectedReport,
	onSubmit,
}) => {
	const [reportDate, setReportDate] = useState(() => {
		const initialDate = selectedReport?.dateSubmittedToClient;
		return initialDate ? initialDate.split("T")[0] : "";
	});

	const hasExistingDate =
		selectedReport?.dateSubmittedToClient &&
		selectedReport.dateSubmittedToClient !== "N/A";

	const handleSubmit = () => {
		if (reportDate) {
			onSubmit(reportDate);
		}
	};

	return (
		<div className="p-6 sm:p-8 ">
			{/* Title */}
			<div className="mb-6">
				{hasExistingDate ? (
					<h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
						Report already has a date. Are you sure you want to change it?
					</h2>
				) : (
					<h2 className="text-xl font-semibold text-gray-800 dark:text-white">
						Update Report Submission Date
					</h2>
				)}
			</div>

			{/* Content */}
			<div className="mb-6 space-y-4">
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Select the date the report was submitted to CPSC.
				</p>

				<div>
					<label
						htmlFor="reportDate"
						className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
					>
						Submission Date
					</label>
					<input
						id="reportDate"
						type="date"
						value={reportDate}
						onChange={(e) => setReportDate(e.target.value)}
						max={new Date().toISOString().split("T")[0]}
						className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
							hasExistingDate
								? "border-red-300 focus:ring-red-500 dark:border-red-700 dark:focus:ring-red-500"
								: "border-gray-300 focus:ring-brand-500 dark:border-gray-700 dark:focus:ring-brand-500"
						} dark:bg-gray-800 dark:text-white`}
					/>
				</div>
			</div>

			{/* Actions */}
			<div className="flex justify-end">
				<button
					onClick={handleSubmit}
					disabled={!reportDate}
					className="px-6 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-brand-600 dark:hover:bg-brand-700"
				>
					Submit
				</button>
			</div>
		</div>
	);
};
