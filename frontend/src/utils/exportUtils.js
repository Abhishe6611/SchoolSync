import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const downloadWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * Export data to Excel
 * @param {Array} data - The array of objects to export
 * @param {Array} columns - Column configurations [{ key, label }]
 * @param {string} filename - Output filename without extension
 */
export const exportToExcel = async (data, columns, filename) => {
  const ExcelJS = (await import("exceljs")).default;
  const exportColumns = columns.filter((col) => col.key !== "actions");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");

  worksheet.columns = exportColumns.map((col) => ({
    header: col.label,
    key: col.key,
    width: Math.max(10, String(col.label).length + 2),
  }));

  data.forEach((row) => {
    const rowData = {};
    exportColumns.forEach((col) => {
      rowData[col.key] = row[col.key] ?? "";
    });
    worksheet.addRow(rowData);
  });

  await downloadWorkbook(workbook, filename);
};

/**
 * Export data to PDF
 * @param {Array} data - The array of objects to export
 * @param {Array} columns - Column configurations [{ key, label }]
 * @param {string} filename - Output filename without extension
 * @param {string} title - Title inside the PDF
 */
export const exportToPDF = (data, columns, filename, title = "Exported Data") => {
  const doc = new jsPDF();
  
  // Filter out action columns
  const exportColumns = columns.filter((col) => col.key !== "actions");
  
  const tableColumn = exportColumns.map((col) => col.label);
  const tableRows = data.map((row) => 
    exportColumns.map((col) => {
      // If render exists, we might get JSX back. We should try to extract text or fallback.
      if (col.key === "name") return `${row.first_name || ""} ${row.last_name || ""}`.trim();
      if (col.key === "class_id" && row.class_id) return String(row.class_id);
      if (col.key === "date_of_birth" && row.dob) return String(row.dob);
      
      let val = row[col.key];
      return val !== null && val !== undefined ? String(val) : "";
    })
  );

  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 25,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] }, // Primary color
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Generate a template Excel file for importing
 * @param {Array} fields - Array of strings representing column names
 * @param {string} filename - Output filename
 */
export const downloadTemplate = async (fields, filename) => {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Template");

  worksheet.columns = fields.map((field) => ({
    header: field,
    key: field,
    width: Math.max(10, String(field).length + 2),
  }));

  worksheet.addRow(
    fields.reduce((acc, field) => ({ ...acc, [field]: "" }), {})
  );

  await downloadWorkbook(workbook, `${filename}_template`);
};

