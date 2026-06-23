import { forwardRef } from "react";
import { formatDate } from "../utils/dateFormatter.js";

const DEFAULTS = {
  school_name: "SchoolSync Academy",
  address: "123 Education Boulevard, New Delhi – 110001",
  phone: "+91-11-2345-6789",
  email: "admissions@schoolsync.edu.in",
  registration_no: "CBSE/AFF/2410123",
  principal_name: "Dr. Priya Mehta",
  admission_head: "Mr. Anil Kumar",
};

const AdmissionLetter = forwardRef(({ student, className: classLabel, school: schoolProp }, ref) => {
  const SCHOOL = { ...DEFAULTS, ...schoolProp };
  if (!student) return null;

  const academicYear = (() => {
    const d = new Date(student.admission_date || Date.now());
    const y = d.getFullYear();
    return d.getMonth() >= 3 ? `${y}–${y + 1}` : `${y - 1}–${y}`;
  })();

  const refNo = `ADM/${new Date(student.admission_date || Date.now()).getFullYear()}/${String(student.id).padStart(4, "0")}`;

  return (
    <div ref={ref} style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", background: "#fff", fontFamily: "'Segoe UI', 'Inter', sans-serif", color: "#1a1a2e", padding: 0, boxSizing: "border-box", fontSize: "13px", lineHeight: 1.6 }}>

      {/* ── HEADER BAR ── */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", color: "#fff", padding: "28px 40px 22px", display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Logo */}
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid rgba(255,255,255,0.2)", overflow: "hidden" }}>
          {SCHOOL.logo_url ? (
            <img src={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${SCHOOL.logo_url}`} alt="School Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
            </svg>
          )}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, letterSpacing: "0.5px" }}>{SCHOOL.school_name}</h1>
          <p style={{ margin: "4px 0 0", fontSize: "11.5px", opacity: 0.8 }}>{SCHOOL.address}</p>
          <p style={{ margin: "2px 0 0", fontSize: "10.5px", opacity: 0.65 }}>
            {SCHOOL.phone} &nbsp;|&nbsp; {SCHOOL.email} &nbsp;|&nbsp; Reg: {SCHOOL.registration_no}
          </p>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: "32px 44px 40px" }}>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1a1a2e", letterSpacing: "2px", textTransform: "uppercase" }}>
            Certificate of Admission
          </h2>
          <div style={{ width: 80, height: 3, background: "linear-gradient(90deg, #f5c518, #e2a800)", margin: "8px auto 0", borderRadius: 2 }} />
        </div>

        {/* Ref & Date */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#555", marginBottom: "22px" }}>
          <span><strong>Ref No:</strong> {refNo}</span>
          <span><strong>Date:</strong> {formatDate(new Date().toISOString().split("T")[0])}</span>
        </div>

        {/* Salutation */}
        <p style={{ margin: "0 0 14px", fontSize: "13.5px" }}>
          Dear <strong>Mr./Mrs. {student.father_name || "Parent"}</strong>,
        </p>
        <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#333" }}>
          We are pleased to inform you that the following student has been granted admission to <strong>{SCHOOL.school_name}</strong> for the Academic Year <strong>{academicYear}</strong>. We warmly welcome your ward to our institution and look forward to a productive academic journey together.
        </p>

        {/* Student Details Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "Student Name", value: `${student.first_name} ${student.last_name}` },
            { label: "Student ID", value: `#${student.id}` },
            { label: "Class Admitted", value: classLabel || "—" },
            { label: "Date of Birth", value: formatDate(student.dob) },
            { label: "Father's Name", value: student.father_name || "—" },
            { label: "Mother's Name", value: student.mother_name || "—" },
            { label: "Date of Admission", value: formatDate(student.admission_date) },
            { label: "Academic Year", value: academicYear },
          ].map((item) => (
            <div key={item.label} style={{ background: "#f8f9fb", borderRadius: "8px", padding: "10px 14px", border: "1px solid #eaedf2" }}>
              <p style={{ margin: 0, fontSize: "10px", color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>{item.label}</p>
              <p style={{ margin: "3px 0 0", fontSize: "14px", fontWeight: 600, color: "#1a1a2e" }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Fee Summary */}
        <div style={{ marginBottom: "28px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a2e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Fee Summary</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ background: "#1a1a2e", color: "#fff" }}>
                <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Component</th>
                <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Tuition Fee", amount: student.base_fee || 0 },
                { label: "Transport Fee", amount: student.transport_fee || 0 },
                { label: "Other Fees (Admission + Activity)", amount: student.other_fee || 0 },
                ...(student.discount_amount > 0 ? [{ label: `Discount${student.discount_reason ? ` (${student.discount_reason})` : ""}`, amount: -(student.discount_amount || 0) }] : []),
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eaedf2" }}>
                  <td style={{ padding: "7px 14px" }}>{row.label}</td>
                  <td style={{ padding: "7px 14px", textAlign: "right", fontFamily: "monospace", color: row.amount < 0 ? "#e03131" : "#1a1a2e" }}>
                    {row.amount < 0 ? `- ₹${Math.abs(row.amount).toLocaleString("en-IN")}` : `₹${row.amount.toLocaleString("en-IN")}`}
                  </td>
                </tr>
              ))}
              <tr style={{ background: "#f0f4ff", fontWeight: 700 }}>
                <td style={{ padding: "9px 14px" }}>Total Annual Fee</td>
                <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: "monospace", color: "#1a1a2e", fontSize: "14px" }}>₹{(student.total_fee || 0).toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms */}
        <p style={{ fontSize: "12px", color: "#555", marginBottom: "6px" }}>
          Please ensure compliance with the school's code of conduct and academic guidelines. Fee payments must be completed as per the schedule communicated separately. Failure to comply with deadlines may attract late-payment surcharges.
        </p>
        <p style={{ fontSize: "12px", color: "#555", marginBottom: "40px" }}>
          We wish your ward a successful and enriching learning experience at {SCHOOL.name}.
        </p>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "50px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 160, borderBottom: "2px solid #1a1a2e", marginBottom: "6px" }} />
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1a1a2e" }}>{SCHOOL.principal_name}</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>Principal</p>
          </div>
          {/* Seal */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 70, height: 70, borderRadius: "50%", border: "3px double #c5a332", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
              <span style={{ fontSize: "8px", fontWeight: 800, color: "#c5a332", textAlign: "center", lineHeight: 1.2, textTransform: "uppercase" }}>Official<br />Seal</span>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 160, borderBottom: "2px solid #1a1a2e", marginBottom: "6px" }} />
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1a1a2e" }}>{SCHOOL.admission_head}</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>Admission Head</p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div style={{ borderTop: "2px solid #eaedf2", margin: "0 44px", padding: "12px 0", textAlign: "center", fontSize: "10px", color: "#aaa" }}>
        This is a computer-generated document. For queries, contact {SCHOOL.email} or call {SCHOOL.phone}.
      </div>
    </div>
  );
});

AdmissionLetter.displayName = "AdmissionLetter";
export default AdmissionLetter;
