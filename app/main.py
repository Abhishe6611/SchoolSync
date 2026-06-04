from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


from app.core.config import settings
from app.core.dependencies import get_current_user
from app.database.session import init_db
from app.routers import attendance, auth, classes, fees, exams, grades, reports, staff, students, subjects, audit, timetable, transport, staff_attendance, payroll, inventory, admin_controls, report_cards, teacher_leaves

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
    
    # Require authentication for all subsequent routers
    protected_dependencies = [Depends(get_current_user)]

    app.include_router(students.router, prefix="/students", tags=["students"], dependencies=protected_dependencies)
    app.include_router(staff.router, prefix="/staff", tags=["staff"], dependencies=protected_dependencies)
    app.include_router(classes.router, prefix="/classes", tags=["classes"], dependencies=protected_dependencies)
    app.include_router(subjects.router, prefix="/subjects", tags=["subjects"], dependencies=protected_dependencies)
    app.include_router(attendance.router, prefix="/attendance", tags=["attendance"], dependencies=protected_dependencies)
    app.include_router(staff_attendance.router, prefix="/staff-attendance", tags=["staff-attendance"], dependencies=protected_dependencies)
    app.include_router(fees.router, prefix="/fees", tags=["fees"], dependencies=protected_dependencies)
    app.include_router(exams.router, prefix="/exams", tags=["exams"], dependencies=protected_dependencies)
    app.include_router(reports.router, prefix="/reports", tags=["reports"], dependencies=protected_dependencies)
    app.include_router(timetable.router, dependencies=protected_dependencies)
    app.include_router(audit.router, dependencies=protected_dependencies)
    app.include_router(transport.router, prefix="/transport", tags=["transport"], dependencies=protected_dependencies)
    app.include_router(payroll.router, prefix="/payroll", tags=["payroll"], dependencies=protected_dependencies)
    app.include_router(inventory.router, prefix="/inventory", tags=["inventory"], dependencies=protected_dependencies)
    app.include_router(admin_controls.router, prefix="/admin", tags=["admin"], dependencies=protected_dependencies)
    app.include_router(grades.router, dependencies=protected_dependencies)
    app.include_router(report_cards.router, prefix="/report-cards", tags=["report cards"], dependencies=protected_dependencies)
    app.include_router(teacher_leaves.router, prefix="/teacher-leaves", tags=["teacher_leaves"], dependencies=protected_dependencies)

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
