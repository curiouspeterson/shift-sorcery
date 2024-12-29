export const SCHEDULING_CONSTANTS = {
  MAX_SCHEDULING_ATTEMPTS: 20, // Increased from 15
  MIN_HOURS_PER_WEEK: 24,
  MAX_HOURS_PER_WEEK: 40,
  MIN_STAFF_PERCENTAGE: 90, // Increased from 85
  MAX_CONSECUTIVE_DAYS: 5,
  SHIFT_PRIORITY: {
    'Day Shift Early': 1,
    'Day Shift': 2,
    'Swing Shift': 3,
    'Graveyard': 4
  },
  SHIFT_DURATIONS: {
    FULL: 12,
    STANDARD: 10,
    HALF: 6,
    SHORT: 4
  },
  MIN_STAFF: {
    'Day Shift Early': 6,
    'Day Shift': 8,
    'Swing Shift': 7,
    'Graveyard': 6
  }
};