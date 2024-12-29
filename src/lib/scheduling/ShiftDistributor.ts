import { Employee, Shift, ScheduleAssignment, EmployeeAvailability } from './types';
import { LongShiftDistributor } from './distributors/LongShiftDistributor';
import { RegularShiftDistributor } from './distributors/RegularShiftDistributor';
import { ShortShiftDistributor } from './distributors/ShortShiftDistributor';

export class ShiftDistributor {
  private longShiftDistributor: LongShiftDistributor;
  private regularShiftDistributor: RegularShiftDistributor;
  private shortShiftDistributor: ShortShiftDistributor;

  constructor() {
    this.longShiftDistributor = new LongShiftDistributor();
    this.regularShiftDistributor = new RegularShiftDistributor();
    this.shortShiftDistributor = new ShortShiftDistributor();
  }

  distributeLongShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    return this.longShiftDistributor.distributeShifts(
      date,
      scheduleId,
      employees,
      shifts,
      availability
    );
  }

  distributeRegularShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[],
    existingAssignments: ScheduleAssignment[]
  ): ScheduleAssignment[] {
    return this.regularShiftDistributor.distributeShifts(
      date,
      scheduleId,
      employees,
      shifts,
      availability,
      existingAssignments
    );
  }

  distributeShortShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[],
    existingAssignments: ScheduleAssignment[]
  ): ScheduleAssignment[] {
    return this.shortShiftDistributor.distributeShifts(
      date,
      scheduleId,
      employees,
      shifts,
      availability,
      existingAssignments
    );
  }

  distributeShifts(
    date: string,
    scheduleId: string,
    employees: Employee[],
    shifts: Shift[],
    availability: EmployeeAvailability[]
  ): ScheduleAssignment[] {
    const assignments: ScheduleAssignment[] = [];
    
    // Distribute long shifts first
    const longShiftAssignments = this.distributeLongShifts(
      date,
      scheduleId,
      employees,
      shifts,
      availability
    );
    assignments.push(...longShiftAssignments);

    // Then regular shifts
    const regularShiftAssignments = this.distributeRegularShifts(
      date,
      scheduleId,
      employees,
      shifts,
      availability,
      assignments
    );
    assignments.push(...regularShiftAssignments);

    // Finally short shifts
    const shortShiftAssignments = this.distributeShortShifts(
      date,
      scheduleId,
      employees,
      shifts,
      availability,
      assignments
    );
    assignments.push(...shortShiftAssignments);

    return assignments;
  }
}