import React from "react";
import { createRoot } from "react-dom/client";
import { formatDate } from "../utils/dateFormatter.js";
import api from "../api/axios.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

let _cachedSchool = null;
const fetchSchoolSettings = async () => {
  if (_cachedSchool) return _cachedSchool;
  try {
    const res = await api.get("/admin/school-settings");
    _cachedSchool = res.data;
    return _cachedSchool;
  } catch {
    return null;
  }
};

// Invalidate cache so next print picks up fresh settings
export const clearSchoolCache = () => { _cachedSchool = null; };

// Global print function
export const printReceipt = async (payment, student) => {
  const schoolData = await fetchSchoolSettings();

  const printDiv = document.createElement("div");
  printDiv.id = "print-receipt-container";
  document.body.appendChild(printDiv);

  const root = createRoot(printDiv);
  root.render(<ReceiptTemplate payment={payment} student={student} schoolData={schoolData} />);

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      root.unmount();
      printDiv.remove();
    }, 500);
  }, 100);
};

// Expose to window for the inline onClick in Fees.jsx
window.printReceipt = printReceipt;

function ReceiptTemplate({ payment, student, schoolData }) {
  const school = {
    name: schoolData?.school_name || "SchoolSync Academy",
    address: schoolData?.address || "123 Education Boulevard, New Delhi – 110001",
    phone: schoolData?.phone || "+91-11-2345-6789",
    regNo: schoolData?.registration_no || "CBSE/AFF/2410123",
    logoUrl: schoolData?.logo_url ? `${API_BASE}${schoolData.logo_url}` : null,
  };

  // Watermark using DOM elements to guarantee printing
  const WatermarkOverlay = () => {
    const rows = Array.from({ length: 60 });
    const cols = Array.from({ length: 10 });
    
    return (
      <div style={{
        position: "absolute",
        top: "-50%",
        left: "-50%",
        width: "200%",
        height: "200%",
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.06,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        transform: "rotate(-35deg)",
        overflow: "hidden"
      }}>
        {rows.map((_, i) => (
          <div key={i} style={{
            display: "flex",
            whiteSpace: "nowrap",
            fontSize: "14px",
            fontWeight: "bold",
            color: "#000",
            marginBottom: "12px",
            marginLeft: i % 2 === 0 ? "0" : "-50px"
          }}>
            {cols.map((_, j) => (
              <span key={j} style={{ marginRight: "30px" }}>{school.name}</span>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const receiptDate = formatDate(payment.payment_date);

  return (
    <div className="print-only-receipt">
      <style>
        {`
          @media screen {
            .print-only-receipt { display: none; }
          }
          @media print {
            @page { margin: 15mm; size: A4 portrait; }
            body * { visibility: hidden; }
            #print-receipt-container, #print-receipt-container * { visibility: visible; }
            #print-receipt-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              color: black;
              font-family: 'Inter', sans-serif;
            }
            .print-only-receipt { 
              display: block; 
              width: 100%; 
              max-width: 800px; 
              margin: 0 auto; 
              position: relative;
              overflow: hidden;
              min-height: 500px;
            }
            .receipt-content {
              position: relative;
              z-index: 10;
            }
          }
        `}
      </style>

      <WatermarkOverlay />

      <div className="receipt-content">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #333", paddingBottom: "16px", marginBottom: "20px" }}>
        {/* Logo */}
        <div style={{ width: "64px", height: "64px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", marginRight: "20px", overflow: "hidden" }}>
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 7L6 12.5L16 18L26 12.5L16 7Z" fill="#64748b"/>
              <path d="M10 15v5c0 0 2.5 3 6 3s6-3 6-3v-5l-6 3.5L10 15Z" fill="#94a3b8"/>
            </svg>
          )}
        </div>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 4px 0", color: "#0f172a" }}>{school.name}</h1>
          <p style={{ margin: "0 0 2px 0", fontSize: "14px", color: "#475569" }}>{school.address}</p>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "500" }}>Reg: {school.regNo} | {school.phone}</p>
        </div>
      </div>

      {/* Receipt Info */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, letterSpacing: "1px" }}>PAYMENT RECEIPT</h2>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}><strong>Receipt No:</strong> {payment.receipt_number}</p>
          <p style={{ margin: 0, fontSize: "14px" }}><strong>Date:</strong> {receiptDate}</p>
        </div>
      </div>

      {/* Student Info */}
      <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px", borderRadius: "8px", marginBottom: "24px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}><strong>Student Name:</strong> {student.student_name}</p>
          <p style={{ margin: 0, fontSize: "14px" }}><strong>Student ID:</strong> {student.student_id}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}><strong>Class:</strong> {student.class_name}</p>
          <p style={{ margin: 0, fontSize: "14px" }}><strong>Status:</strong> <span style={{ textTransform: "capitalize" }}>{student.status}</span></p>
        </div>
      </div>

      {/* Payment Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
            <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", color: "#334155" }}>Fee Type</th>
            <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", color: "#334155" }}>Payment Mode</th>
            <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", color: "#334155" }}>Transaction No.</th>
            <th style={{ padding: "12px", textAlign: "right", fontSize: "14px", color: "#334155" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
            <td style={{ padding: "12px", fontSize: "14px" }}>{payment.fee_type}</td>
            <td style={{ padding: "12px", fontSize: "14px" }}>{payment.mode}</td>
            <td style={{ padding: "12px", fontSize: "14px" }}>{payment.transaction_no || "N/A"}</td>
            <td style={{ padding: "12px", textAlign: "right", fontSize: "14px", fontWeight: "600" }}>
              ₹{payment.amount.toLocaleString("en-IN")}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "48px" }}>
        <div style={{ width: "300px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #e2e8f0", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>Total Amount Paid:</span>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>₹{payment.amount.toLocaleString("en-IN")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", color: "#64748b" }}>Outstanding Balance:</span>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: student.balance > 0 ? "#b91c1c" : "#15803d" }}>
              ₹{student.balance.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "64px" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
          This is a computer-generated receipt. | {school.name}
        </p>
        <div style={{ textAlign: "center", width: "200px" }}>
          <div style={{ borderBottom: "1px solid #cbd5e1", marginBottom: "8px", height: "40px" }}></div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: "#334155" }}>Accountant</p>
        </div>
      </div>
      </div>
    </div>
  );
}

export default ReceiptTemplate;
