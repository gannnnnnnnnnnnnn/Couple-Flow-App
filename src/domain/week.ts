const utcDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value;

  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    weekday: value('weekday') ?? 'Mon',
  };
}

export function getWeekStartDate(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    parts.weekday,
  );
  const mondayOffset = weekdayIndex === 0 ? -6 : 1 - weekdayIndex;
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  utcDate.setUTCDate(utcDate.getUTCDate() + mondayOffset);
  return utcDateFormatter.format(utcDate);
}

export function addWeeks(weekStartDate: string, amount: number) {
  const date = new Date(`${weekStartDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount * 7);
  return utcDateFormatter.format(date);
}

export function getNextWeekStartDate(weekStartDate: string) {
  return addWeeks(weekStartDate, 1);
}

export function getPreviousWeekStartDate(weekStartDate: string) {
  return addWeeks(weekStartDate, -1);
}

export function formatWeekLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}
