"use client";
import React, { useState, useMemo } from "react";

export interface RowCount {
	tableName: string;
	rowCount: number;
}

interface TableRowCountsProps {
	data: RowCount[];
}

type SortField = "tableName" | "rowCount";
type SortDirection = "asc" | "desc";

const TableRowCounts: React.FC<TableRowCountsProps> = ({ data }) => {
	const [sortField, setSortField] = useState<SortField>("tableName");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

	const sortedData = useMemo(() => {
		const sorted = [...data].sort((a, b) => {
			if (sortField === "tableName") {
				return sortDirection === "asc"
					? a.tableName.localeCompare(b.tableName)
					: b.tableName.localeCompare(a.tableName);
			} else {
				return sortDirection === "asc"
					? a.rowCount - b.rowCount
					: b.rowCount - a.rowCount;
			}
		});
		return sorted;
	}, [data, sortField, sortDirection]);

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			// Toggle direction if clicking same field
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			// Set new field and default to ascending
			setSortField(field);
			setSortDirection("asc");
		}
	};

	const getSortIcon = (field: SortField) => {
		if (sortField !== field) return "";
		return sortDirection === "asc" ? " ▲" : " ▼";
	};

	return (
		<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead className="bg-gray-50 dark:bg-gray-800/50">
						<tr>
							<th
								onClick={() => handleSort("tableName")}
								className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
							>
								<div className="flex items-center gap-1">
									Table Name
									{getSortIcon("tableName")}
								</div>
							</th>
							<th
								onClick={() => handleSort("rowCount")}
								className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
							>
								<div className="flex items-center justify-end gap-1">
									Row Count
									{getSortIcon("rowCount")}
								</div>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
						{sortedData.length > 0 ? (
							sortedData.map((item) => (
								<tr
									key={item.tableName}
									className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
								>
									<td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
										{item.tableName}
									</td>
									<td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 text-right">
										{item.rowCount.toLocaleString()}
									</td>
								</tr>
							))
						) : (
							<tr>
								<td
									colSpan={2}
									className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center"
								>
									No data available
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default TableRowCounts;
