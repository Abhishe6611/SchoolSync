# 🏫 School Management System (ERP)

A high-fidelity, professional-grade ERP system designed to streamline school administration, financial tracking, academic management, and logistics. Built with a modern tech stack (FastAPI + React), it features a premium "glassmorphism" UI and robust data-driven analytics.

![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/frontend-React%20%2B%20Vite-blue)
![FastAPI](https://img.shields.io/badge/backend-FastAPI%20%2B%20Python-green)
![MongoDB](https://img.shields.io/badge/database-MongoDB%20Atlas-forestgreen)

---

## 🚀 Key Modules

### 👨‍🎓 Student & Staff Management

- **Digital Profiles**: Comprehensive student and staff directories with dynamic profile views.
- **ID Card Generation**: Automated generation of print-ready ID cards with school branding.
- **Attendance Tracking**: High-performance attendance modules for both students and staff with "no-future-date" validation.

### 💰 Financial Management

- **Fee Collection**: Interactive dashboards for fee collection trends (Daily/Monthly granularity).
- **Financial Analytics**: Real-time insights into revenue, pending dues, and collection metrics using Chart.js & Recharts.
- **Automated Receipts**: Generation of PDF receipts for transactions.

### 📚 Academic & Exam Management

- **Exam Scheduling**: Bulk subject-to-exam mapping and scheduling.
- **Gradebooks**: Automated grade calculation and management.
- **Timetables**: Class-wise and teacher-wise timetable management.

### 💳 Payroll & Logistics

- **Payroll Engine**: Experience-based salary mapping and one-click PDF payslip generation.
- **Transport Logistics**: Vehicle and driver tracking with defined route management.

---

## 🛠 Tech Stack

### Frontend

- **Framework**: React 18 (Vite-powered)
- **Styling**: Tailwind CSS (Custom Design System)
- **Visualization**: Chart.js, Recharts
- **Utilities**: Axios, jsPDF, ExcelJS, react-easy-crop
- **PWA**: Ready for offline/mobile installation

### Backend

- **Framework**: FastAPI (Python 3.10+)
- **Database**: MongoDB Atlas (Motor/Beanie ODM)
- **Authentication**: JWT (JSON Web Tokens) with standard security practices
- **Validation**: Pydantic v2

---

## 📦 Project Structure

```text
├── frontend/             # React + Vite application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Dashboard views
│   │   ├── context/      # Auth & Global state
│   │   └── api/          # Axios interceptors & services
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── models/       # Beanie/Pydantic schemas
│   │   ├── routers/      # API Endpoints
│   │   └── database/     # DB Connection logic
│   ├── uploads/          # Local storage (Dev only)
│   └── requirements.txt  # Python dependencies
└── README.md             # Documentation
```

---

## 🛠 Installation & Setup

### Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- MongoDB Atlas Account

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
git checkout main -- frontend/
But by adding -- frontend/ at the end, I told Git: "Do NOT switch branches. Stay exactly where we are on the backend branch. Just go into the main branch's memory, grab everything inside the frontend folder, and bring a copy of it into my current working directory."
```

Create a `.env` file in the `backend/` directory:

```env
MONGODB_URL=mongodb+srv://...
SECRET_KEY=your_super_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=["http://localhost:5173"]
```

Run the server:

```bash
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Run the application:

```bash
npm run dev
```

---

## 🌐 Production Deployment Guide

### 1. Frontend Build

Always build the production bundle before deploying:

```bash
npm run build
```

The output will be in the `dist/` directory. You can host this on Vercel, Netlify, or AWS S3.

### 2. Backend Production

For production, use `uvicorn` with multiple workers or `gunicorn`:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### ⚠️ Critical Production Checklist

- [ ] **S3 Storage**: Replace `backend/uploads` with AWS S3 for profile photos to prevent data loss on ephemeral servers.
- [ ] **JWT Expiration**: Ensure `ACCESS_TOKEN_EXPIRE_MINUTES` is set to a reasonable window (e.g., 60 mins).
- [ ] **CORS**: Update `CORS_ORIGINS` to include your production domain.
- [ ] **SSL/TLS**: Always serve over HTTPS for security.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
