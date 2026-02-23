"use client";
import React, { useState, useMemo } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	createColumnHelper,
	SortingState,
	PaginationState,
} from "@tanstack/react-table";
import Link from "next/link";
import type { GoogleRssArticle } from "@/types/article";
import { LoadingDots } from "../common/LoadingDots";

// Create columnHelper outside component for stable reference
const columnHelper = createColumnHelper<GoogleRssArticle>();

interface TableNewsOrgsGoogleRssFeedProps {
	data: GoogleRssArticle[];
	loading?: boolean;
	onRowSelect: (article: GoogleRssArticle) => void;
}

const TableNewsOrgsGoogleRssFeed: React.FC<
	TableNewsOrgsGoogleRssFeedProps
> = ({ data, loading = false, onRowSelect }) => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");

	const columns = useMemo(
		() => [
			columnHelper.accessor("title", {
				header: "Title",
				enableSorting: true,
				cell: ({ getValue }) => (
					<div className="text-sm text-gray-800 dark:text-gray-200">
						{getValue()}
					</div>
				),
			}),
			columnHelper.accessor("description", {
				header: "Description",
				enableSorting: true,
				cell: ({ getValue }) => (
					<div className="text-xs text-gray-700 dark:text-gray-300">
						{getValue() && getValue().slice(0, 150)}
						{getValue() && getValue().length > 150 ? "..." : ""}
					</div>
				),
			}),
			columnHelper.accessor("pubDate", {
				header: "Published Date",
				enableSorting: true,
				cell: ({ getValue }) => {
					const date = getValue();
					return (
						<div className="text-sm text-gray-800 dark:text-gray-200">
							{date ? new Date(date).toLocaleString() : "N/A"}
						</div>
					);
				},
			}),
			columnHelper.accessor("link", {
				header: "URL",
				enableSorting: true,
				cell: ({ getValue }) => {
					const rawUrl = getValue();
					if (!rawUrl) return null;

					const strippedUrl = rawUrl
						.replace(/^https?:\/\//, "")
						.replace(/^www\./, "");

					return (
						<div className="text-xs relative group">
							<Link
								href={rawUrl}
								target="_blank"
								className="text-brand-500 hover:text-brand-600 visited:text-purple-600 dark:text-brand-400 dark:visited:text-purple-400"
							>
								{strippedUrl.slice(0, 30)}
								{strippedUrl.length > 30 ? "..." : ""}
							</Link>
							<span className="invisible group-hover:visible absolute left-0 top-full mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded z-10 whitespace-nowrap max-w-md overflow-hidden text-ellipsis">
								{rawUrl}
							</span>
						</div>
					);
				},
			}),
			columnHelper.accessor("source", {
				header: "Publication",
				enableSorting: true,
				cell: ({ getValue }) => (
					<div className="text-sm text-gray-800 dark:text-gray-200">
						{getValue()}
					</div>
				),
			}),
			columnHelper.display({
				id: "select",
				header: () => <div className="text-center">Select</div>,
				cell: ({ row }) => (
					<div className="flex justify-center">
						<div
							className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
								row.original.selected
									? "bg-brand-500 border-brand-500"
									: "border-gray-300 dark:border-gray-600"
							}`}
							onClick={(e) => {
								e.stopPropagation();
								onRowSelect(row.original);
							}}
						>
							{row.original.selected && (
								<svg
									className="w-3 h-3 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={3}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							)}
						</div>
					</div>
				),
			}),
		],
		[onRowSelect]
	);

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
										onClick={header.column.getToggleSortingHandler()}
										className={`px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-gray-300 ${
											header.column.getCanSort()
												? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
												: ""
										}`}
									>
										<div className="flex items-center gap-1">
											{flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
											{header.column.getCanSort() &&
												{
													asc: " ▲",
													desc: " ▼",
												}[header.column.getIsSorted() as string]}
										</div>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
						{table.getPaginationRowModel().rows.map((row) => {
							const isSelected = row.original.selected;

							return (
								<tr
									key={row.id}
									className={`transition-colors ${
										isSelected
											? "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50"
											: "hover:bg-gray-50 dark:hover:bg-gray-800/50"
									}`}
								>
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200"
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* No results message */}
			{table.getPaginationRowModel().rows.length === 0 && (
				<div className="text-center py-8 text-gray-500 dark:text-gray-400">
					No articles found
				</div>
			)}
		</div>
	);
};

export default TableNewsOrgsGoogleRssFeed;
