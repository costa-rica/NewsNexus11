"use client";
import React, { useState, useRef, useEffect } from "react";
import Checkbox from "@/components/form/input/Checkbox";
import { Table } from "@tanstack/react-table";

interface ColumnVisibilityDropdownProps<TData> {
	table: Table<TData>;
}

const ColumnVisibilityDropdown = <TData,>({
	table,
}: ColumnVisibilityDropdownProps<TData>) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const allColumns = table.getAllLeafColumns();

	// Get count of visible/hidden columns
	const visibleCount = allColumns.filter((col) => col.getIsVisible()).length;
	const totalCount = allColumns.length;

	return (
		<div className="relative" ref={dropdownRef}>
			{/* Toggle Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
			>
				<svg
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
					/>
				</svg>
				Columns
				<span className="text-xs text-gray-500 dark:text-gray-400">
					({visibleCount}/{totalCount})
				</span>
				<svg
					className={`w-4 h-4 transition-transform ${
						isOpen ? "rotate-180" : ""
					}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			{/* Dropdown Menu */}
			{isOpen && (
				<div className="absolute left-0 z-50 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700">
					{/* Header */}
					<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Show/Hide Columns
							</span>
							<button
								onClick={() => setIsOpen(false)}
								className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					</div>

					{/* Column List */}
					<div className="max-h-96 overflow-y-auto py-2">
						{allColumns.map((column) => {
							// Skip columns without a header (like selection columns)
							if (!column.columnDef.header) return null;

							return (
								<div
									key={column.id}
									className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
								>
									<Checkbox
										label={
											typeof column.columnDef.header === "string"
												? column.columnDef.header
												: column.id
										}
										checked={column.getIsVisible()}
										onChange={(checked) => column.toggleVisibility(checked)}
									/>
								</div>
							);
						})}
					</div>

					{/* Footer Actions */}
					<div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
						<button
							onClick={() => table.toggleAllColumnsVisible(true)}
							className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
						>
							Show All
						</button>
						<button
							onClick={() => table.toggleAllColumnsVisible(false)}
							className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
						>
							Hide All
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default ColumnVisibilityDropdown;
