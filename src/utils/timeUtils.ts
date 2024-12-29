export function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function doesTimeRangeOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  // Handle overnight shifts
  if (end1 < start1) end1 += 24 * 60;
  if (end2 < start2) end2 += 24 * 60;

  return start1 < end2 && end1 > start2;
}

export function calculateShiftDuration(startTime: string, endTime: string): number {
  const start = parseTime(startTime);
  let end = parseTime(endTime);
  
  if (end <= start) {
    end += 24 * 60;
  }
  
  return (end - start) / 60;
}