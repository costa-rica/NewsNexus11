"use client";

import React from "react";
import { InfoIcon } from "@/icons";

type ArticleTargetingFieldsProps = {
  reviewCountId: string;
  reviewCountValue: string;
  thresholdDaysId: string;
  thresholdDaysValue: string;
  onReviewCountChange: (value: string) => void;
  onThresholdDaysChange: (value: string) => void;
};

type InputLabelWithTooltipProps = {
  htmlFor: string;
  label: string;
  tooltip: string;
};

function InputLabelWithTooltip({
  htmlFor,
  label,
  tooltip,
}: InputLabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <div className="group relative inline-flex overflow-visible">
        <span className="inline-flex h-6 w-6 items-center justify-center overflow-visible rounded-full text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
          <InfoIcon className="h-5 w-5 overflow-visible" />
        </span>
        <span className="pointer-events-none invisible absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal text-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 dark:bg-gray-700">
          {tooltip}
        </span>
      </div>
    </div>
  );
}

export function ArticleTargetingFields({
  reviewCountId,
  reviewCountValue,
  thresholdDaysId,
  thresholdDaysValue,
  onReviewCountChange,
  onThresholdDaysChange,
}: ArticleTargetingFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <InputLabelWithTooltip
          htmlFor={thresholdDaysId}
          label="Article Threshold Days Old"
          tooltip="This value directs analysis of articles only this many days old."
        />
        <input
          id={thresholdDaysId}
          type="number"
          min="1"
          step="1"
          value={thresholdDaysValue}
          onChange={(e) => onThresholdDaysChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="flex flex-col gap-2">
        <InputLabelWithTooltip
          htmlFor={reviewCountId}
          label="Article State Review Count"
          tooltip="This value directs the number of articles to analyze."
        />
        <input
          id={reviewCountId}
          type="number"
          min="1"
          step="1"
          value={reviewCountValue}
          onChange={(e) => onReviewCountChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
    </div>
  );
}
