"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { CollapsibleAutomationSection } from "@/components/automations/CollapsibleAutomationSection";
import { FixedAutomationSpreadsheetControls } from "@/components/automations/FixedAutomationSpreadsheetControls";
import { WorkerNodeJobStatusPanel } from "@/components/automations/WorkerNodeJobStatusPanel";
import { Modal } from "@/components/ui/modal";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";

type AlertModalState = {
  message: string;
  show: boolean;
  title: string;
  variant: "error" | "info" | "success" | "warning";
};

const DEFAULT_ALERT_MODAL_STATE: AlertModalState = {
  message: "",
  show: false,
  title: "",
  variant: "info",
};

const GOOGLE_RSS_FILE_NAME = "AutomatedRequestsGoogleNewsRss04.xlsx";
const GOOGLE_RSS_ENDPOINT_NAME = "/request-google-rss/start-job";
const DEFAULT_DO_NOT_REPEAT_REQUESTS_WITHIN_HOURS = "72";

function buildWorkerNodeResponseMessage(result: {
  endpointName?: string;
  jobId?: string;
  status?: string;
}): string {
  return [
    result.jobId ? `Job ID: ${result.jobId}` : null,
    result.status ? `Status: ${result.status}` : null,
    result.endpointName ? `Endpoint: ${result.endpointName}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function getErrorMessage(errorBody: string): string {
  try {
    const parsed = JSON.parse(errorBody) as {
      error?: { message?: string; details?: Array<{ field: string; message: string }> };
      message?: string;
    };

    if (parsed.error?.details && parsed.error.details.length > 0) {
      return parsed.error.details
        .map((detail) => `${detail.field}: ${detail.message}`)
        .join("\n");
    }

    if (parsed.error?.message) {
      return parsed.error.message;
    }

    if (parsed.message) {
      return parsed.message;
    }
  } catch (_error) {
    return errorBody;
  }

  return errorBody;
}

export function GoogleRssSection() {
  const { token } = useAppSelector((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [doNotRepeatRequestsWithinHours, setDoNotRepeatRequestsWithinHours] =
    useState(DEFAULT_DO_NOT_REPEAT_REQUESTS_WITHIN_HOURS);
  const [alertModal, setAlertModal] = useState<AlertModalState>(
    DEFAULT_ALERT_MODAL_STATE,
  );

  const handleStartGoogleRss = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/automations/request-google-rss/start-job`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            doNotRepeatRequestsWithinHours: Number(doNotRepeatRequestsWithinHours),
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(getErrorMessage(errorText));
      }

      const result = (await response.json()) as {
        endpointName?: string;
        jobId?: string;
        status?: string;
      };

      setAlertModal({
        message:
          buildWorkerNodeResponseMessage(result) ||
          "Google RSS job was queued successfully.",
        show: true,
        title: "Google RSS Job Queued",
        variant: "success",
      });
      setRefreshSignal((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error starting job.";

      setAlertModal({
        message,
        show: true,
        title: "Google RSS Request Failed",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CollapsibleAutomationSection title="Google RSS" defaultOpen={false}>
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => void handleStartGoogleRss()}
            disabled={isSubmitting}
            className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
          >
            {isSubmitting
              ? "Starting Google RSS Job..."
              : "Start Requesting Google RSS Queries"}
          </button>

          <WorkerNodeJobStatusPanel
            endpointName={GOOGLE_RSS_ENDPOINT_NAME}
            refreshSignal={refreshSignal}
            title="Last Google RSS Job"
          />

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <label
              htmlFor="doNotRepeatRequestsWithinHours"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Do not repeat requests that occurred in the last ___ hours
            </label>
            <input
              id="doNotRepeatRequestsWithinHours"
              type="number"
              min="0"
              step="1"
              value={doNotRepeatRequestsWithinHours}
              onChange={(e) => setDoNotRepeatRequestsWithinHours(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Default is 72 hours. Matching Google RSS requests newer than this
              window will be skipped. Set this to 0 to allow all requests to run.
            </p>
          </div>

          <FixedAutomationSpreadsheetControls fileName={GOOGLE_RSS_FILE_NAME} />
        </div>
      </CollapsibleAutomationSection>

      <Modal
        isOpen={alertModal.show}
        onClose={() => setAlertModal(DEFAULT_ALERT_MODAL_STATE)}
      >
        <ModalInformationOk
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
          onClose={() => setAlertModal(DEFAULT_ALERT_MODAL_STATE)}
        />
      </Modal>
    </>
  );
}
