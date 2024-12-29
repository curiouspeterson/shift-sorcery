export const SCHEDULING_CONSTANTS = {
  MAX_SCHEDULING_ATTEMPTS: 15,
  MIN_HOURS_PER_WEEK: 24,
  MAX_HOURS_PER_WEEK: 40,
  MIN_STAFF_PERCENTAGE: 85, // Increased from 70 to ensure better coverage
  MAX_CONSECUTIVE_DAYS: 5,
  SHIFT_PRIORITY: {
    'Day Shift Early': 1, // Highest priority
    'Day Shift': 2,
    'Swing Shift': 3,
    'Graveyard': 4
  },
  SHIFT_DURATIONS: {
    FULL: 12,
    STANDARD: 10,
    HALF: 6,
    SHORT: 4
  }
};