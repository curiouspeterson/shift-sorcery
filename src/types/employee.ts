export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  weekly_hours_limit: number;
  role: 'employee' | 'manager';
}

export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  day_of_week: number;
  shift_id: string;
}