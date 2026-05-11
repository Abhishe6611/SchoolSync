from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


from app.core.config import settings
from app.database.session import init_db
from app.routers import attendance, auth, classes, fees, exams, reports, staff, students, subjects, audit, timetable, transport, staff_attendance, payroll, inventory, admin_controls

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Beanie and MongoDB connection — crash if this fails
    await init_db()
    print("Successfully connected to MongoDB.")
    yield
    # We could close the connection here if needed


def create_app() -> FastAPI:
    app = FastAPI(title="School Management System", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(students.router, prefix="/students", tags=["students"])
    app.include_router(staff.router, prefix="/staff", tags=["staff"])
    app.include_router(classes.router, prefix="/classes", tags=["classes"])
    app.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
    app.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
    app.include_router(staff_attendance.router, prefix="/staff-attendance", tags=["staff-attendance"])
    app.include_router(fees.router, prefix="/fees", tags=["fees"])
    app.include_router(exams.router, prefix="/exams", tags=["exams"])
    app.include_router(reports.router, prefix="/reports", tags=["reports"])
    app.include_router(timetable.router)
    app.include_router(audit.router)
    app.include_router(transport.router, prefix="/transport", tags=["transport"])
    app.include_router(payroll.router, prefix="/payroll", tags=["payroll"])
    app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
    app.include_router(admin_controls.router, prefix="/admin", tags=["admin"])

    # Serve uploaded files
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    return app

app = create_app()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    # Log the full error natively or via standard logging
    print(f"Global unhandled exception: {error_msg}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {error_msg}"}
    )
