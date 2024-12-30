export function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function normalizeMinutes(minutes: number, referenceMinutes: number): number {
  if (minutes <= referenceMinutes) {
    return minutes + (24 * 60); // Add 24 hours worth of minutes
  }
  return minutes;
}

export function doesTimeRangeOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  // Handle overnight ranges
  if (end1 <= start1) end1 += 24 * 60;
  if (end2 <= start2) end2 += 24 * 60;
  
  return start1 < end2 && end1 > start2;
}