import jsPDF from "jspdf";
import QRCode from "qrcode";
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

/**
 * Generate a PDF containing ID cards for a list of people
 * @param {Array} people - List of student or staff objects
 * @param {String} type - "student" | "staff"
 */
export const generateIdCards = async (people, type = "student") => {
  if (!people || people.length === 0) return;

  const schoolData = await fetchSchoolSettings(true); // Force fetch latest settings
  const schoolName = (schoolData?.school_name || "SCHOOLSYNC ACADEMY").toUpperCase();
  const address = schoolData?.address || "123 Education Blvd, New Delhi - 110001";
  const phone = schoolData?.phone || "+91 98765 43210";
  const email = schoolData?.email || "info@schoolsync.edu.in";
  
  // Theme Colors
  const isStudent = type === "student";
  const sidebarColor = isStudent ? [26, 43, 76] : [6, 95, 70]; // Navy vs Emerald
  const accentColor = isStudent ? [67, 56, 202] : [16, 185, 129];
  const textColor = [30, 41, 59];
  const lightGray = [241, 245, 249];

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // CR-80 Portrait
  const w = 54;
  const h = 86;
  const marginX = 15;
  const marginY = 15;
  const gapX = 10;
  const gapY = 10;

  let x = marginX;
  let y = marginY;

  // Try to load logo
  let logoBase64 = null;
  if (schoolData?.logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `${API_BASE}${schoolData.logo_url}?t=${new Date().getTime()}`;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      logoBase64 = canvas.toDataURL("image/png");
    } catch {
      logoBase64 = null;
    }
  }

  for (let i = 0; i < people.length; i++) {
    const person = people[i];

    if (y + h > 280) {
      doc.addPage();
      y = marginY;
    }

    const xFront = x;
    const xBack = x + w + gapX;
    
    const personIdStr = isStudent ? `SS${String(person.id).padStart(4, "0")}` : `ST${String(person.id).padStart(4, "0")}`;
    const personName = `${person.first_name} ${person.last_name}`.toUpperCase();

    // ==========================================
    // FRONT (Option 5: Corporate Sidebar)
    // ==========================================
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(xFront, y, w, h, 2, 2, "FD");

    // Clipping for Sidebar
    doc.saveGraphicsState();
    doc.roundedRect(xFront, y, w, h, 2, 2, "S");
    doc.clip();
    
    // Sidebar
    doc.setFillColor(...sidebarColor);
    doc.rect(xFront, y, 14, h, "F");
    
    // Logo in Sidebar
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", xFront + 2, y + 6, 10, 10);
      } catch { /* ignore */ }
    } else {
      doc.setFillColor(255, 255, 255);
      doc.circle(xFront + 7, y + 11, 4, "F");
    }

    // Vertical School Name in Sidebar
    doc.saveGraphicsState();
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    // Move to sidebar and rotate
    doc.setGState(new doc.GState({ opacity: 0.8 }));
    // Manual rotation positioning
    const verticalText = schoolName.length > 20 ? schoolName.substring(0, 17) + "..." : schoolName;
    // jsPDF rotation is slightly tricky with coordinates, let's use a simpler approach or just vertical stack
    let charY = y + 25;
    for (let char of verticalText.substring(0, 15)) {
       doc.text(char, xFront + 7, charY, { align: "center" });
       charY += 3.5;
    }
    doc.restoreGraphicsState();

    doc.restoreGraphicsState();

    // Body Content (Right of Sidebar)
    const contentX = xFront + 18;

    // Student/Staff Label
    doc.setTextColor(...accentColor);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(isStudent ? "STUDENT ID" : "STAFF ID", contentX, y + 8);

    // Photo
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(...lightGray);
    doc.roundedRect(contentX, y + 12, 18, 22, 1, 1, "FD");
    if (person.photo_url) {
      try {
        const pImg = new Image();
        pImg.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          pImg.onload = resolve;
          pImg.onerror = reject;
          pImg.src = `${API_BASE}${person.photo_url}?t=${new Date().getTime()}`;
        });
        doc.addImage(pImg, "JPEG", contentX + 0.5, y + 12.5, 17, 21);
      } catch {
        // Fallback silhouette
        doc.setFillColor(200, 200, 200);
        doc.circle(contentX + 9, y + 18, 3.5, "F");
        doc.ellipse(contentX + 9, y + 28, 6, 5, "F");
      }
    } else {
      // Silhouette placeholder
      doc.setFillColor(200, 200, 200);
      doc.circle(contentX + 9, y + 18, 3.5, "F");
      doc.ellipse(contentX + 9, y + 28, 6, 5, "F");
    }

    // Name
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(personName, contentX, y + 40, { maxWidth: 32 });

    // Details Grid
    doc.setFontSize(5.5);
    let dy = 46;
    const details = isStudent ? [
      { l: "Roll No", v: personIdStr },
      { l: "Class", v: person.class_id || "N/A" },
      { l: "D.O.B", v: person.dob || "—" },
      { l: "Blood", v: person.blood_group || "O+" },
      { l: "Address", v: person.address || "—" },
    ] : [
      { l: "Emp ID", v: personIdStr },
      { l: "Dept", v: "ADMIN" },
      { l: "Join Date", v: person.hire_date || "—" },
      { l: "Blood", v: "O+" },
      { l: "Address", v: person.address || "—" },
    ];

    details.forEach(d => {
      doc.setFont("helvetica", "bold");
      doc.text(d.l, contentX, y + dy);
      doc.setFont("helvetica", "normal");
      doc.text(`: ${d.v}`, contentX + 9, y + dy, { maxWidth: 22 });
      dy += (doc.getTextDimensions(d.v, { maxWidth: 22, fontSize: 5.5 }).h) + 2.5;
    });

    // QR Code
    try {
      const qrUrl = await QRCode.toDataURL(`ID:${personIdStr}`, { margin: 0 });
      doc.addImage(qrUrl, "PNG", xFront + w - 10, y + h - 10, 8, 8);
    } catch {}


    // ==========================================
    // BACK
    // ==========================================
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(xBack, y, w, h, 2, 2, "FD");

    // Header Back
    doc.setFillColor(...lightGray);
    doc.rect(xBack, y, w, 8, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("INSTRUCTIONS", xBack + 5, y + 5.5);

    // Instruction List
    doc.setFontSize(4.5);
    doc.setFont("helvetica", "normal");
    const instructions = [
      "This card is the property of the institution.",
      "Loss of card must be reported immediately.",
      "Misuse of this card is a punishable offense.",
      "Please carry this card at all times.",
      "If found, please return to the school office."
    ];
    let iy = y + 13;
    instructions.forEach(ins => {
      doc.setFillColor(...accentColor);
      doc.circle(xBack + 5, iy - 1, 0.5, "F");
      doc.text(ins, xBack + 7, iy, { maxWidth: w - 12 });
      iy += 3.5;
    });

    // Emergency Contact Section
    const ecY = y + 35;
    doc.setFillColor(...lightGray);
    doc.rect(xBack, ecY, w, 6, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text("EMERGENCY CONTACT", xBack + 5, ecY + 4);

    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text(`Phone: ${phone}`, xBack + 5, ecY + 10);
    doc.text(`Email: ${email}`, xBack + 5, ecY + 14);
    doc.text(`Admin: ${phone}`, xBack + 5, ecY + 18); // College/Emergency number

    // Barcode at Bottom
    try {
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, personIdStr, { format: "CODE128", displayValue: false, margin: 0, height: 40 });
      const bcUrl = canvas.toDataURL("image/png");
      doc.addImage(bcUrl, "PNG", xBack + w/2 - 15, y + h - 18, 30, 8);
      
      doc.setFontSize(5);
      doc.setFont("helvetica", "bold");
      doc.text(personIdStr, xBack + w/2, y + h - 8, { align: "center" });
    } catch {}

    // Footer Address (Back)
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 100);
    doc.text(address, xBack + w/2, y + h - 4, { align: "center", maxWidth: w - 10 });

    // Next row
    y += h + gapY;
  }

  doc.save(`${isStudent ? "Student" : "Staff"}_ID_Cards.pdf`);
};

export const generateStudentIdCards = async (students) => generateIdCards(students, "student");
export const generateStaffIdCards = async (staff) => generateIdCards(staff, "staff");
