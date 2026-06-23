from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import date
import calendar

from app.models.payroll import SalaryStructure, Payslip
from app.models.staff import Staff
from app.models.staff_attendance import StaffAttendance

router = APIRouter()

@router.get("/structures", response_model=List[SalaryStructure])
async def get_salary_structures():
    return await SalaryStructure.find_all().to_list()

@router.get("/structures/{staff_id}", response_model=SalaryStructure)
async def get_salary_structure(staff_id: int):
    structure = await SalaryStructure.find_one(SalaryStructure.staff_id == staff_id)
    if not structure:
        # Return a default zeroed structure if none exists
        return SalaryStructure(staff_id=staff_id)
    return structure

@router.post("/structures", response_model=SalaryStructure)
async def create_or_update_salary_structure(structure: SalaryStructure):
    existing = await SalaryStructure.find_one(SalaryStructure.staff_id == structure.staff_id)
    if existing:
        existing.base_salary = structure.base_salary
        existing.transport_allowance = structure.transport_allowance
        existing.medical_allowance = structure.medical_allowance
        existing.other_allowances = structure.other_allowances
        existing.standard_deductions = structure.standard_deductions
        await existing.save()
        return existing
    else:
        await structure.insert()
        return structure

@router.get("/{month}/{year}", response_model=List[Payslip])
async def get_payslips(month: int, year: int):
    return await Payslip.find(Payslip.month == month, Payslip.year == year).to_list()

@router.post("/generate/{month}/{year}")
async def generate_payroll(month: int, year: int):
    # 1. Get all active staff
    active_staff = await Staff.find(Staff.is_active == True).to_list()
    
    generated_count = 0
    total_working_days = calendar.monthrange(year, month)[1] 
    
    for staff in active_staff:
        # Get Salary Structure
        structure = await SalaryStructure.find_one(SalaryStructure.staff_id == staff.id)
        if not structure:
            continue # Can't generate without structure
            
        # Calculate Attendance
        start_date = date(year, month, 1)
        end_date = date(year, month, total_working_days)
        
        attendances = await StaffAttendance.find(
            StaffAttendance.staff_id == staff.id,
            StaffAttendance.date >= start_date,
            StaffAttendance.date <= end_date
        ).to_list()
        
        unpaid_leave_days = sum(1 for a in attendances if a.status.lower() == "absent")
        unpaid_leave_days += sum(0.5 for a in attendances if a.status.lower() == "half-day")
        
        days_present = sum(1 for a in attendances if a.status.lower() in ("present", "leave"))
        days_present += sum(0.5 for a in attendances if a.status.lower() == "half-day")
        
        # Calculate salary
        daily_rate = structure.base_salary / total_working_days
        leave_deduction = daily_rate * unpaid_leave_days
        
        total_allowances = structure.transport_allowance + structure.medical_allowance + structure.other_allowances
        total_deductions = structure.standard_deductions + leave_deduction
        net_payable = structure.base_salary + total_allowances - total_deductions
        
        # Check if payslip already exists to update or create
        existing_payslip = await Payslip.find_one(
            Payslip.staff_id == staff.id, 
            Payslip.month == month, 
            Payslip.year == year
        )

        if existing_payslip:
            # Update existing
            existing_payslip.total_working_days = total_working_days
            existing_payslip.days_present = days_present
            existing_payslip.unpaid_leave_days = unpaid_leave_days
            existing_payslip.base_salary = structure.base_salary
            existing_payslip.total_allowances = total_allowances
            existing_payslip.leave_deduction = leave_deduction
            existing_payslip.other_deductions = structure.standard_deductions
            existing_payslip.net_payable = net_payable
            await existing_payslip.save()
        else:
            # Create new payslip
            new_payslip = Payslip(
                staff_id=staff.id,
                month=month,
                year=year,
                total_working_days=total_working_days,
                days_present=days_present,
                unpaid_leave_days=unpaid_leave_days,
                base_salary=structure.base_salary,
                total_allowances=total_allowances,
                leave_deduction=leave_deduction,
                other_deductions=structure.standard_deductions,
                net_payable=net_payable,
                status="Pending"
            )
            await new_payslip.insert()
        
        generated_count += 1
        
    return {"message": f"Successfully processed payroll for {generated_count} staff members."}

@router.put("/{id}/pay")
async def pay_payslip(id: int):
    payslip = await Payslip.find_one(Payslip.id == id)
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
        
    payslip.status = "Paid"
    payslip.payment_date = date.today()
    await payslip.save()
    return payslip

@router.get("/daily-summary")
async def get_daily_wage_summary(date_str: str):
    target_date = date.fromisoformat(date_str)
    attendances = await StaffAttendance.find(StaffAttendance.date == target_date).to_list()
    
    # We only care about daily wage workers.
    staffs = await Staff.find(Staff.employment_type == "daily").to_list()
    daily_staff_ids = {s.id for s in staffs}
    
    daily_attendances = [a for a in attendances if a.staff_id in daily_staff_ids]
    
    total_gross = sum(a.gross_wage for a in daily_attendances)
    total_deductions = sum(a.advance_deduction + a.penalty for a in daily_attendances)
    total_net = sum(a.net_payable for a in daily_attendances)
    
    return {
        "date": target_date,
        "workers_marked": len(daily_attendances),
        "total_gross_wage": total_gross,
        "total_deductions": total_deductions,
        "total_net_payable": total_net,
        "records": daily_attendances
    }

@router.get("/daily-wage-report")
async def get_daily_wage_report(start_date: str, end_date: str):
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    
    daily_staffs = await Staff.find(Staff.employment_type == "daily").to_list()
    daily_staff_map = {s.id: s for s in daily_staffs}
    
    if not daily_staff_map:
        return []
        
    attendances = await StaffAttendance.find(
        StaffAttendance.date >= start,
        StaffAttendance.date <= end
    ).to_list()
    
    report_map = {}
    for att in attendances:
        if att.staff_id not in daily_staff_map:
            continue
            
        staff = daily_staff_map[att.staff_id]
        if staff.id not in report_map:
            report_map[staff.id] = {
                "staff_id": staff.id,
                "name": f"{staff.first_name} {staff.last_name}",
                "role": staff.role,
                "total_paid_days": 0.0,
                "total_overtime_hours": 0.0,
                "total_gross_wage": 0.0,
                "total_advance": 0.0,
                "total_penalty": 0.0,
                "total_net_payable": 0.0
            }
            
        row = report_map[staff.id]
        st = att.status.lower()
        if st in ('present', 'leave'):
            row["total_paid_days"] += 1
        elif st == 'half-day':
            row["total_paid_days"] += 0.5
        elif st == 'overtime':
            row["total_paid_days"] += 1
            
        row["total_overtime_hours"] += att.overtime_hours
        row["total_gross_wage"] += att.gross_wage
        row["total_advance"] += att.advance_deduction
        row["total_penalty"] += att.penalty
        row["total_net_payable"] += att.net_payable

    return list(report_map.values())
