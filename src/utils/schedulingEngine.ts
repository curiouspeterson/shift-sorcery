import { parseISO, format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchEmployees,
  fetchShifts,
  fetchCoverageRequirements,
  fetchTimeOffRequests,
  fetchEmployeeAvailability,
  createSchedule,
  insertScheduleAssignments,
} from "./scheduleUtils";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Shift = Database["public"]["Tables"]["shifts"]["Row"];

export const generateSchedule = async (weekStartDate: Date, userId: string) => {
  const employees = await fetchEmployees();
  const shifts = await fetchShifts();
  const coverageRequirements = await fetchCoverageRequirements();
  const timeOffRequests = await fetchTimeOffRequests(
    format(weekStartDate, "yyyy-MM-dd"),
    format(addDays(weekStartDate, 6), "yyyy-MM-dd")
  );
  const availability = await fetchEmployeeAvailability();

  // Group shifts by duration
  const groupedShifts = shifts.reduce((acc, shift) => {
    const start = parseISO(`2000-01-01T${shift.start_time}`);
    const end = parseISO(`2000-01-01T${shift.end_time}`);
    const duration = Math.abs(end.getTime() - start.getTime()) / (60 * 60 * 1000);

    if (!acc[duration]) {
      acc[duration] = [];
    }
    acc[duration].push(shift);
    return acc;
  }, {} as Record<number, Shift[]>);

  // Create new schedule
  const schedule = await createSchedule(
    format(weekStartDate, "yyyy-MM-dd"),
    userId
  );

  // Track employee hours
  const employeeHours: Record<string, number> = {};
  employees.forEach((emp) => {
    employeeHours[emp.id] = 0;
  });

  // Generate assignments
  const assignments = [];
  
  // Assign 12-hour shifts first (3 shifts per employee)
  if (groupedShifts[12]) {
    for (const employee of employees) {
      let assignedDays = 0;
      for (let day = 0; day < 7 && assignedDays < 3; day++) {
        const currentDate = format(addDays(weekStartDate, day), "yyyy-MM-dd");
        
        // Check if employee has time off
        const hasTimeOff = timeOffRequests.some(
          (request) =>
            request.employee_id === employee.id &&
            request.start_date <= currentDate &&
            request.end_date >= currentDate
        );

        if (!hasTimeOff) {
          const shift = groupedShifts[12][0]; // Use first 12-hour shift
          assignments.push({
            schedule_id: schedule.id,
            employee_id: employee.id,
            shift_id: shift.id,
            date: currentDate,
          });
          employeeHours[employee.id] += 12;
          assignedDays++;
        }
      }
    }
  }

  // Then assign 4-hour shifts to complete 40 hours
  if (groupedShifts[4]) {
    for (const employee of employees) {
      if (employeeHours[employee.id] === 36) {
        const currentDate = format(weekStartDate, "yyyy-MM-dd");
        const shift = groupedShifts[4][0]; // Use first 4-hour shift
        assignments.push({
          schedule_id: schedule.id,
          employee_id: employee.id,
          shift_id: shift.id,
          date: currentDate,
        });
        employeeHours[employee.id] += 4;
      }
    }
  }

  // Insert assignments
  await insertScheduleAssignments(assignments);

  return schedule;
};