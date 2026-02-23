"use client";
import React, { useState } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	createColumnHelper,
	SortingState,
} from "@tanstack/react-table";
import { ApprovedArticle } from "@/types/article";

interface TableReportWeeklyCpscStagedArticlesProps {
	data: ApprovedArticle[];
	loading?: boolean;
	onOpenReferenceNumberModal?: (article: ApprovedArticle) => void;
	onOpenRejectedModal?: (article: ApprovedArticle) => void;
}

const columnHelper = createColumnHelper<ApprovedArticle>();

export default function TableReportWeeklyCpscStagedArticles({
	data,
	loading = false,
	onOpenReferenceNumberModal,
	onOpenRejectedModal,
}: TableReportWeeklyCpscStagedArticlesProps) {
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");

	const columns = [
		columnHelper.accessor("id", {
			header: "ID",
			enableSorting: true,
			cell: ({ row }) => (
				<div className="text-sm text-gray-700 dark:text-gray-300">
					{row.original.id}
				</div>
			),
		}),
		columnHelper.accessor("ArticleReportContracts", {
			id: "referenceNumber",
			header: "Ref #",
			enableSorting: true,
			cell: ({ row }) => (
				<button
					onClick={() => onOpenReferenceNumberModal?.(row.original)}
					className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors w-full text-left"
				>
					{row.original.ArticleReportContracts?.length > 0
						? row.original.ArticleReportContracts[0]
								.articleReferenceNumberInReport
						: "Missing Ref #"}
				</button>
			),
		}),
		columnHelper.accessor("isSubmitted", {
			header: "Submitted",
			enableSorting: true,
			cell: ({ row }) => (
				<div className="text-sm text-gray-700 dark:text-gray-300">
					{row.original.isSubmitted ? "Yes" : "No"}
				</div>
			),
		}),
		columnHelper.accessor("title", {
			header: "Headline",
			enableSorting: true,
			cell: ({ row }) => (
				<div className="relative group">
					<div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
						{row.original.title}
					</div>
					<span className="invisible group-hover:visible absolute z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 left-0 top-full mt-1 whitespace-normal max-w-xs">
						{row.original.title}
					</span>
				</div>
			),
		}),
		columnHelper.accessor("ArticleReportContracts", {
			id: "accepted",
			header: "Accepted",
			enableSorting: true,
			cell: ({ row }) => (
				<button
					onClick={() => onOpenRejectedModal?.(row.original)}
					className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
						row.original.articleHasBeenAcceptedByAll
							? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
							: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
					}`}
				>
					{row.original.articleHasBeenAcceptedByAll ? "Yes" : "No"}
				</button>
			),
		}),
		columnHelper.accessor("stateAbbreviation", {
			header: "State",
			enableSorting: true,
			cell: ({ row }) => (
				<div className="text-sm text-gray-700 dark:text-gray-300">
					{row.original.stateAbbreviation}
				</div>
			),
		}),
	];

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			pagination,
			sorting,
			globalFilter,
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		onGlobalFilterChange: setGlobalFilter,
		autoResetPageIndex: false,
	});

	if (loading) {
		return (
			<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
				<div className="flex items-center justify-center py-8">
					<div className="text-sm text-gray-500 dark:text-gray-400">
						Loading...
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
			{/* Controls */}
			{data.length > 10 && (
				<div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-600 dark:text-gray-400">
							Show:
						</span>
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
								className={`px-2 py-1 text-xs rounded transition-colors ${
									pagination.pageSize === size
										? "bg-brand-500 text-white"
										: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
								}`}
							>
								{size}
							</button>
						))}
					</div>
					<input
						type="text"
						value={globalFilter ?? ""}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
						placeholder="Search..."
					/>
					<div className="flex items-center gap-2">
						<button
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
						>
							&lt; Prev
						</button>
						<span className="text-xs text-gray-600 dark:text-gray-400">
							Page {table.getState().pagination.pageIndex + 1} of{" "}
							{table.getPageCount()}
						</span>
						<button
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
							className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
						>
							Next &gt;
						</button>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr
								key={headerGroup.id}
								className="border-b border-gray-200 dark:border-gray-800"
							>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										onClick={header.column.getToggleSortingHandler()}
										className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
									>
										<div className="flex items-center gap-1">
											{flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
											{{
												asc: " ▲",
												desc: " ▼",
											}[header.column.getIsSorted() as string] ?? ""}
										</div>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getPaginationRowModel().rows.map((row) => (
							<tr
								key={row.id}
								className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
							>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="px-4 py-3">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Empty state */}
			{data.length === 0 && (
				<div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
					No staged articles
				</div>
			)}
		</div>
	);
}
