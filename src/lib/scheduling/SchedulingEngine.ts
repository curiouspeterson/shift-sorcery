import { format, addDays } from 'date-fns';
import { 
  SchedulingContext, 
  SchedulingResult, 
  ScheduleAssignment,
  Employee,
  CoverageStatus
} from './types';
import { CoverageCalculator } from './CoverageCalculator';
import { ShiftDistributor } from './ShiftDistributor';

export class SchedulingEngine {
  private coverageCalculator: CoverageCalculator;
  private shiftDistributor: ShiftDistributor;

  constructor() {
    this.coverageCalculator = new CoverageCalculator();
    this.shiftDistributor = new ShiftDistributor();
  }

  public async generateSchedule(
    context: SchedulingContext,
    weekStartDate: Date,
    scheduleId: string
  ): Promise<SchedulingResult> {
    console.log('🚀 Starting schedule generation for week:', format(weekStartDate, 'yyyy-MM-dd'));
    
    const assignments: ScheduleAssignment[] = [];
    const messages: string[] = [];
    let success = true;

    try {
      // First, group employees by preferred shift pattern (12hr vs 10hr)
      const employeeGroups = this.groupEmployeesByShiftPattern(context.employees);
      console.log('👥 Employee groups:', {
        twelveHourPattern: employeeGroups.twelveHour.length,
        tenHourPattern: employeeGroups.tenHour.length
      });

      // Process each day of the week
      for (let i = 0; i < 7; i++) {
        const currentDate = format(addDays(weekStartDate, i), 'yyyy-MM-dd');
        console.log(`\n📅 Processing ${format(addDays(weekStartDate, i), 'EEEE, MMM d')}`);

        // Get available employees for this day
        const availableEmployees = this.getAvailableEmployees(
          context,
          addDays(weekStartDate, i).getDay(),
          currentDate
        );

        // First, assign 12-hour shifts to ensure core coverage
        const longShiftAssignments = await this.shiftDistributor.distributeLongShifts(
          currentDate,
          scheduleId,
          employeeGroups.twelveHour,
          context.shifts,
          context.availability
        );

        assignments.push(...longShiftAssignments);

        // Then, fill gaps with 10-hour shifts
        const regularShiftAssignments = await this.shiftDistributor.distributeRegularShifts(
          currentDate,
          scheduleId,
          employeeGroups.tenHour,
          context.shifts,
          context.availability,
          longShiftAssignments
        );

        assignments.push(...regularShiftAssignments);

        // Finally, add 4-hour shifts where needed to meet minimum staffing
        const shortShiftAssignments = await this.shiftDistributor.distributeShortShifts(
          currentDate,
          scheduleId,
          availableEmployees,
          context.shifts,
          context.availability,
          [...longShiftAssignments, ...regularShiftAssignments]
        );

        assignments.push(...shortShiftAssignments);

        // Check coverage requirements
        const coverage = this.coverageCalculator.calculateCoverage(
          [...longShiftAssignments, ...regularShiftAssignments, ...shortShiftAssignments],
          context.shifts,
          context.coverageRequirements
        );

        if (!this.isCoverageMet(coverage)) {
          messages.push(`⚠️ Coverage requirements not fully met for ${currentDate}`);
          success = false;
        }
      }

      const finalCoverage = this.coverageCalculator.calculateCoverage(
        assignments,
        context.shifts,
        context.coverageRequirements
      );

      return {
        success,
        assignments,
        coverage: finalCoverage,
        messages
      };

    } catch (error) {
      console.error('❌ Error generating schedule:', error);
      throw error;
    }
  }

  private groupEmployeesByShiftPattern(employees: Employee[]): {
    twelveHour: Employee[];
    tenHour: Employee[];
  } {
    // For now, split employees evenly between patterns
    // This could be enhanced to use employee preferences
    const sorted = [...employees].sort(() => Math.random() - 0.5);
    const midpoint = Math.floor(sorted.length / 2);
    
    return {
      twelveHour: sorted.slice(0, midpoint),
      tenHour: sorted.slice(midpoint)
    };
  }

  private getAvailableEmployees(
    context: SchedulingContext,
    dayOfWeek: number,
    date: string
  ): Employee[] {
    return context.employees.filter(employee => {
      // Check if employee has time off
      const hasTimeOff = context.timeOffRequests.some(
        request =>
          request.employee_id === employee.id &&
          request.status === 'approved' &&
          date >= request.start_date &&
          date <= request.end_date
      );

      if (hasTimeOff) {
        return false;
      }

      // Check if employee has availability
      const hasAvailability = context.availability.some(
        avail =>
          avail.employee_id === employee.id &&
          avail.day_of_week === dayOfWeek
      );

      return hasAvailability;
    });
  }

  private isCoverageMet(coverage: CoverageStatus): boolean {
    return Object.values(coverage).every(status => status.isMet);
  }
}