import { 
  SchedulingContext, 
  SchedulingResult, 
  ScheduleAssignment 
} from './types';
import { CoverageCalculator } from './CoverageCalculator';
import { ShiftDistributor } from './ShiftDistributor';
import { format, addDays } from 'date-fns';

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

        // Distribute shifts to meet coverage
        const dailyAssignments = this.shiftDistributor.distributeShifts(
          currentDate,
          scheduleId,
          availableEmployees,
          context.shifts,
          context.availability
        );

        assignments.push(...dailyAssignments);

        // Check coverage requirements
        const coverage = this.coverageCalculator.calculateCoverage(
          dailyAssignments,
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