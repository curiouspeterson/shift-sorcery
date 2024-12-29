import { getShiftType } from './shiftUtils';

export function sortAssignmentsByShiftType(assignments: any[]) {
  const shiftOrder = {
    "Day Shift Early": 1,
    "Day Shift": 2,
    "Swing Shift": 3,
    "Graveyard": 4
  };

  return [...assignments].sort((a, b) => {
    const aType = getShiftType(a.shift.start_time);
    const bType = getShiftType(b.shift.start_time);
    
    // First sort by shift type
    const typeComparison = (shiftOrder[aType as keyof typeof shiftOrder] || 0) - 
                          (shiftOrder[bType as keyof typeof shiftOrder] || 0);
    
    if (typeComparison !== 0) return typeComparison;
    
    // If same shift type, sort by start time
    const getMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    return getMinutes(a.shift.start_time) - getMinutes(b.shift.start_time);
  });
}