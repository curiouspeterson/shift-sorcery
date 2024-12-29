import { Employee, Shift } from './types';

export class EmployeeScorer {
  private readonly SCORE_WEIGHTS = {
    HOURS_UNDER_MIN: 50,    // Encourage assigning to employees under minimum hours
    HOURS_OVER_MAX: -100,   // Heavily penalize exceeding maximum hours
    CONSECUTIVE_DAYS: -15,  // Penalty for each consecutive day worked
    PREFERRED_SHIFT: 20,    // Bonus for preferred shift type
    AVAILABILITY_MATCH: 30  // Bonus for availability match
  };

  public scoreEmployee(
    employee: Employee,
    shift: Shift,
    currentWeeklyHours: number,
    consecutiveDays: number
  ): number {
    let score = 100;

    // Hours-based scoring
    if (currentWeeklyHours < 24) { // Minimum weekly hours
      score += this.SCORE_WEIGHTS.HOURS_UNDER_MIN;
    }

    if ((currentWeeklyHours + shift.duration_hours) > employee.weekly_hours_limit) {
      score += this.SCORE_WEIGHTS.HOURS_OVER_MAX;
    }

    // Consecutive days penalty
    score += consecutiveDays * this.SCORE_WEIGHTS.CONSECUTIVE_DAYS;

    // Normalize score to 0-100 range
    return Math.max(0, Math.min(100, score));
  }
}