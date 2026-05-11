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
        
        unpaid_leave_days = sum(1 for a in attendances if a.status == "Absent")
        days_present = sum(1 for a in attendances if a.status == "Present")
        
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
