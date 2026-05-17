# General Daily-Wage Payroll Logic

This is a domain-neutral version of the daily-wage salary logic. It can be used for any daily-paid worker, staff member, temporary employee, field worker, shop worker, technician, driver, service staff, or similar role.

It does not include contractor, milestone, project-based, or monthly salary logic.

## Core Concept

Each person has a fixed daily rate. For each working date, attendance is recorded with a status. The system calculates gross wage from attendance, then optionally tracks deductions such as advance recovery or penalties.

## Worker Record

Store one record per daily-paid person.

```js
{
  organizationId,
  name,
  role,
  isActive,
  employmentType: 'daily',
  isTemporary,
  dailyRate,
  phone,
  notes
}
```

Important fields:

- `organizationId`: company, branch, team, or account owner.
- `name`: worker/staff name.
- `role`: job type, department, skill, or staff category.
- `isActive`: only active workers appear in daily attendance.
- `employmentType`: use `daily` for this module.
- `isTemporary`: marks temporary/substitute/on-call workers.
- `dailyRate`: amount paid for one full working day.

## Attendance Record

Store one attendance record per worker per date.

```js
{
  organizationId,
  workerId,
  date,
  status,
  overtimeHours,
  advanceDeduction,
  penalty,
  grossWage,
  netPayable,
  workNote,
  createdAt
}
```

Allowed statuses:

```txt
present
absent
half-day
overtime
```

Recommended unique rule:

```js
{ workerId: 1, date: 1 }
```

This prevents duplicate attendance for the same person on the same date.

## Wage Formula

Basic calculation:

```js
let grossWage = 0;

if (status === 'present') {
  grossWage = dailyRate;
} else if (status === 'half-day') {
  grossWage = dailyRate / 2;
} else if (status === 'overtime') {
  const hourlyRate = dailyRate / standardHoursPerDay;
  grossWage = dailyRate + overtimeHours * hourlyRate;
} else if (status === 'absent') {
  grossWage = 0;
}
```

Default:

```js
standardHoursPerDay = 8
```

Meaning:

- `present`: pays full daily rate.
- `half-day`: pays half daily rate.
- `overtime`: pays full daily rate plus overtime.
- `absent`: pays nothing.

## Overtime Formula

```js
hourlyRate = dailyRate / standardHoursPerDay
overtimePay = overtimeHours * hourlyRate
grossWage = dailyRate + overtimePay
```

Example:

```txt
dailyRate = 800
standardHoursPerDay = 8
overtimeHours = 2

hourlyRate = 800 / 8 = 100
overtimePay = 2 * 100 = 200
grossWage = 800 + 200 = 1000
```

## Deductions

Common deductions:

```js
advanceDeduction
penalty
```

Net payable:

```js
netPayable = grossWage - advanceDeduction - penalty
```

Safer version:

```js
netPayable = Math.max(grossWage - advanceDeduction - penalty, 0)
```

## Clean Helper Function

```js
function calculateDailyWagePay({
  dailyRate = 0,
  status,
  overtimeHours = 0,
  advanceDeduction = 0,
  penalty = 0,
  standardHoursPerDay = 8,
}) {
  let grossWage = 0;

  if (status === 'present') {
    grossWage = dailyRate;
  } else if (status === 'half-day') {
    grossWage = dailyRate / 2;
  } else if (status === 'overtime') {
    const hourlyRate = dailyRate / standardHoursPerDay;
    grossWage = dailyRate + overtimeHours * hourlyRate;
  } else if (status === 'absent') {
    grossWage = 0;
  }

  const deductions = (advanceDeduction || 0) + (penalty || 0);
  const netPayable = Math.max(grossWage - deductions, 0);

  return {
    grossWage,
    overtimeHours,
    advanceDeduction,
    penalty,
    deductions,
    netPayable,
  };
}
```

## Attendance Save Flow

1. Select date.
2. Fetch all active daily-paid workers.
3. Fetch existing attendance for the selected date.
4. Show each worker with attendance controls.
5. User marks status:

```txt
present / half-day / overtime / absent
```

6. If status is `overtime`, user enters overtime hours.
7. User optionally enters advance deduction, penalty, or work note.
8. Backend calculates wage and saves attendance.

Create payload:

```js
{
  workerId,
  date,
  status,
  overtimeHours,
  advanceDeduction,
  penalty,
  workNote
}
```

Saved result:

```js
{
  workerId,
  date,
  status,
  overtimeHours,
  advanceDeduction,
  penalty,
  grossWage,
  netPayable,
  workNote
}
```

## Attendance Update Flow

When attendance status, overtime hours, advance deduction, or penalty changes, recalculate pay.

```js
const pay = calculateDailyWagePay({
  dailyRate: worker.dailyRate,
  status,
  overtimeHours,
  advanceDeduction,
  penalty,
  standardHoursPerDay: 8,
});

attendance.grossWage = pay.grossWage;
attendance.netPayable = pay.netPayable;
```

## Daily Summary

For a selected date, fetch all attendance records for that date.

```js
const totalGrossWage = attendance.reduce((sum, item) => sum + (item.grossWage || 0), 0);
const totalAdvance = attendance.reduce((sum, item) => sum + (item.advanceDeduction || 0), 0);
const totalPenalty = attendance.reduce((sum, item) => sum + (item.penalty || 0), 0);
const totalNetPayable = attendance.reduce((sum, item) => sum + (item.netPayable || 0), 0);
```

Return:

```js
{
  date,
  workersMarked: attendance.length,
  totalGrossWage,
  totalAdvance,
  totalPenalty,
  totalDeductions: totalAdvance + totalPenalty,
  totalNetPayable
}
```

## Date Range Payroll Report

For weekly, biweekly, or monthly payroll, fetch attendance records between `startDate` and `endDate`.

Per worker, calculate:

```js
totalPresentDays
totalHalfDays
totalOvertimeDays
totalOvertimeHours
totalAbsentDays
totalGrossWage
totalAdvance
totalPenalty
totalNetPayable
```

Day counting:

```js
if (status === 'present') totalPaidDays += 1;
if (status === 'overtime') totalPaidDays += 1;
if (status === 'half-day') totalPaidDays += 0.5;
if (status === 'absent') totalPaidDays += 0;
```

Report row:

```js
{
  workerId,
  name,
  role,
  totalPaidDays,
  totalOvertimeHours,
  totalGrossWage,
  totalAdvance,
  totalPenalty,
  totalNetPayable
}
```

## Suggested API Structure

Worker APIs:

```txt
GET    /api/workers
POST   /api/workers
PATCH  /api/workers/:workerId
DELETE /api/workers/:workerId
```

Attendance APIs:

```txt
GET    /api/attendance?date=YYYY-MM-DD
GET    /api/attendance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
POST   /api/attendance
PATCH  /api/attendance/:attendanceId
DELETE /api/attendance/:attendanceId
```

Report APIs:

```txt
GET /api/payroll/daily-summary?date=YYYY-MM-DD
GET /api/payroll/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

## Suggested Database Indexes

```js
Worker.index({ organizationId: 1, isActive: 1 });
Worker.index({ organizationId: 1, employmentType: 1 });

Attendance.index({ organizationId: 1, date: 1 });
Attendance.index({ workerId: 1, date: 1 }, { unique: true });
```

## Validation Rules

Recommended validation:

- `dailyRate` must be greater than or equal to `0`.
- `status` must be one of `present`, `absent`, `half-day`, `overtime`.
- `overtimeHours` should be `0` unless status is `overtime`.
- `overtimeHours` should not exceed a configured maximum.
- `advanceDeduction` and `penalty` must be greater than or equal to `0`.
- One attendance record per worker per date.
- Worker must belong to the same organization as the attendance record.

## Example

Input:

```js
{
  dailyRate: 1000,
  status: 'overtime',
  overtimeHours: 3,
  advanceDeduction: 100,
  penalty: 50,
  standardHoursPerDay: 8
}
```

Calculation:

```txt
hourlyRate = 1000 / 8 = 125
overtimePay = 3 * 125 = 375
grossWage = 1000 + 375 = 1375
deductions = 100 + 50 = 150
netPayable = 1375 - 150 = 1225
```

Output:

```js
{
  grossWage: 1375,
  overtimeHours: 3,
  advanceDeduction: 100,
  penalty: 50,
  deductions: 150,
  netPayable: 1225
}
```
