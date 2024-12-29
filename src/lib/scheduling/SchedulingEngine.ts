import { format, addDays, startOfWeek } from 'date-fns';
import {
  SchedulingContext,
  SchedulingResult,
  ScheduleAssignment,
  Employee,
  Shift,
  CoverageStatus
} from './types';
import { ShiftDistributor } from './ShiftDistributor';
import { CoverageCalculator } from './CoverageCalculator';
import { EmployeeScorer } from './EmployeeScorer';

export class SchedulingEngine {
  private shiftDistributor: ShiftDistributor;
  private coverageCalculator: CoverageCalculator;
  private employeeScorer: EmployeeScorer;

  constructor() {
    this.shiftDistributor = new ShiftDistributor();
    this.coverageCalculator = new CoverageCalculator();
    this.employeeScorer = new EmployeeScorer();
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
        const dayOfWeek = addDays(weekStartDate, i).getDay();
        
        console.log(`\n📅 Processing ${format(addDays(weekStartDate, i), 'EEEE, MMM d')}`);

        // Get available employees for this day
        const availableEmployees = this.getAvailableEmployees(
          context,
          dayOfWeek,
          currentDate
        );

        // Calculate coverage requirements
        const coverage = this.coverageCalculator.calculateRequirements(
          context.coverageRequirements,
          dayOfWeek
        );

        // Distribute shifts to meet coverage
        const dailyAssignments = this.shiftDistributor.distributeShifts(
          context.shifts,
          availableEmployees,
          coverage,
          scheduleId,
          currentDate
        );

        assignments.push(...dailyAssignments);

        // Check if coverage requirements were met
        const coverageStatus = this.coverageCalculator.checkCoverage(
          dailyAssignments,
          coverage
        );

        if (!this.isCoverageMet(coverageStatus)) {
          messages.push(`⚠️ Coverage requirements not fully met for ${currentDate}`);
          success = false;
        }
      }

      return {
        success,
        assignments,
        coverage: this.calculateFinalCoverage(assignments, context),
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

  private calculateFinalCoverage(
    assignments: ScheduleAssignment[],
    context: SchedulingContext
  ): CoverageStatus {
    return this.coverageCalculator.calculateFinalCoverage(
      assignments,
      context.shifts,
      context.coverageRequirements
    );
  }
}