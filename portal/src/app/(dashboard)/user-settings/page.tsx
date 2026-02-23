"use client";
import React from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
	updateRequestTableBodyParams,
} from "@/store/features/user/userSlice";

export default function UserSettings() {
	const dispatch = useAppDispatch();
	const { requestTableBodyParams } = useAppSelector(
		(state) => state.user
	);

	return (
		<div className="flex flex-col gap-4 md:gap-6">
			<h1 className="text-title-xl text-gray-700 dark:text-gray-300">
				User Settings
			</h1>

			{/* Request Table Settings */}
			<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
				<h2 className="text-title-md font-semibold text-gray-800 dark:text-white/90 mb-6">
					Request Table Settings
				</h2>

				<div className="space-y-6">
					{/* Date Limit Setting */}
					<div className="flex flex-col gap-2">
						<label
							htmlFor="requestDateLimit"
							className="text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Request Table Date Limit:
						</label>
						<input
							id="requestDateLimit"
							type="date"
							value={requestTableBodyParams?.dateLimitOnRequestMade || ""}
							onChange={(e) =>
								dispatch(
									updateRequestTableBodyParams({
										dateLimitOnRequestMade: e.target.value,
									})
								)
							}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white max-w-xs"
						/>
					</div>

					{/* Include Automated Setting */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-3">
							<label
								htmlFor="includeAutomation"
								className="text-sm font-medium text-gray-700 dark:text-gray-300"
							>
								Include Automated:
							</label>

							{/* Toggle Switch */}
							<label className="relative inline-flex items-center cursor-pointer">
								<input
									id="includeAutomation"
									type="checkbox"
									checked={
										requestTableBodyParams?.includeIsFromAutomation || false
									}
									onChange={(e) =>
										dispatch(
											updateRequestTableBodyParams({
												includeIsFromAutomation: e.target.checked,
											})
										)
									}
									className="sr-only peer"
								/>
								<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div>
							</label>
						</div>

						{/* Warning Message */}
						{requestTableBodyParams?.includeIsFromAutomation && (
							<div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
								<span>⚠️</span>
								<span>This could slow down the website</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
