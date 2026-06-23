import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import datetime
import certifi
import ssl

from app.models.staff import Staff
from app.models.payroll import SalaryStructure, Payslip
from app.models.base import Counter
from app.core.config import settings

async def seed_payroll():
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        tls=True,
        tlsCAFile=certifi.where(),
    )
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[Staff, SalaryStructure, Payslip, Counter])

    staff_members = await Staff.find_all().to_list()
    if not staff_members:
        print("No staff members found to generate payroll for.")
        return

    today = datetime.date.today()
    current_month = today.month
    current_year = today.year

    for staff in staff_members:
        # 1. Calculate Base Salary
        # Base: 25,000
        # + 2,000 per year of experience
        # + 1,500 per year of tenure
        
        prior_exp = staff.experience_years or 0
        
        tenure_years = 0
        if staff.hire_date:
            tenure_years = (today - staff.hire_date).days // 365
            if tenure_years < 0: tenure_years = 0

        base_salary = 25000 + (prior_exp * 2000) + (tenure_years * 1500)
        
        # 2. Check/Create Salary Structure
        structure = await SalaryStructure.find_one(SalaryStructure.staff_id == staff.id)
        if not structure:
            structure = SalaryStructure(
                staff_id=staff.id,
                base_salary=base_salary,
                transport_allowance=base_salary * 0.1,
                medical_allowance=2000,
                other_allowances=1000,
                standard_deductions=base_salary * 0.05
            )
            await structure.insert()
            print(f"Created salary structure for {staff.first_name}: {base_salary}")
        else:
            # Update existing if needed
            structure.base_salary = base_salary
            await structure.save()

        # 3. Generate Payslip for current month if not exists
        existing_payslip = await Payslip.find_one(
            Payslip.staff_id == staff.id,
            Payslip.month == current_month,
            Payslip.year == current_year
        )
        
        if not existing_payslip:
            total_allowances = structure.transport_allowance + structure.medical_allowance + structure.other_allowances
            net_payable = base_salary + total_allowances - structure.standard_deductions
            
            payslip = Payslip(
                staff_id=staff.id,
                month=current_month,
                year=current_year,
                total_working_days=26,
                days_present=26,
                base_salary=base_salary,
                total_allowances=total_allowances,
                other_deductions=structure.standard_deductions,
                net_payable=net_payable,
                status="Paid",
                payment_date=today
            )
            await payslip.insert()
            print(f"Generated paid payslip for {staff.first_name} for {current_month}/{current_year}")

    print("Payroll seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed_payroll())
