"use client";
import React, { useState } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	ColumnDef,
	SortingState,
	PaginationState,
	VisibilityState,
} from "@tanstack/react-table";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";
import { LoadingDots } from "../common/LoadingDots";

interface TableAdminDatabaseMainProps<TData> {
	data: TData[];
	columns: ColumnDef<TData, unknown>[];
	selectedRowId?: number | null;
	loading?: boolean;
}

const TableAdminDatabaseMain = <TData extends { id: number | null }>({
	data,
	columns,
	selectedRowId = null,
	loading = false,
}: TableAdminDatabaseMainProps<TData>) => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
		createdAt: false,
		updatedAt: false,
	});

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

	if (!columns || columns.length === 0) {
		return null;
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingDots size={3} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Controls: Page Size, Search, Column Visibility, Pagination */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				{/* Left: Page Size */}
				<div className="flex items-center gap-2">
					<span className="text-sm text-gray-700 dark:text-gray-300">
						Show rows:
					</span>
					{[10, 25, 50].map((size) => (
						<button
							key={size}
							onClick={() =>
								setPagination((prev) => ({
									...prev,
									pageSize: size,
									pageIndex: 0,
								}))
							}
							className={`px-3 py-1 text-sm rounded transition-colors ${
								pagination.pageSize === size
									? "bg-brand-500 text-white dark:bg-brand-600"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
							}`}
						>
							{size}
						</button>
					))}
				</div>

				{/* Right: Search and Column Visibility */}
				<div className="flex items-center gap-3">
					<input
						type="text"
						value={globalFilter ?? ""}
						onChange={(e) => setGlobalFilter(e.target.value)}
						placeholder="Search..."
						className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
					/>
					<ColumnVisibilityDropdown table={table} />
				</div>
			</div>

			{/* Table */}
			<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											onClick={header.column.getToggleSortingHandler()}
											className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 select-none"
										>
											<div className="flex items-center gap-2">
												{flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
												{{
													asc: <span className="text-brand-500">▲</span>,
													desc: <span className="text-brand-500">▼</span>,
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
										className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
									>
										No data available
									</td>
								</tr>
							) : (
								table.getRowModel().rows.map((row) => (
									<tr
										key={row.id}
										className={`border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
											row.original.id === selectedRowId
												? "bg-brand-50 dark:bg-brand-900/20"
												: ""
										}`}
									>
										{row.getVisibleCells().map((cell) => (
											<td
												key={cell.id}
												className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300"
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</td>
										))}
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<div className="text-sm text-gray-700 dark:text-gray-300">
					Showing {table.getRowModel().rows.length} of {data.length} rows
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
					>
						← Previous
					</button>
					<span className="text-sm text-gray-700 dark:text-gray-300">
						Page {table.getState().pagination.pageIndex + 1} of{" "}
						{table.getPageCount() || 1}
					</span>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
					>
						Next →
					</button>
				</div>
			</div>
		</div>
	);
};

export default TableAdminDatabaseMain;
