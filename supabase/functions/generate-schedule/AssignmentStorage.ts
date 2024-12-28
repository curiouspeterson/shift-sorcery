import { ShiftAssignment } from './types.ts';

export class AssignmentStorage {
  private assignments: ShiftAssignment[] = [];

  public addAssignment(assignment: ShiftAssignment): void {
    this.assignments.push(assignment);
  }

  public getAssignments(): ShiftAssignment[] {
    return [...this.assignments];
  }

  public reset(): void {
    this.assignments = [];
  }
}