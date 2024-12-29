export interface CoverageRequirement {
  id: string;
  start_time: string;
  end_time: string;
  min_employees: number;
  is_peak_period?: boolean;
  required_role?: string;
}

export interface CoverageStatus {
  [key: string]: {
    required: number;
    assigned: number;
    isMet: boolean;
  };
}