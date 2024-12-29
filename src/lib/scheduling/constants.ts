export const SCHEDULING_CONSTANTS = {
  MAX_SCHEDULING_ATTEMPTS: 20,
  MIN_HOURS_PER_WEEK: 24,
  MAX_HOURS_PER_WEEK: 40,
  MIN_STAFF_PERCENTAGE: 90,
  MAX_CONSECUTIVE_DAYS: 5,
  SHIFT_PRIORITY: {
    'Graveyard': 1,      // Highest priority
    'Day Shift Early': 2,
    'Day Shift': 3,
    'Swing Shift': 4     // Lowest priority
  },
  SHIFT_DURATIONS: {
    FULL: 12,
    STANDARD: 10,
    HALF: 6,
    SHORT: 4
  },
  MIN_STAFF: {
    'Graveyard': 6,
    'Day Shift Early': 7,
    'Day Shift': 8,
    'Swing Shift': 6
  }
};