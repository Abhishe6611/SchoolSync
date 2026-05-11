import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JsBarcode from "jsbarcode";
import api from "../api/axios.js";

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

const getDayName = (dateString) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date(dateString);
  return days[d.getDay()];
};

/**
 * Generate Hall Ticket PDF(s) matching the premium template
 */
export const generateHallTicket = async (students, examSchedule, term) => {
  const studentList = Array.isArray(students) ? students : [students];
  const schoolData = await fetchSchoolSettings(true);
  const schoolName = (schoolData?.school_name || "ABC PUBLIC SCHOOL").toUpperCase();
  const address = schoolData?.address || "123, Green Park, New Delhi - 110016";
  const tagline = "LEARN • GROW • EXCEL";
  const contactInfo = `www.${schoolName.toLowerCase().replace(/\s/g, "")}.edu.in | 9876543210`;
  const academicYear = "2024-25";

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const navy = [20, 43, 89];
  const gold = [218, 165, 32];
  const orange = [243, 156, 18];

  for (let i = 0; i < studentList.length; i++) {
    const student = studentList[i];
    if (i > 0) doc.addPage();

    // Border
    doc.setDrawColor(...navy);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 200, 287);

    // ==========================================
    // 1. HEADER SECTION
    // ==========================================
    
    // Logo (Shield Style Placeholder)
    if (schoolData?.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = `${API_BASE}${schoolData.logo_url}?t=${new Date().getTime()}`;
        });
        doc.addImage(img, "PNG", 10, 10, 25, 25);
      } catch { 
        // Draw a placeholder shield if logo fails
        doc.setDrawColor(...gold);
        doc.setLineWidth(1);
        doc.line(10, 10, 35, 10);
        doc.line(35, 10, 35, 30);
        doc.line(35, 30, 22.5, 35);
        doc.line(22.5, 35, 10, 30);
        doc.line(10, 30, 10, 10);
      }
    }

    // School Name & Tagline
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(schoolName, 40, 22);

    doc.setTextColor(...orange);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(tagline, 40, 30);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${address} | ${contactInfo}`, 40, 36);

    // Right Ribbon (HALL TICKET)
    doc.setFillColor(...navy);
    doc.triangle(150, 10, 205, 10, 205, 25, "F");
    doc.rect(160, 10, 45, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("HALL TICKET", 182, 20, { align: "center" });

    // Academic Year Ribbon
    doc.setFillColor(...orange);
    doc.rect(155, 28, 50, 8, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`ACADEMIC YEAR : ${academicYear}`, 180, 33.5, { align: "center" });

    // ==========================================
    // 2. INFO BARS
    // ==========================================
    doc.setFillColor(...navy);
    doc.roundedRect(10, 45, 45, 8, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("EXAMINATION", 15, 50.5);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`:   ${term.toUpperCase()} EXAM ${academicYear}`, 58, 50.5);

    doc.setFillColor(...navy);
    doc.roundedRect(145, 45, 30, 8, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("ROLL NO.", 150, 50.5);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`:   ${student.id}`, 178, 50.5);

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 56, 200, 56);

    // ==========================================
    // 3. STUDENT DETAILS
    // ==========================================
    const startY = 65;
    const labels = [
      "STUDENT NAME", "FATHER'S NAME", "MOTHER'S NAME", 
      "GRADE / CLASS", "SECTION", "ADMISSION NO.", "DATE OF BIRTH"
    ];
    const values = [
      `${student.first_name} ${student.last_name}`.toUpperCase(),
      (student.father_name || "N/A").toUpperCase(),
      (student.mother_name || "N/A").toUpperCase(),
      student.class_id || "7",
      "B", // Placeholder for Section if not in student object
      `ABCS/2021/${String(student.id).padStart(4, '0')}`,
      student.dob || "15/08/2012"
    ];

    doc.setFontSize(9);
    labels.forEach((label, idx) => {
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text(label, 15, startY + (idx * 7));
      doc.text(":", 60, startY + (idx * 7));
      doc.setTextColor(...navy);
      doc.text(String(values[idx]), 65, startY + (idx * 7));
    });

    // Student Photo Box
    doc.setDrawColor(180, 180, 180);
    doc.rect(110, 62, 38, 48);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("STUDENT PHOTO", 129, 87, { align: "center" });

    // Barcode & Signature
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, String(student.id), { format: "CODE128", height: 40, displayValue: false });
    const barcodeImg = canvas.toDataURL("image/png");
    doc.addImage(barcodeImg, "PNG", 155, 78, 45, 12);
    doc.setTextColor(0,0,0);
    doc.setFontSize(8);
    doc.text(String(student.id), 177.5, 93, { align: "center" });

    doc.line(155, 72, 200, 72);
    doc.setFontSize(8);
    doc.text("Student's Signature", 177.5, 76, { align: "center" });

    // ==========================================
    // 4. EXAMINATION SCHEDULE
    // ==========================================
    doc.setFillColor(...navy);
    doc.roundedRect(85, 115, 60, 7, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("EXAMINATION SCHEDULE", 115, 120, { align: "center" });

    const tableData = examSchedule.map(ex => [
      ex.date,
      getDayName(ex.date),
      ex.subject_code || (ex.name ? ex.name.substring(0,3).toUpperCase() : "SUB"),
      ex.name || "Subject",
      "09:00 AM - 12:00 PM"
    ]);

    autoTable(doc, {
      startY: 125,
      head: [["DATE", "DAY", "SUBJECT CODE", "SUBJECT NAME", "TIME DURATION"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: navy, textColor: 255, fontSize: 8, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 8, halign: "center", textColor: 50 },
      columnStyles: {
        3: { halign: "left" }
      },
      margin: { left: 10, right: 10 }
    });

    // ==========================================
    // 5. FOOTER (Instructions & Stamps)
    // ==========================================
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Instructions Box
    doc.setFillColor(250, 250, 250);
    doc.rect(10, finalY, 190, 45, "F");
    doc.setDrawColor(230, 230, 230);
    doc.rect(10, finalY, 190, 45, "D");

    doc.setFillColor(...navy);
    doc.roundedRect(25, finalY + 5, 45, 6, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("IMPORTANT INSTRUCTIONS", 47.5, finalY + 9, { align: "center" });

    const inst = [
      "1. This hall ticket is mandatory to enter the examination hall.",
      "2. Students must report 30 minutes before the exam starts.",
      "3. Carry your school ID card and all required stationery.",
      "4. Use of unfair means will lead to disqualification.",
      "5. Mobile phones and electronic gadgets are not allowed."
    ];
    doc.setTextColor(50, 50, 50);
    inst.forEach((txt, idx) => {
      doc.text(txt, 15, finalY + 20 + (idx * 5));
    });

    // Principal Signature
    doc.line(155, finalY + 35, 200, finalY + 35);
    doc.text("Principal's Signature", 177.5, finalY + 40, { align: "center" });
    // Fake signature
    doc.setTextColor(...navy);
    doc.setFont("courier", "italic");
    doc.text("Principal", 177.5, finalY + 33, { align: "center" });

    // Bottom Banner
    doc.setFillColor(...navy);
    doc.rect(10, 280, 190, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("NOTE: This hall ticket is valid only for the above mentioned examination.", 105, 286, { align: "center" });
    
    // Corner accents
    doc.setFillColor(...orange);
    doc.triangle(10, 280, 25, 290, 10, 290, "F");
    doc.triangle(200, 280, 200, 290, 185, 290, "F");
  }

  const fileName = studentList.length === 1 
    ? `HallTicket_${studentList[0].first_name}_${term}.pdf` 
    : `HallTickets_Bulk_${term}.pdf`;
  doc.save(fileName);
};
