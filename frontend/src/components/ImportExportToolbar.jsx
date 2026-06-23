import { useRef, useState } from "react";
import api from "../api/axios";
import { downloadTemplate, exportToExcel, exportToPDF } from "../utils/exportUtils";

export default function ImportExportToolbar({
  data,
  columns,
  filename,
  templateFields,
  importEndpoint,
  onImportSuccess,
  showImport = true,
}) {
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportExcel = async () => {
    // Generate raw data columns for Excel so Export matches Import perfectly
    const exportKeys = ["id", ...(templateFields || [])];
    const excelColumns = exportKeys.map(key => ({ key, label: key }));
    await exportToExcel(data, excelColumns, filename);
  };

  const handleExportPDF = () => {
    exportToPDF(data, columns, filename, `${filename} Report`);
  };

  const handleDownloadTemplate = async () => {
    await downloadTemplate(templateFields, filename);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsImporting(true);
      const res = await api.post(importEndpoint, formData);
      if (res.data.errors && res.data.errors.length > 0) {
        alert(`Successfully imported ${res.data.count} records.\n\nErrors encountered:\n${res.data.errors.slice(0, 10).join('\\n')}${res.data.errors.length > 10 ? '\\n...and more' : ''}`);
      } else {
        alert(`Successfully imported ${res.data.count} records!`);
      }
      if (onImportSuccess) onImportSuccess();
    } catch (error) {
      console.error("Import failed:", error);
      alert(
        `Import failed: ${
          error.response?.data?.detail || error.message || "Unknown error"
        }`
      );
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Export buttons — HRISELINK outlined style */}
      <button
        type="button"
        onClick={handleExportExcel}
        className="btn-secondary text-xs py-1.5 px-3"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Excel
      </button>

      <button
        type="button"
        onClick={handleExportPDF}
        className="btn-secondary text-xs py-1.5 px-3"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        PDF
      </button>

      {/* Import Options */}
      {showImport && (
        <>
          <div className="w-px h-5 bg-[#e9ecef] mx-1" />

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="btn-secondary text-xs py-1.5 px-3"
            title="Download CSV/Excel Template"
          >
            Template
          </button>

          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isImporting}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="btn-primary text-xs py-1.5 px-3"
          >
            {isImporting ? (
              <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            {isImporting ? "Importing..." : "Import"}
          </button>
        </>
      )}
    </div>
  );
}
