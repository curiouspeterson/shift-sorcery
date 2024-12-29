import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from './types.ts';
import { AvailabilityChecker } from './AvailabilityChecker.ts';
import { ShiftAssignmentHandler } from './ShiftAssignmentHandler.ts';

export class ShiftDistributor {
  private availabilityChecker: AvailabilityChecker;
  private assignmentHandler: ShiftAssignmentHandler;

  constructor() {
    this.availabilityChecker = new AvailabilityChecker();
    this.assignmentHandler = new ShiftAssignmentHandler();
  }

  distributeShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    console.log(`\n🔄 Starting shift distribution for date: ${date}`);
    console.log(`Found ${employees.length} employees and ${shifts.length} shifts`);
    console.log('Available employees:', employees.map(e => `${e.first_name} (${e.weekly_hours_limit}h limit)`));
    
    const assignments: ScheduleAssignment[] = [];
    const dayOfWeek = new Date(date).getDay();
    const assignedEmployees = new Set<string>();

    // Sort shifts by priority (max employees needed and start time)
    const sortedShifts = [...shifts].sort((a, b) => {
      const maxEmployeesA = a.max_employees || 1;
      const maxEmployeesB = b.max_employees || 1;
      if (maxEmployeesB !== maxEmployeesA) {
        return maxEmployeesB - maxEmployeesA;
      }

      const timeA = new Date(`2000-01-01T${a.start_time}`).getTime();
      const timeB = new Date(`2000-01-01T${b.start_time}`).getTime();
      return timeA - timeB;
    });

    console.log('\n📋 Shifts to process:', sortedShifts.map(s => 
      `${s.name} (${s.start_time}-${s.end_time}, needs ${s.max_employees || 1} employees)`
    ));

    for (const shift of sortedShifts) {
      // Get available employees for this shift
      const availableEmployees = employees.filter(employee =>
        this.availabilityChecker.isEmployeeAvailable(
          employee,
          shift,
          availability,
          dayOfWeek,
          assignedEmployees
        )
      );

      console.log(`\n👥 Found ${availableEmployees.length} available employees for shift ${shift.name}`);

      // Assign employees to the shift
      const shiftAssignments = this.assignmentHandler.assignEmployeesToShift(
        availableEmployees,
        shift,
        scheduleId,
        date,
        assignments,
        assignedEmployees
      );

      assignments.push(...shiftAssignments);
    }

    console.log(`\n📊 Final assignments for ${date}:`, assignments.length);
    return assignments;
  }
}