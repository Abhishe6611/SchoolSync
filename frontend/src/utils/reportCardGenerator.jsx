export function printReportCard(data) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Build grades rows via concatenation to avoid nested template literal issues
  let gradeRows = '';
  for (const g of data.grades) {
    gradeRows += '<tr>';
    gradeRows += '<td class="subject-col">' + g.subject_name + '</td>';
    gradeRows += '<td>' + (g.internal_marks != null ? g.internal_marks : '-') + '</td>';
    gradeRows += '<td>' + (g.external_marks != null ? g.external_marks : '-') + '</td>';
    gradeRows += '<td>' + g.marks_obtained + ' <small>(Max ' + g.max_marks + ')</small></td>';
    gradeRows += '<td>' + g.grade + '</td>';
    gradeRows += '</tr>';
  }

  // Build logo section — resolve relative paths to absolute URLs
  let logoContent = '[Logo Here]';
  let logoStyle = '';
  if (data.school.logo_url) {
    let logoSrc = data.school.logo_url;
    // If the URL is relative (starts with /), prepend the backend base URL
    if (logoSrc.startsWith('/')) {
      logoSrc = API_BASE + logoSrc;
    }
    logoContent = '<img src="' + logoSrc + '" alt="School Logo" />';
    logoStyle = 'border: none; background: transparent;';
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Report Card - ${data.student.student_name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&family=Arial:wght@400;600;700&display=swap');

  @page {
    size: A4;
    margin: 15mm;
  }

  body {
    font-family: 'Arial', sans-serif;
    background-color: #fff;
    margin: 0;
    padding: 0;
    color: #1a202c;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page-container {
    max-width: 100%;
    margin: 0 auto;
    background: white;
  }

  .letterhead {
    text-align: center;
    border-bottom: 4px double #2d3748;
    padding-bottom: 20px;
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 30px;
  }
  .logo-placeholder {
    width: 100px;
    height: 100px;
    background-color: #edf2f7;
    border: 2px dashed #cbd5e0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a0aec0;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
    overflow: hidden;
  }
  .logo-placeholder img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .school-details h1 {
    font-family: 'Times New Roman', serif;
    font-size: 32px;
    color: #1a202c;
    margin: 0 0 5px 0;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .school-details p {
    margin: 3px 0;
    font-size: 14px;
    color: #4a5568;
  }

  .exam-title {
    text-align: center;
    margin-bottom: 30px;
  }
  .exam-title h2 {
    font-family: 'Times New Roman', serif;
    font-size: 22px;
    margin: 0;
    text-decoration: underline;
    text-underline-offset: 6px;
  }
  .exam-title p {
    margin: 5px 0 0 0;
    font-size: 15px;
    font-weight: 600;
  }

  .student-details {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40px;
  }
  .details-column {
    width: 45%;
  }
  .detail-row {
    display: flex;
    margin-bottom: 12px;
    font-size: 15px;
  }
  .detail-label {
    font-weight: bold;
    width: 130px;
    color: #2d3748;
  }
  .detail-value {
    border-bottom: 1px solid #cbd5e0;
    flex-grow: 1;
    color: #1a202c;
    padding-bottom: 2px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
  }
  th, td {
    border: 1px solid #718096;
    padding: 10px;
    text-align: center;
  }
  th {
    background-color: #edf2f7;
    font-weight: bold;
    font-size: 13px;
    color: #2d3748;
    text-transform: uppercase;
  }
  .subject-col {
    text-align: left;
    font-weight: 600;
  }
  .total-row td {
    font-weight: bold;
    background-color: #edf2f7;
  }

  .summary-box {
    display: flex;
    justify-content: space-between;
    border: 2px solid #2d3748;
    padding: 15px 30px;
    margin-bottom: 40px;
    background-color: #edf2f7;
  }
  .summary-item {
    font-size: 15px;
  }
  .summary-item span {
    font-weight: bold;
    font-size: 17px;
  }

  .remarks {
    margin-bottom: 60px;
  }
  .remarks-label {
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 15px;
  }
  .remarks-line {
    border-bottom: 1px solid #a0aec0;
    height: 30px;
  }

  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 60px;
  }
  .sig-block {
    text-align: center;
    width: 200px;
  }
  .sig-line {
    border-bottom: 1px solid #2d3748;
    margin-bottom: 10px;
  }
  .sig-label {
    font-size: 14px;
    font-weight: bold;
    color: #4a5568;
  }
</style>
</head>
<body>
  <div class="page-container">

    <div class="letterhead">
      <div class="logo-placeholder" style="${logoStyle}">
        ${logoContent}
      </div>
      <div class="school-details">
        <h1>${data.school.school_name || 'Global Excellence Academy'}</h1>
        <p>${data.school.address || '123 Education Boulevard, Knowledge City'}</p>
        <p>Email: ${data.school.email || 'contact@school.edu'} | Phone: ${data.school.phone || '+1-234-567-8900'}</p>
      </div>
    </div>

    <div class="exam-title">
      <h2>PROGRESS REPORT</h2>
      <p>${data.exam_title}</p>
    </div>

    <div class="student-details">
      <div class="details-column">
        <div class="detail-row">
          <div class="detail-label">Student Name:</div>
          <div class="detail-value">${data.student.student_name}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Admission No:</div>
          <div class="detail-value">${data.student.admission_no}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Date of Birth:</div>
          <div class="detail-value">${data.student.dob}</div>
        </div>
      </div>
      <div class="details-column">
        <div class="detail-row">
          <div class="detail-label">Class:</div>
          <div class="detail-value">${data.student.class_name}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Attendance:</div>
          <div class="detail-value">${data.student.attendance_percentage}</div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2" class="subject-col">Subjects</th>
          <th colspan="2">Marks Obtained</th>
          <th rowspan="2">Subject Total</th>
          <th rowspan="2">Grade</th>
        </tr>
        <tr>
          <th>Internal</th>
          <th>External</th>
        </tr>
      </thead>
      <tbody>
        ${gradeRows}
        <tr class="total-row">
          <td colspan="3" style="text-align: right; padding-right: 20px;">Grand Total</td>
          <td>${data.total_obtained} / ${data.total_max}</td>
          <td>${data.overall_percentage}%</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-box">
      <div class="summary-item">Total Marks: <span>${data.total_obtained} / ${data.total_max}</span></div>
      <div class="summary-item">Overall Percentage: <span>${data.overall_percentage}%</span></div>
      <div class="summary-item">Overall Grade: <span>${data.overall_grade}</span></div>
    </div>

    <div class="remarks">
      <div class="remarks-label">Class Teacher's Remarks:</div>
      <div class="remarks-line" style="margin-top: 15px;"></div>
      <div class="remarks-line"></div>
    </div>

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Class Teacher</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Parent / Guardian</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Principal</div>
      </div>
    </div>

  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  } else {
    alert("Popup blocker prevented printing. Please allow popups for this site.");
  }
}
