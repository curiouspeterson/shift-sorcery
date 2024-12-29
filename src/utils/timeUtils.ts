export function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function normalizeMinutes(minutes: number, referenceTime: number = 0): number {
  while (minutes < referenceTime) minutes += 24 * 60;
  return minutes;
}

export function doesTimeRangeOverlap(
  shiftStart: number,
  shiftEnd: number,
  periodStart: number,
  periodEnd: number
): boolean {
  console.log(`\n⏰ Analyzing time overlap:
    Shift: ${Math.floor(shiftStart/60)}:${String(shiftStart%60).padStart(2, '0')} - ${Math.floor(shiftEnd/60)}:${String(shiftEnd%60).padStart(2, '0')}
    Period: ${Math.floor(periodStart/60)}:${String(periodStart%60).padStart(2, '0')} - ${Math.floor(periodEnd/60)}:${String(periodEnd%60).padStart(2, '0')}`);

  const normalizedShiftStart = normalizeMinutes(shiftStart, periodStart);
  const normalizedShiftEnd = normalizeMinutes(shiftEnd, normalizedShiftStart);
  const normalizedPeriodEnd = normalizeMinutes(periodEnd, periodStart);

  console.log(`Normalized times (in minutes from reference):
    Shift: ${normalizedShiftStart} - ${normalizedShiftEnd}
    Period: ${periodStart} - ${normalizedPeriodEnd}`);

  const overlaps = (
    (normalizedShiftStart <= normalizedPeriodEnd && normalizedShiftEnd >= periodStart) ||
    (normalizedShiftStart <= periodStart && normalizedShiftEnd >= periodStart)
  );

  console.log(`${overlaps ? '✅' : '❌'} Overlap result: ${overlaps}`);
  return overlaps;
}