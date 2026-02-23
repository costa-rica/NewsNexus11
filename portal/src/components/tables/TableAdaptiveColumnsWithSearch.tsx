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
import { StateCountData } from "@/types/article";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";
import { LoadingDots } from "@/components/common/LoadingDots";

// Create columnHelper outside component for stable reference
const columnHelper = createColumnHelper<StateCountData>();

interface TableAdaptiveColumnsWithSearchProps {
	data: StateCountData[];
	loading?: boolean;
	displayAll?: boolean; // If true, shows all rows without pagination
}

const TableAdaptiveColumnsWithSearch: React.FC<
	TableAdaptiveColumnsWithSearchProps
> = ({ data, loading = false, displayAll = false }) => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [columnVisibility, setColumnVisibility] = useState({});

	// Dynamically generate columns from the first data object
	const columns = useMemo(() => {
		if (!data || data.length === 0) return [];

		return Object.keys(data[0]).map((key) =>
			columnHelper.accessor(key as keyof StateCountData, {
				header: key,
				enableSorting: true,
				cell: ({ row }) => (
					<div
						className={`text-sm text-gray-700 dark:text-gray-300 ${
							key !== "State" ? "text-center" : ""
						}`}
					>
						{row.original[key]}
					</div>
				),
			})
		);
	}, [data]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: displayAll ? undefined : getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			pagination: displayAll ? undefined : pagination,
			sorting,
			globalFilter,
			columnVisibility,
		},
		onSortingChange: setSorting,
		onPaginationChange: displayAll ? undefined : setPagination,
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
		<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
			{/* Controls */}
			<div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
				<div className="flex items-center gap-4">
					{!displayAll && (
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
					)}
					<ColumnVisibilityDropdown table={table} />
				</div>
				<div className="flex items-center gap-2">
					<input
						type="text"
						value={globalFilter ?? ""}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
						placeholder="Search..."
					/>
					{!displayAll && (
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
					)}
				</div>
			</div>

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
						{table.getRowModel().rows.map((row) => (
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
					No data available
				</div>
			)}
		</div>
	);
};

export default TableAdaptiveColumnsWithSearch;
