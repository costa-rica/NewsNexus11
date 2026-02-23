"use client";
import React, { useState, useMemo } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getFilteredRowModel,
	flexRender,
	createColumnHelper,
	PaginationState,
} from "@tanstack/react-table";
import { LoadingDots } from "../common/LoadingDots";

interface Report {
	id: number;
	dateSubmittedToClient: string | null;
	ArticleReportContracts: Array<{
		articleId: number;
		articleReferenceNumberInReport: string;
	}>;
}

interface ReportGroup {
	crName: string;
	reportsArray: Report[];
}

// Create columnHelper outside component for stable reference
const columnHelper = createColumnHelper<ReportGroup>();

interface TableReportsWeeklyCpscProps {
	data: ReportGroup[];
	loading?: boolean;
	onUpdateStagedArticles: (articleIds: number[]) => void;
	onOpenDateModal: (report: Report) => void;
	onDownloadReport: (reportId: number) => void;
	onRecreateReport: (reportId: number) => void;
	onDeleteReport: (report: Report) => void;
}

const TableReportsWeeklyCpsc: React.FC<TableReportsWeeklyCpscProps> = ({
	data,
	loading = false,
	onUpdateStagedArticles,
	onOpenDateModal,
	onDownloadReport,
	onRecreateReport,
	onDeleteReport,
}) => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [globalFilter, setGlobalFilter] = useState("");
	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

	const toggleExpandRow = (rowIndex: number) => {
		setExpandedRows((prev) => ({
			...prev,
			[rowIndex]: !prev[rowIndex],
		}));
	};

	// Helper to get the most recent report (highest ID)
	const getLatestReport = (reportGroup: ReportGroup): Report => {
		return [...reportGroup.reportsArray].sort((a, b) => b.id - a.id)[0];
	};

	const columns = useMemo(
		() => [
			columnHelper.accessor("crName", {
				header: "CR Name",
				enableSorting: true,
				cell: ({ getValue }) => (
					<div className="text-sm text-gray-800 dark:text-gray-200">
						{getValue()}
					</div>
				),
			}),
			columnHelper.display({
				id: "reportId",
				header: "Report ID",
				cell: ({ row }) => {
					const latestReport = getLatestReport(row.original);
					const articleIds =
						latestReport.ArticleReportContracts?.map(
							(arc) => arc.articleId
						) || [];

					return (
						<div className="text-sm">
							<button
								onClick={() => onUpdateStagedArticles(articleIds)}
								className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
							>
								{latestReport.id}
							</button>
						</div>
					);
				},
			}),
			columnHelper.display({
				id: "dateSubmittedToClient",
				header: () => (
					<div className="text-center">
						<div>Submitted</div>
						<div className="text-xs font-normal">(ET)</div>
					</div>
				),
				cell: ({ row }) => {
					const latestReport = getLatestReport(row.original);

					return (
						<div className="text-sm text-center">
							<button
								onClick={() => onOpenDateModal(latestReport)}
								className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
							>
								{latestReport.dateSubmittedToClient
									? latestReport.dateSubmittedToClient.split("T")[0]
									: "missing value"}
							</button>
						</div>
					);
				},
			}),
			columnHelper.display({
				id: "articleCount",
				header: "Article Count",
				cell: ({ row }) => {
					const latestReport = getLatestReport(row.original);
					return (
						<div className="text-sm text-center text-gray-800 dark:text-gray-200">
							{latestReport.ArticleReportContracts?.length || 0}
						</div>
					);
				},
			}),
			columnHelper.display({
				id: "actions",
				header: "Actions",
				cell: ({ row }) => {
					const latestReport = getLatestReport(row.original);

					return (
						<div className="flex items-center gap-2">
							{/* Download Button */}
							<button
								onClick={() => onDownloadReport(latestReport.id)}
								className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
								title="Download report"
							>
								<svg
									className="w-4 h-4 text-gray-600 dark:text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
									/>
								</svg>
							</button>

							{/* Recreate Button */}
							<button
								onClick={() => onRecreateReport(latestReport.id)}
								className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
								title="Recreate report"
							>
								<svg
									className="w-4 h-4 text-gray-600 dark:text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
							</button>

							{/* Delete Button */}
							<button
								onClick={() => onDeleteReport(latestReport)}
								className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
								title="Delete report"
							>
								<svg
									className="w-4 h-4 text-red-600 dark:text-red-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						</div>
					);
				},
			}),
			columnHelper.display({
				id: "expandIcon",
				header: "",
				cell: ({ row }) => {
					const hasMultipleReports = row.original.reportsArray.length > 1;
					if (!hasMultipleReports) return null;

					return (
						<div
							className="text-right cursor-pointer"
							onClick={() => toggleExpandRow(row.index)}
						>
							<svg
								className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
									expandedRows[row.index] ? "rotate-90" : ""
								}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					);
				},
			}),
		],
		[expandedRows, onUpdateStagedArticles, onOpenDateModal, onDownloadReport, onRecreateReport, onDeleteReport]
	);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			pagination,
			globalFilter,
		},
		onPaginationChange: setPagination,
		onGlobalFilterChange: setGlobalFilter,
		autoResetPageIndex: false,
	});

	if (loading) {
		return (
			<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
				<LoadingDots className="py-20" />
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
			{/* Table Controls */}
			<div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
				{/* Show rows */}
				<div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
					<span>Show rows:</span>
					{[5, 10, 20].map((size) => (
						<button
							key={size}
							onClick={() =>
								setPagination((prev) => ({
									...prev,
									pageSize: size,
									pageIndex: 0,
								}))
							}
							className={`px-3 py-1 rounded ${
								pagination.pageSize === size
									? "bg-brand-500 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
							}`}
						>
							{size}
						</button>
					))}
				</div>

				{/* Search */}
				<div className="flex-1 max-w-xs">
					<input
						type="text"
						value={globalFilter ?? ""}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="w-full h-9 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
						placeholder="Search..."
					/>
				</div>

				{/* Pagination */}
				<div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:hover:bg-gray-700"
					>
						&lt; Prev
					</button>
					<span>
						Page {table.getState().pagination.pageIndex + 1} of{" "}
						{table.getPageCount()}
					</span>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:hover:bg-gray-700"
					>
						Next &gt;
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead className="bg-gray-50 dark:bg-gray-800/50">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-gray-300"
									>
										{flexRender(
											header.column.columnDef.header,
											header.getContext()
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
						{table.getRowModel().rows.map((row) => (
							<React.Fragment key={row.id}>
								{/* Main Row */}
								<tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200"
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>

								{/* Expanded Historical Reports */}
								{expandedRows[row.index] &&
									row.original.reportsArray.length > 1 && (
										<>
											{[...row.original.reportsArray]
												.sort((a, b) => b.id - a.id)
												.slice(1) // Skip the latest (already shown)
												.map((oldReport) => (
													<tr
														key={oldReport.id}
														className="bg-gray-50 dark:bg-gray-800/30"
													>
														<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
															{/* Empty for CR Name */}
														</td>
														<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
															{oldReport.id}
														</td>
														<td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
															{oldReport.dateSubmittedToClient
																? oldReport.dateSubmittedToClient.split("T")[0]
																: "missing value"}
														</td>
														<td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
															{oldReport.ArticleReportContracts?.length || 0}
														</td>
														<td className="px-4 py-3">
															<div className="flex items-center gap-2">
																{/* Download Button */}
																<button
																	onClick={() => onDownloadReport(oldReport.id)}
																	className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
																	title="Download report"
																>
																	<svg
																		className="w-4 h-4 text-gray-600 dark:text-gray-400"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
																		/>
																	</svg>
																</button>

																{/* Recreate Button */}
																<button
																	onClick={() => onRecreateReport(oldReport.id)}
																	className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
																	title="Recreate report"
																>
																	<svg
																		className="w-4 h-4 text-gray-600 dark:text-gray-400"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
																		/>
																	</svg>
																</button>

																{/* Delete Button */}
																<button
																	onClick={() => onDeleteReport(oldReport)}
																	className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
																	title="Delete report"
																>
																	<svg
																		className="w-4 h-4 text-red-600 dark:text-red-400"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
																		/>
																	</svg>
																</button>
															</div>
														</td>
														<td className="px-4 py-3">{/* Empty for expand icon */}</td>
													</tr>
												))}
										</>
									)}
							</React.Fragment>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default TableReportsWeeklyCpsc;
