"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAppSelector } from "@/store/hooks";

export default function ManageAutomation() {
  const { token } = useAppSelector((state) => state.user);
  const [filesArray, setFilesArray] = useState<string[]>([]);
  const [webBrowserExtensionsArray, setWebBrowserExtensionsArray] = useState<
    string[]
  >([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAutomationFilesList = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/automations/excel-files`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }

      const result = await response.json();
      console.log("Fetched Data:", result);

      if (
        result.excelFileNamesArray &&
        Array.isArray(result.excelFileNamesArray)
      ) {
        setFilesArray(result.excelFileNamesArray);
      } else {
        setFilesArray([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setFilesArray([]);
    }
  }, [token]);

  const fetchWebBrowserExtensionsList = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/automations/web-browser-extensions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }

      const result = await response.json();
      console.log("Fetched Data:", result);

      if (
        result.webBrowserExtensionsArray &&
        Array.isArray(result.webBrowserExtensionsArray)
      ) {
        setWebBrowserExtensionsArray(result.webBrowserExtensionsArray);
      } else {
        setWebBrowserExtensionsArray([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setWebBrowserExtensionsArray([]);
    }
  }, [token]);

  useEffect(() => {
    fetchAutomationFilesList();
    fetchWebBrowserExtensionsList();
  }, [fetchAutomationFilesList, fetchWebBrowserExtensionsList]);

  const downloadExcelFile = async (fileName: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/automations/excel-file/${fileName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log(`Response status: ${response.status}`);

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
      alert("Error downloading file. Please try again.");
    }
  };

  const downloadWebBrowserExtension = async (extension: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/automations/web-browser-extension/${extension}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = extension;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Error downloading extension. Please try again.");
    }
  };

  const sendExcelFile = async (file: File) => {
    if (!file) return;

    if (!filesArray.includes(file.name)) {
      alert(
        "Filename not recognized. Please select a file with a name from the list.",
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const fileName = encodeURIComponent(file.name);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/automations/excel-file/${fileName}`,
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
      alert("File uploaded successfully!");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file. Please try again.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      sendExcelFile(selectedFile);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <h1 className="text-title-xl text-gray-700 dark:text-gray-300">
        Manage Automation
      </h1>

      {/* Excel Spreadsheets Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-title-lg font-semibold text-gray-800 dark:text-white/90">
          Excel Spreadsheets
        </h2>

        {/* Files List */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          {filesArray.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {filesArray.map((file, index) => (
                <li
                  key={index}
                  className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <button
                    onClick={() => downloadExcelFile(file)}
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                  >
                    {file}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No Excel files available
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="excelFileUpload"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Upload Excel file:
            </label>
            <input
              id="excelFileUpload"
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/20 dark:file:text-brand-400 dark:hover:file:bg-brand-900/30"
            />
          </div>
          <button
            onClick={handleUploadClick}
            disabled={!selectedFile}
            className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-600 dark:hover:bg-brand-700"
          >
            Upload
          </button>
        </div>

        {/* Guide */}
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
              Guide to modifying the excel files
            </h3>
            <ul className="ml-6 list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>andString column:</strong> will return all articles that
                have all the words in the string
              </li>
              <li>
                <strong>orString column:</strong> will return all articles that
                have any of the words in the string
              </li>
              <li>
                <strong>notString column:</strong> will return all articles that
                do not have any of the words in the string
              </li>
              <li>No commas in these strings; spaces separate the words</li>
              <li>
                Quote the strings for words with spaces or any special
                characters !, ?, $, etc.
              </li>
              <li>
                For News API <strong>includeDomains</strong> and{" "}
                <strong>excludeDomains</strong> columns use commas, there is no
                https:// or www.
              </li>
              <li>
                If domains do not match with what is found in database they will
                be omitted
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
              Guide to modifying NewsNexusRequestGoogleRss04 spreadsheet
            </h3>
            <ul className="ml-6 list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <strong>id:</strong> integer identifier for the row (optional,
                used for logging, still runs fine without it)
              </li>
              <li>
                <strong>and_keywords:</strong> comma-separated keywords for AND
                searches
              </li>
              <li>
                <strong>and_exact_phrases:</strong> comma-separated quoted exact
                phrases (spaces optional, double or single quotes accepted) for
                AND searches
              </li>
              <li>
                <strong>or_keywords:</strong> comma-separated keywords for OR
                searches
              </li>
              <li>
                <strong>or_exact_phrases:</strong> comma-separated quoted exact
                phrases (spaces optional, double or single quotes accepted) for
                OR searches
              </li>
              <li>
                <strong>time_range:</strong> string such as 1d. The current
                state only seems to use days. So 1d, 2d, 3d, etc. Or it could be
                left blank. If left blank or invalid, it will default to 180d.
              </li>
            </ul>

            {/* Collapsible Examples Section */}
            <details className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                Examples of exact phrases
              </summary>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  For <strong>and_exact_phrases</strong> and{" "}
                  <strong>or_exact_phrases</strong> columns, quotes are optional
                  but recommended for clarity. The system automatically adds
                  double quotes to multi-word phrases if not provided.
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Example 1:
                    </p>
                    <p className="mb-1">Input in spreadsheet:</p>
                    <code className="block px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                      climate change, global warming
                    </code>
                    <p className="mt-1">Result in query:</p>
                    <code className="block px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                      &quot;climate change&quot; &quot;global warming&quot;
                    </code>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Example 2:
                    </p>
                    <p className="mb-1">Input in spreadsheet:</p>
                    <code className="block px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                      &quot;climate change&quot;, &quot;global warming&quot;
                    </code>
                    <p className="mt-1">Result in query:</p>
                    <code className="block px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                      &quot;climate change&quot; &quot;global warming&quot;
                    </code>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Example 3:
                    </p>
                    <p className="mb-1">Input in spreadsheet:</p>
                    <code className="block px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                      &apos;climate change&apos;, &apos;global warming&apos;
                    </code>
                    <p className="mt-1">Result in query:</p>
                    <code className="block px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                      &apos;climate change&apos; &apos;global warming&apos;
                    </code>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Web Browser Extensions Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-title-lg font-semibold text-gray-800 dark:text-white/90">
          Web Browser Extensions
        </h2>

        {/* Extensions List */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          {webBrowserExtensionsArray.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {webBrowserExtensionsArray.map((extension, index) => (
                <li
                  key={index}
                  className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <button
                    onClick={() => downloadWebBrowserExtension(extension)}
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                  >
                    {extension}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No browser extensions available
            </div>
          )}
        </div>

        {/* Installation Guides */}
        <div className="space-y-6">
          {/* Firefox Guide */}
          <div>
            <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
              Guide installing Firefox
            </h3>
            <ol className="ml-6 list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>Download the file</li>
              <li>Unzip the file and save somewhere it can stay</li>
              <li>
                In Firefox put{" "}
                <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs">
                  about:debugging#/runtime/this-firefox
                </code>{" "}
                in the address bar
              </li>
              <li>
                Click on the load temporary button - this will let you add the
                extension
              </li>
              <li>
                Find the unzipped folder and select the manifest.json file
              </li>
              <li>The extension should now be installed</li>
            </ol>
          </div>

          {/* Chrome Guide */}
          <div>
            <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
              Guide installing Chrome
            </h3>
            <ol className="ml-6 list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>Download the file</li>
              <li>Unzip the file and save somewhere it can stay</li>
              <li>
                In Chrome put{" "}
                <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs">
                  chrome://extensions/
                </code>{" "}
                in the address bar
              </li>
              <li>
                Click on the <strong>load unpacked</strong> button (maybe: top
                left of screen) - this will let you add the extension
              </li>
              <li>Find the unzipped folder and select the folder</li>
              <li>The extension should now be installed</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
