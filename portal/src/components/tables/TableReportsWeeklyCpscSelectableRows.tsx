"use client";
import React, { useState, useMemo } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	flexRender,
	createColumnHelper,
	SortingState,
} from "@tanstack/react-table";
import { LoadingDots } from "../common/LoadingDots";

export interface Report {
	id: number;
	dateSubmittedToClient: string | null;
	ArticleReportContracts: Array<{
		articleId: number;
		articleReferenceNumberInReport: string;
	}>;
	selected: boolean;
}

interface ReportGroup {
	crName: string;
	reportsArray: Report[];
}

// Create columnHelper outside component for stable reference
const columnHelper = createColumnHelper<Report>();

interface TableReportsWeeklyCpscSelectableRowsProps {
	data: ReportGroup[];
	loading?: boolean;
	onRowSelect: (reportId: number) => void;
}

const TableReportsWeeklyCpscSelectableRows: React.FC<
	TableReportsWeeklyCpscSelectableRowsProps
> = ({ data, loading = false, onRowSelect }) => {
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState<SortingState>([]);

	// Flatten the data structure for the table
	const flattenedData = useMemo(() => {
		const flattened: Report[] = [];
		data.forEach((group) => {
			group.reportsArray.forEach((report) => {
				flattened.push(report);
			});
		});
		return flattened;
	}, [data]);

	const columns = useMemo(
		() => [
			columnHelper.accessor("id", {
				header: "Report ID",
				enableSorting: true,
				cell: ({ getValue }) => (
					<div className="text-sm text-gray-800 dark:text-gray-200 font-medium">
						{getValue()}
					</div>
				),
			}),
			columnHelper.accessor("dateSubmittedToClient", {
				header: () => (
					<div className="text-center">
						<div>Date Submitted to Client</div>
						<div className="text-xs font-normal">(ET)</div>
					</div>
				),
				enableSorting: true,
				cell: ({ getValue }) => {
					const date = getValue();
					return (
						<div className="text-sm text-center text-gray-800 dark:text-gray-200">
							{date ? date.split("T")[0] : "missing value"}
						</div>
					);
				},
			}),
			columnHelper.accessor(
				(row) => row.ArticleReportContracts?.length || 0,
				{
					id: "articleCount",
					header: "Article Count",
					enableSorting: true,
					cell: ({ getValue }) => {
						return (
							<div className="text-sm text-center text-gray-800 dark:text-gray-200">
								{getValue()}
							</div>
						);
					},
				}
			),
		],
		[]
	);

	const table = useReactTable({
		data: flattenedData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			globalFilter,
			sorting,
		},
		onGlobalFilterChange: setGlobalFilter,
		onSortingChange: setSorting,
	});

	if (loading) {
		return (
			<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
				<LoadingDots className="py-20" />
			</div>
		);
	}

	return (
		<div className="flex flex-col max-h-[20rem] rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
			{/* Search Bar */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
				<input
					type="text"
					value={globalFilter ?? ""}
					onChange={(e) => setGlobalFilter(e.target.value)}
					className="w-full h-9 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
					placeholder="Search..."
				/>
			</div>

			{/* Table with scrollable body */}
			<div className="overflow-auto flex-1 min-h-0">
				<table className="w-full">
					<thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-gray-300 cursor-pointer select-none bg-gray-50 dark:bg-gray-800/50"
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
							<tr
								key={row.id}
								onClick={() => onRowSelect(row.original.id)}
								className={`cursor-pointer transition-colors ${
									row.original.selected
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
						))}
					</tbody>
				</table>

				{/* No results message */}
				{table.getRowModel().rows.length === 0 && (
					<div className="text-center py-8 text-gray-500 dark:text-gray-400">
						No reports found
					</div>
				)}
			</div>
		</div>
	);
};

export default TableReportsWeeklyCpscSelectableRows;
