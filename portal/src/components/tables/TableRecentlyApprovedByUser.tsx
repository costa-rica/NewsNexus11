"use client";
import React, { useState, useMemo } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	flexRender,
	SortingState,
	ColumnDef,
	VisibilityState,
} from "@tanstack/react-table";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";

export interface ApprovedArticleForComponent {
	articleId: number;
	title: string;
	description: string;
	url: string;
	publication: string;
	publicationDate: string;
	createdAt: string;
	updatedAt: string;
	states: string;
}

interface TableRecentlyApprovedByUserProps {
	data: ApprovedArticleForComponent[];
}

const TruncatedCell: React.FC<{
	value: string;
	maxLength: number;
}> = ({ value, maxLength }) => {
	const [isExpanded, setIsExpanded] = useState(false);

	if (!value) return <span className="text-gray-400">—</span>;

	const isTruncated = value.length > maxLength;
	const displayValue = isExpanded || !isTruncated ? value : value.slice(0, maxLength);

	return (
		<div className="flex items-center gap-1">
			<span className="text-sm text-gray-700 dark:text-gray-300">
				{displayValue}
			</span>
			{isTruncated && (
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-500 font-medium"
				>
					{isExpanded ? "«" : "…"}
				</button>
			)}
		</div>
	);
};

const URLCell: React.FC<{ url: string }> = ({ url }) => {
	if (!url) return <span className="text-gray-400">—</span>;

	const displayUrl = url.length > 30 ? url.slice(0, 30) + "..." : url;

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			title={url}
			className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-500 underline text-sm"
		>
			{displayUrl}
		</a>
	);
};

export const TableRecentlyApprovedByUser: React.FC<
	TableRecentlyApprovedByUserProps
> = ({ data }) => {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
		createdAt: false, // Hidden by default
	});

	const columns = useMemo<ColumnDef<ApprovedArticleForComponent>[]>(
		() => [
			{
				accessorKey: "articleId",
				header: "Article ID",
				cell: ({ getValue }) => (
					<span className="text-sm text-gray-700 dark:text-gray-300">
						{getValue() as number}
					</span>
				),
			},
			{
				accessorKey: "title",
				header: "Title",
				cell: ({ getValue }) => (
					<TruncatedCell value={getValue() as string} maxLength={30} />
				),
			},
			{
				accessorKey: "description",
				header: "Description",
				cell: ({ getValue }) => (
					<TruncatedCell value={getValue() as string} maxLength={30} />
				),
			},
			{
				accessorKey: "url",
				header: "URL",
				cell: ({ getValue }) => <URLCell url={getValue() as string} />,
			},
			{
				accessorKey: "publication",
				header: "Publication",
				cell: ({ getValue }) => (
					<span className="text-sm text-gray-700 dark:text-gray-300">
						{getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "publicationDate",
				header: "Publication Date",
				cell: ({ getValue }) => (
					<span className="text-sm text-gray-700 dark:text-gray-300">
						{getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "states",
				header: "States",
				cell: ({ getValue }) => {
					const states = getValue() as string;
					return (
						<span className="text-sm text-gray-700 dark:text-gray-300">
							{states || "—"}
						</span>
					);
				},
			},
			{
				accessorKey: "createdAt",
				header: "Created At",
				cell: ({ getValue }) => {
					const dateStr = getValue() as string;
					if (!dateStr) return <span className="text-gray-400">—</span>;
					const date = new Date(dateStr);
					return (
						<span className="text-sm text-gray-700 dark:text-gray-300">
							{date.toLocaleDateString()} {date.toLocaleTimeString()}
						</span>
					);
				},
			},
			{
				accessorKey: "updatedAt",
				header: "Updated At",
				cell: ({ getValue }) => {
					const dateStr = getValue() as string;
					if (!dateStr) return <span className="text-gray-400">—</span>;
					const date = new Date(dateStr);
					return (
						<span className="text-sm text-gray-700 dark:text-gray-300">
							{date.toLocaleDateString()} {date.toLocaleTimeString()}
						</span>
					);
				},
			},
		],
		[]
	);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			globalFilter,
			columnVisibility,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			pagination: {
				pageSize: 5,
			},
		},
	});

	return (
		<div className="space-y-4">
			{/* Controls: Column Visibility and Search */}
			<div className="flex items-center gap-3">
				<ColumnVisibilityDropdown table={table} />
				<input
					type="text"
					value={globalFilter ?? ""}
					onChange={(e) => setGlobalFilter(e.target.value)}
					placeholder="Search all columns..."
					className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white flex-1 max-w-sm"
				/>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full border-collapse">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-700">
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
										onClick={header.column.getToggleSortingHandler()}
									>
										<div className="flex items-center gap-2">
											{flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
											{{
												asc: " ↑",
												desc: " ↓",
											}[header.column.getIsSorted() as string] ?? null}
										</div>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.length === 0 ? (
							<tr>
								<td
									colSpan={columns.length}
									className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
								>
									No articles found
								</td>
							</tr>
						) : (
							table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
								>
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id} className="px-4 py-3">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination Controls */}
			<div className="flex items-center justify-between">
				<div className="text-sm text-gray-600 dark:text-gray-400">
					Showing {table.getState().pagination.pageIndex * 5 + 1} to{" "}
					{Math.min(
						(table.getState().pagination.pageIndex + 1) * 5,
						table.getFilteredRowModel().rows.length
					)}{" "}
					of {table.getFilteredRowModel().rows.length} results
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-600 dark:hover:bg-brand-700"
					>
						Previous
					</button>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-600 dark:hover:bg-brand-700"
					>
						Next
					</button>
				</div>
			</div>
		</div>
	);
};
