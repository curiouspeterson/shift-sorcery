import { SchedulingContext, SchedulingResult, ScheduleAssignment, CoverageStatus } from './types.ts';
import { ShiftAssignmentManager } from './ShiftAssignmentManager.ts';
import { ShiftRequirementsManager } from './ShiftRequirementsManager.ts';
import { SchedulingStrategy } from './SchedulingStrategy.ts';
import { format, addDays } from 'https://esm.sh/date-fns@3.3.1';

export class SchedulingEngine {
  private shiftAssignmentManager: ShiftAssignmentManager;
  private requirementsManager: ShiftRequirementsManager;
  private strategy: SchedulingStrategy;

  constructor() {
    this.requirementsManager = new ShiftRequirementsManager([]);
    this.shiftAssignmentManager = new ShiftAssignmentManager(this.requirementsManager);
    this.strategy = new SchedulingStrategy(this.shiftAssignmentManager, this.requirementsManager);
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
        const coverage = this.requirementsManager.calculateRequirements(
          context.coverageRequirements,
          dayOfWeek
        );

        // Distribute shifts to meet coverage
        const dailyAssignments = await this.strategy.assignShiftsForDay(
          currentDate,
          {
            employees: availableEmployees,
            shifts: context.shifts,
            availability: context.availability
          },
          scheduleId
        );

        assignments.push(...dailyAssignments);

        // Check if coverage requirements were met
        const coverageStatus = this.shiftAssignmentManager.checkCoverage(
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
    return this.requirementsManager.calculateFinalCoverage(
      assignments,
      context.shifts,
      context.coverageRequirements
    );
  }
}