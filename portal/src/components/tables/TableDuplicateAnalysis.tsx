"use client";
import React, { useState, useMemo } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	flexRender,
	createColumnHelper,
	PaginationState,
	SortingState,
	Row,
} from "@tanstack/react-table";
import { LoadingDots } from "../common/LoadingDots";

// Types for the API response
interface NewArticleInformation {
	headlineForPdfReport: string;
	publicationNameForPdfReport: string;
	publicationDateForPdfReport: string;
	textForPdfReport: string;
	urlForPdfReport: string;
	state: string;
	articleReportRefIdNew: number;
}

interface ApprovedArticle {
	articleIdApproved: number;
	embeddingSearch: number;
	articleReportRefIdApproved: number;
	headlineForPdfReport: string;
	publicationNameForPdfReport: string;
	publicationDateForPdfReport: string;
	textForPdfReport: string;
	urlForPdfReport: string;
	state: string;
}

interface ReportArticleEntry {
	maxEmbedding: number;
	articleReferenceNumberInReport: number;
	newArticleInformation: NewArticleInformation | null;
	approvedArticlesArray: ApprovedArticle[];
}

export interface ReportArticleDictionary {
	[articleId: string]: ReportArticleEntry;
}

// Flattened row type for the table
export interface TableRow {
	articleIdNew: number;
	articleReportRefIdNew: number;
	ArticleIdApproved: number;
	articleReportRefIdApproved: number;
	embeddingSearch: number;
	headlineForPdfReport: string;
	publicationNameForPdfReport: string;
	publicationDateForPdfReport: string;
	textForPdfReport: string;
	urlForPdfReport: string;
	state: string;
	isMainRow: boolean;
	groupId: string;
	subRows?: TableRow[];
}

const columnHelper = createColumnHelper<TableRow>();

interface TableDuplicateAnalysisProps {
	data: ReportArticleDictionary;
	loading?: boolean;
}

const TableDuplicateAnalysis: React.FC<TableDuplicateAnalysisProps> = ({
	data,
	loading = false,
}) => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

	// Transform dictionary data into flattened row structure with grouping
	const tableData = useMemo(() => {
		const rows: TableRow[] = [];

		Object.entries(data).forEach(([articleId, entry]) => {
			// Skip entries where newArticleInformation is null
			if (!entry.newArticleInformation) {
				return;
			}

			// Store in variable so TypeScript knows it's non-null
			const newArticleInfo = entry.newArticleInformation;
			const articleIdNew = parseInt(articleId);

			// Create main row
			const mainRow: TableRow = {
				articleIdNew,
				articleReportRefIdNew: newArticleInfo.articleReportRefIdNew,
				ArticleIdApproved: articleIdNew,
				articleReportRefIdApproved: newArticleInfo.articleReportRefIdNew,
				embeddingSearch: 1.0,
				headlineForPdfReport: newArticleInfo.headlineForPdfReport,
				publicationNameForPdfReport: newArticleInfo.publicationNameForPdfReport,
				publicationDateForPdfReport: newArticleInfo.publicationDateForPdfReport,
				textForPdfReport: newArticleInfo.textForPdfReport,
				urlForPdfReport: newArticleInfo.urlForPdfReport,
				state: newArticleInfo.state,
				isMainRow: true,
				groupId: articleId,
				subRows: [],
			};

			// Create sub-rows from approved articles array
			const subRows: TableRow[] = entry.approvedArticlesArray.map((approved) => ({
				articleIdNew,
				articleReportRefIdNew: newArticleInfo.articleReportRefIdNew,
				ArticleIdApproved: approved.articleIdApproved,
				articleReportRefIdApproved: approved.articleReportRefIdApproved,
				embeddingSearch: approved.embeddingSearch,
				headlineForPdfReport: approved.headlineForPdfReport,
				publicationNameForPdfReport: approved.publicationNameForPdfReport,
				publicationDateForPdfReport: approved.publicationDateForPdfReport,
				textForPdfReport: approved.textForPdfReport,
				urlForPdfReport: approved.urlForPdfReport,
				state: approved.state,
				isMainRow: false,
				groupId: articleId,
			}));

			mainRow.subRows = subRows;
			rows.push(mainRow);
		});

		return rows;
	}, [data]);

	// Custom filter function that only filters main rows
	const customFilterFn = (row: Row<TableRow>, columnId: string, filterValue: string) => {
		if (!row.original.isMainRow) return true; // Always include sub-rows

		const searchValue = filterValue.toLowerCase();
		const searchableFields = [
			row.original.headlineForPdfReport,
			row.original.publicationNameForPdfReport,
			row.original.state,
			row.original.articleIdNew.toString(),
			row.original.articleReportRefIdNew.toString(),
		];

		return searchableFields.some((field) =>
			field?.toString().toLowerCase().includes(searchValue)
		);
	};

	const columns = useMemo(
		() => [
			columnHelper.accessor("articleIdNew", {
				header: "Article ID New",
				enableSorting: true,
				cell: ({ row, getValue }) => (
					<div
						className={`text-sm ${
							row.original.isMainRow
								? "text-gray-800 dark:text-gray-200 font-bold"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						{getValue()}
					</div>
				),
			}),
			columnHelper.accessor("articleReportRefIdNew", {
				header: "Ref ID New",
				enableSorting: true,
				cell: ({ row, getValue }) => (
					<div
						className={`text-sm ${
							row.original.isMainRow
								? "text-gray-800 dark:text-gray-200 font-bold"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						{getValue()}
					</div>
				),
			}),
			columnHelper.accessor("ArticleIdApproved", {
				header: "Article ID Approved",
				enableSorting: true,
				cell: ({ row, getValue }) => (
					<div
						className={`text-sm ${
							row.original.isMainRow
								? "text-gray-800 dark:text-gray-200 font-bold"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						{getValue()}
					</div>
				),
			}),
			columnHelper.accessor("articleReportRefIdApproved", {
				header: "Ref ID Approved",
				enableSorting: true,
				cell: ({ row, getValue }) => (
					<div
						className={`text-sm ${
							row.original.isMainRow
								? "text-gray-800 dark:text-gray-200 font-bold"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						{getValue()}
					</div>
				),
			}),
			columnHelper.accessor("embeddingSearch", {
				header: "Embedding",
				enableSorting: true,
				cell: ({ row, getValue }) => (
					<div
						className={`text-sm ${
							row.original.isMainRow
								? "text-gray-800 dark:text-gray-200 font-bold"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						{(getValue() as number).toFixed(3)}
					</div>
				),
			}),
			columnHelper.accessor("headlineForPdfReport", {
				header: "Headline",
				enableSorting: true,
				cell: ({ row, getValue }) => (
					<div
						className={`text-sm max-w-xs truncate ${
							row.original.isMainRow
								? "text-gray-800 dark:text-gray-200 font-bold"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						{getValue()}
					</div>
				),
			}),
			columnHelper.accessor("publicationNameForPdfReport", {
				header: "Publication",
				enableSorting: true,
				cell: ({ row, getValue }) => (
					<div
						className={`text-sm ${
							row.original.isMainRow
								? "text-gray-800 dark:text-gray-200 font-bold"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						{getValue()}
					</div>
				),
			}),
			columnHelper.accessor("publicationDateForPdfReport", {
				header: "Date",
				enableSorting: true,
				cell: ({ row, getValue }) => (
					<div
						className={`text-sm ${
							row.original.isMainRow
								? "text-gray-800 dark:text-gray-200 font-bold"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						{getValue()}
					</div>
				),
			}),
			columnHelper.accessor("state", {
				header: "State",
				enableSorting: true,
				cell: ({ row, getValue }) => (
					<div
						className={`text-sm ${
							row.original.isMainRow
								? "text-gray-800 dark:text-gray-200 font-bold"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						{getValue()}
					</div>
				),
			}),
			columnHelper.display({
				id: "expand",
				header: "",
				cell: ({ row }) => {
					if (!row.original.isMainRow) return null;
					if (!row.original.subRows || row.original.subRows.length === 0) return null;

					const isExpanded = expandedGroups[row.original.groupId];

					return (
						<button
							onClick={(e) => {
								e.stopPropagation();
								setExpandedGroups((prev) => ({
									...prev,
									[row.original.groupId]: !prev[row.original.groupId],
								}));
							}}
							className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
						>
							<svg
								className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
									isExpanded ? "rotate-90" : ""
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
						</button>
					);
				},
			}),
		],
		[expandedGroups]
	);

	const table = useReactTable({
		data: tableData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		globalFilterFn: customFilterFn,
		state: {
			pagination,
			globalFilter,
			sorting,
		},
		onPaginationChange: setPagination,
		onGlobalFilterChange: setGlobalFilter,
		onSortingChange: setSorting,
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
					<span>Show groups:</span>
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
										className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-gray-300 cursor-pointer select-none"
										onClick={header.column.getToggleSortingHandler()}
									>
										<div className="flex items-center gap-2">
											{flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
											{header.column.getCanSort() && (
												<span className="text-gray-400">
													{{
														asc: "↑",
														desc: "↓",
													}[header.column.getIsSorted() as string] ?? "↕"}
												</span>
											)}
										</div>
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

								{/* Sub-Rows (Approved Articles) */}
								{expandedGroups[row.original.groupId] &&
									row.original.subRows?.map((subRow, subIndex) => (
										<tr
											key={`${row.id}-sub-${subIndex}`}
											className="bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
										>
											<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
												{subRow.articleIdNew}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
												{subRow.articleReportRefIdNew}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
												{subRow.ArticleIdApproved}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
												{subRow.articleReportRefIdApproved}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
												{subRow.embeddingSearch.toFixed(3)}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
												{subRow.headlineForPdfReport}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
												{subRow.publicationNameForPdfReport}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
												{subRow.publicationDateForPdfReport}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
												{subRow.state}
											</td>
											<td className="px-4 py-3"></td>
										</tr>
									))}
							</React.Fragment>
						))}
					</tbody>
				</table>
			</div>

			{/* No results message */}
			{table.getRowModel().rows.length === 0 && (
				<div className="text-center py-8 text-gray-500 dark:text-gray-400">
					No duplicate analysis data found
				</div>
			)}
		</div>
	);
};

export default TableDuplicateAnalysis;
