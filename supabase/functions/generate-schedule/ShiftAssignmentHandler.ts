import { Employee, ScheduleAssignment } from './types.ts';

export class ShiftAssignmentHandler {
  private getEmployeeAssignedHours(
    employeeId: string,
    assignments: ScheduleAssignment[]
  ): number {
    return assignments
      .filter(a => a.employee_id === employeeId)
      .reduce((total, assignment) => total + 8, 0);
  }

  public assignEmployeesToShift(
    employees: Employee[],
    shift: any,
    scheduleId: string,
    date: string,
    assignments: ScheduleAssignment[],
    assignedEmployees: Set<string>
  ): ScheduleAssignment[] {
    const newAssignments: ScheduleAssignment[] = [];
    const maxEmployees = shift.max_employees || 1;
    let assignedCount = 0;

    console.log(`\n📋 Processing shift: ${shift.name}`);
    console.log(`Time: ${shift.start_time} - ${shift.end_time}`);
    console.log(`Required employees: ${maxEmployees}`);

    // Sort employees by their weekly hours (prefer those with fewer hours)
    const sortedEmployees = [...employees].sort((a, b) => {
      const hoursA = this.getEmployeeAssignedHours(a.id, assignments);
      const hoursB = this.getEmployeeAssignedHours(b.id, assignments);
      return hoursA - hoursB;
    });

    console.log('\n📊 Employee hours status:');
    sortedEmployees.forEach(emp => {
      const currentHours = this.getEmployeeAssignedHours(emp.id, assignments);
      console.log(`${emp.first_name}: ${currentHours}h / ${emp.weekly_hours_limit}h limit`);
    });

    for (const employee of sortedEmployees) {
      if (assignedCount >= maxEmployees) {
        console.log(`\n✋ Reached maximum employees (${maxEmployees}) for shift ${shift.name}`);
        break;
      }

      const currentHours = this.getEmployeeAssignedHours(employee.id, assignments);
      const shiftHours = this.calculateShiftHours(shift);
      
      console.log(`\n🧮 Evaluating ${employee.first_name} for ${shift.name}:`);
      console.log(`Current hours: ${currentHours}h`);
      console.log(`Shift duration: ${shiftHours}h`);
      console.log(`Weekly limit: ${employee.weekly_hours_limit}h`);
      
      if ((currentHours + shiftHours) <= employee.weekly_hours_limit) {
        newAssignments.push({
          schedule_id: scheduleId,
          employee_id: employee.id,
          shift_id: shift.id,
          date: date
        });
        assignedEmployees.add(employee.id);
        assignedCount++;
        
        console.log(`✅ Assigned ${employee.first_name} to ${shift.name}`);
        console.log(`New weekly hours: ${currentHours + shiftHours}h`);
      } else {
        console.log(`❌ Skip: Would exceed weekly hours limit (${currentHours + shiftHours}h > ${employee.weekly_hours_limit}h)`);
      }
    }

    if (assignedCount < maxEmployees) {
      console.log(`\n⚠️ Warning: Could not fill all positions for ${shift.name}`);
      console.log(`Assigned: ${assignedCount}/${maxEmployees} employees`);
    }

    return newAssignments;
  }

  private calculateShiftHours(shift: any): number {
    const start = new Date(`2000-01-01T${shift.start_time}`);
    let end = new Date(`2000-01-01T${shift.end_time}`);
    
    if (end <= start) {
      end = new Date(`2000-01-02T${shift.end_time}`);
    }
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }
}