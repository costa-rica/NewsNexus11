"use client";

import React, { useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { Modal } from "@/components/ui/modal";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";

type FixedAutomationSpreadsheetControlsProps = {
  fileName: string;
};

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

export function FixedAutomationSpreadsheetControls({
  fileName,
}: FixedAutomationSpreadsheetControlsProps) {
  const { token } = useAppSelector((state) => state.user);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [alertModal, setAlertModal] = useState<AlertModalState>(
    DEFAULT_ALERT_MODAL_STATE,
  );

  const downloadExcelFile = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/automations/excel-file/${fileName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      setAlertModal({
        message: "Error downloading file. Please try again.",
        show: true,
        title: "Download Failed",
        variant: "error",
      });
    }
  };

  const sendExcelFile = async (file: File) => {
    if (file.name !== fileName) {
      setAlertModal({
        message: `Filename must be exactly ${fileName}`,
        show: true,
        title: "Invalid Filename",
        variant: "warning",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const encodedFileName = encodeURIComponent(file.name);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/automations/excel-file/${encodedFileName}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }

      await response.json();
      setAlertModal({
        message: "File uploaded successfully!",
        show: true,
        title: "Upload Complete",
        variant: "success",
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setAlertModal({
        message: "Error uploading file. Please try again.",
        show: true,
        title: "Upload Failed",
        variant: "error",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This workflow uses the spreadsheet <code>{fileName}</code>.
        </p>

        <button
          type="button"
          onClick={downloadExcelFile}
          className="text-sm text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Download {fileName}
        </button>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={`${fileName}-upload`}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Upload Excel file:
          </label>
          <input
            id={`${fileName}-upload`}
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400 dark:hover:file:bg-brand-900/30 dark:text-gray-300"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            if (selectedFile) {
              void sendExcelFile(selectedFile);
            }
          }}
          disabled={!selectedFile}
          className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
        >
          Upload
        </button>
      </div>

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
