import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../api/axios.js";
import { numberToWords } from "./numberToWords.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

let _cachedSchool = null;
const fetchSchoolSettings = async (force = false) => {
  if (_cachedSchool && !force) return _cachedSchool;
  try {
    const res = await api.get("/admin/school-settings");
    _cachedSchool = res.data;
    return _cachedSchool;
  } catch {
    return null;
  }
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Generate a Payslip PDF matching the user's template
 */
export const generatePayslipPDF = async (payslip, staff) => {
  const schoolData = await fetchSchoolSettings();
  const schoolName = (schoolData?.school_name || "ABC PUBLIC SCHOOL").toUpperCase();
  const address = schoolData?.address || "123, Green Park, New Delhi - 110016";
  
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  let currentY = 15;

  // 1. CENTERED HEADER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Payslip", 105, currentY, { align: "center" });
  currentY += 8;

  doc.setFontSize(14);
  doc.text(schoolName, 105, currentY, { align: "center" });
  currentY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const addrLines = doc.splitTextToSize(address, 100);
  doc.text(addrLines, 105, currentY, { align: "center" });
  currentY += (addrLines.length * 5) + 10;

  // 2. EMPLOYEE INFO (2 Columns)
  doc.setFontSize(10);
  const leftCol = margin;
  const rightCol = 110;
  const colValX = 65;
  const colValX2 = 155;

  const rowH = 7;
  
  // Left Column
  doc.text("Date of Joining", leftCol, currentY);
  doc.text(`:  ${staff.hire_date || "2024-01-01"}`, colValX, currentY);
  
  // Right Column
  doc.text("Employee name", rightCol, currentY);
  doc.text(`:  ${staff.first_name} ${staff.last_name}`, colValX2, currentY);
  currentY += rowH;

  doc.text("Pay Period", leftCol, currentY);
  doc.text(`:  ${MONTHS[payslip.month - 1]} ${payslip.year}`, colValX, currentY);

  doc.text("Designation", rightCol, currentY);
  doc.text(`:  ${staff.role || "Teacher"}`, colValX2, currentY);
  currentY += rowH;

  doc.text("Worked Days", leftCol, currentY);
  doc.text(`:  ${payslip.days_present}`, colValX, currentY);

  doc.text("Department", rightCol, currentY);
  doc.text(`:  Teaching`, colValX2, currentY);
  currentY += 15;

  // 3. EARNINGS & DEDUCTIONS TABLE
  const totalEarnings = payslip.base_salary + payslip.total_allowances;
  const totalDeductions = payslip.other_deductions + payslip.leave_deduction;

  autoTable(doc, {
    startY: currentY,
    head: [["Earnings", "Amount", "Deductions", "Amount"]],
    body: [
      ["Basic", payslip.base_salary.toFixed(0), "Provident Fund", (payslip.other_deductions * 0.6).toFixed(0)],
      ["Incentive Pay", (payslip.total_allowances * 0.3).toFixed(0), "Profesional Tax", (payslip.other_deductions * 0.4).toFixed(0)],
      ["House Rent Allowance", (payslip.total_allowances * 0.4).toFixed(0), "Loan", "0"],
      ["Meal Allowance", (payslip.total_allowances * 0.3).toFixed(0), "", ""],
      [{ content: "", colSpan: 4, styles: { minCellHeight: 5 } }],
      [{ content: "Total Earnings", styles: { halign: "right", fontStyle: "bold" } }, totalEarnings.toFixed(0), { content: "Total Deductions", styles: { halign: "right", fontStyle: "bold" } }, totalDeductions.toFixed(0)],
      [{ content: "Net Pay", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } }, payslip.net_payable.toFixed(0)],
    ],
    theme: "grid",
    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: "bold", halign: "center", lineWidth: 0.1, lineColor: 0 },
    styles: { fontSize: 9, cellPadding: 3, textColor: 0, lineWidth: 0.1, lineColor: 0 },
    columnStyles: {
      1: { halign: "right" },
      3: { halign: "right" }
    },
    margin: { left: margin, right: margin }
  });

  currentY = doc.lastAutoTable.finalY + 15;

  // 4. NET PAY IN WORDS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(String(payslip.net_payable.toFixed(0)), 105, currentY, { align: "center" });
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(numberToWords(Math.round(payslip.net_payable)), 105, currentY, { align: "center" });
  currentY += 25;

  // 5. DISCLAIMER
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("This is a computer-generated payslip and needs no seal or signature.", 105, currentY, { align: "center" });

  doc.save(`Payslip_${staff.first_name}_${MONTHS[payslip.month - 1]}_${payslip.year}.pdf`);
};
