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
	VisibilityState,
} from "@tanstack/react-table";
import { ChatGPTApprovedArticle } from "@/types/article";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";
import { LoadingDots } from "@/components/common/LoadingDots";

// Create columnHelper outside component for stable reference
const columnHelper = createColumnHelper<ChatGPTApprovedArticle>();

interface TableApprovedArticlesChatGptProps {
	data: ChatGPTApprovedArticle[];
	loading?: boolean;
	onSelectArticle?: (article: ChatGPTApprovedArticle) => void;
	onHumanApprove?: (articleId: number) => void;
}

const TableApprovedArticlesChatGpt: React.FC<TableApprovedArticlesChatGptProps> = ({
	data,
	loading = false,
	onSelectArticle,
	onHumanApprove,
}) => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ createdAt: false });

	const columns = useMemo(
		() => [
			columnHelper.accessor("id", {
				header: "ID",
				enableSorting: true,
				cell: ({ row }) => (
					<button
						onClick={() => onSelectArticle?.(row.original)}
						className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors underline cursor-pointer"
					>
						{row.original.id}
					</button>
				),
			}),
			columnHelper.accessor("title", {
				header: "Headline",
				enableSorting: true,
				cell: ({ row }) => (
					<div className="relative group">
						<div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[250px]">
							{row.original.title}
						</div>
						<span className="invisible group-hover:visible absolute z-10 bg-gray-900 text-white text-xs rounded py-1 px-2 left-0 top-full mt-1 whitespace-normal max-w-md">
							{row.original.title}
						</span>
					</div>
				),
			}),
			columnHelper.accessor("publicationName", {
				header: "Pub Name",
				enableSorting: true,
				cell: ({ row }) => (
					<div className="text-sm text-gray-700 dark:text-gray-300">
						{row.original.publicationName}
					</div>
				),
			}),
			columnHelper.accessor("publishedDate", {
				header: "Pub Date",
				enableSorting: true,
				cell: ({ row }) => (
					<div className="text-sm text-gray-700 dark:text-gray-300">
						{row.original.publishedDate?.split("T")[0]}
					</div>
				),
			}),
			columnHelper.accessor("States", {
				header: "State",
				enableSorting: true,
				cell: ({ row }) => (
					<div className="text-sm text-gray-700 dark:text-gray-300">
						{row.original.States && row.original.States.length > 1
							? row.original.States.map((state) => state.name)
									.join(", ")
									.substring(0, 30)
							: row.original.States?.[0]?.name}
					</div>
				),
			}),
			columnHelper.accessor(
				(row) => {
					// Get the most recent approval (last in array)
					const approvals = row.ArticlesApproved02;
					if (!approvals || approvals.length === 0) return false;
					const mostRecent = approvals[approvals.length - 1];
					// Handle both boolean and number (1/0) values
					return Boolean(mostRecent.isApproved);
				},
				{
					id: "aiApproval",
					header: "AI Approved",
					enableSorting: true,
					cell: ({ getValue }) => (
						<div className="text-sm text-gray-700 dark:text-gray-300">
							{getValue() ? "Yes" : "No"}
						</div>
					),
				}
			),
			columnHelper.accessor(
				(row) => Boolean(row.ArticleApprovedsIsApproved),
				{
					id: "humanApproval",
					header: "Human Approved",
					enableSorting: true,
					cell: ({ getValue }) => (
						<div className="text-sm text-gray-700 dark:text-gray-300">
							{getValue() ? "Yes" : "No"}
						</div>
					),
				}
			),
			columnHelper.accessor("createdAt", {
				header: "Created At",
				enableSorting: true,
				cell: ({ row }) => (
					<div className="text-sm text-gray-700 dark:text-gray-300">
						{row.original.createdAt?.split("T")[0]}
					</div>
				),
			}),
			columnHelper.display({
				id: "actions",
				header: "Actions",
				cell: ({ row }) => (
					<button
						onClick={() => onHumanApprove?.(row.original.id)}
						className="px-3 py-1.5 text-xs font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 transition-colors"
					>
						Human Approve
					</button>
				),
			}),
		],
		[onSelectArticle, onHumanApprove]
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
			columnVisibility,
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		onGlobalFilterChange: setGlobalFilter,
		onColumnVisibilityChange: setColumnVisibility,
		autoResetPageIndex: false,
	});

	if (loading) {
		return (
			<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
				<div className="flex items-center justify-center py-8">
					<LoadingDots size={4} />
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
				{/* Controls */}
				<div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<span className="text-xs text-gray-600 dark:text-gray-400">
								Show:
							</span>
							{[10, 20, 50].map((size) => (
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
						<ColumnVisibilityDropdown
							table={table}
						/>
					</div>
					<div className="flex items-center gap-2">
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
											className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
						<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
							{table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
								>
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id} className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
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
						No approved articles
					</div>
				)}
			</div>
		</>
	);
};

export default TableApprovedArticlesChatGpt;
