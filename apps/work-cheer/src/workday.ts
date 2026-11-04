export interface Settings {
  start: string
  end: string
  breakStart: string
  breakEnd: string
  monthlySalary: number
  yearEndBonus: number
}

export interface DailyReward {
  name: string
  cost: number
}

export const defaults: Settings = {
  start: '09:00',
  end: '18:00',
  breakStart: '12:00',
  breakEnd: '13:30',
  monthlySalary: 3000,
  yearEndBonus: 0,
}

const SECONDS_PER_HOUR = 3600
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function secondsAt(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * SECONDS_PER_HOUR + minute * 60
}

export function validateSettings(value: unknown): value is Settings {
  if (typeof value !== 'object' || value === null) return false
  const { start, end, breakStart, breakEnd, monthlySalary, yearEndBonus } = value as Partial<Settings>
  return typeof start === 'string' && typeof end === 'string' &&
    typeof breakStart === 'string' && typeof breakEnd === 'string' &&
    [start, end, breakStart, breakEnd].every((time) => TIME.test(time)) &&
    start < end && start <= breakStart && breakStart <= breakEnd && breakEnd <= end &&
    secondsAt(end) - secondsAt(start) > secondsAt(breakEnd) - secondsAt(breakStart) &&
    typeof monthlySalary === 'number' && monthlySalary > 0 && monthlySalary <= 1_000_000_000 &&
    typeof yearEndBonus === 'number' && yearEndBonus >= 0 && yearEndBonus <= 1_000_000_000
}

export function validateReward(value: unknown): value is DailyReward {
  if (typeof value !== 'object' || value === null) return false
  const { name, cost } = value as Partial<DailyReward>
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 40 &&
    typeof cost === 'number' && cost >= 0.01 && cost <= 1_000_000
}

function isWeekday(date: Date) {
  return date.getDay() >= 1 && date.getDay() <= 5
}

export function migrateSettings(value: unknown, date: Date): Settings | null {
  if (validateSettings(value)) return value
  if (typeof value !== 'object' || value === null || !('hourlyRate' in value)) return null
  const { hourlyRate, ...oldSettings } = value
  if (typeof hourlyRate !== 'number' || !(hourlyRate > 0 && hourlyRate <= 1_000_000)) return null
  const next = { ...oldSettings, monthlySalary: defaults.monthlySalary, yearEndBonus: 0 }
  if (!validateSettings(next)) return null
  const { shiftHours, monthWorkdays } = getWorkday(date, next)
  return { ...next, monthlySalary: Math.max(0.01, Math.round(hourlyRate * shiftHours * monthWorkdays * 100) / 100) }
}

export function getWorkday(date: Date, settings: Settings) {
  const start = secondsAt(settings.start)
  const end = secondsAt(settings.end)
  const breakStart = secondsAt(settings.breakStart)
  const breakEnd = secondsAt(settings.breakEnd)
  const time = date.getHours() * SECONDS_PER_HOUR + date.getMinutes() * 60 + date.getSeconds()
  const weekday = isWeekday(date)
  const todaySeconds = weekday
    ? Math.max(0, Math.min(time, breakStart) - start) + Math.max(0, Math.min(time, end) - breakEnd)
    : 0
  const shiftSeconds = end - start - (breakEnd - breakStart)

  const monthDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  let monthWorkdays = 0
  let priorWorkdays = 0
  for (let day = 1; day <= monthDays; day++) {
    if (!isWeekday(new Date(date.getFullYear(), date.getMonth(), day))) continue
    monthWorkdays++
    if (day < date.getDate()) priorWorkdays++
  }

  const fullDayPay = (settings.monthlySalary + settings.yearEndBonus / 12) / monthWorkdays
  const perSecond = fullDayPay / shiftSeconds
  const todayPay = todaySeconds * perSecond
  let phase: 'working' | 'before' | 'break' | 'done' | 'weekend' = 'working'
  if (!weekday) phase = 'weekend'
  else if (time < start) phase = 'before'
  else if (time >= end) phase = 'done'
  else if (time >= breakStart && time < breakEnd) phase = 'break'

  return {
    phase,
    untilStart: Math.max(0, start - time),
    untilEnd: Math.max(0, end - time),
    untilBreakEnds: Math.max(0, breakEnd - time),
    shiftHours: shiftSeconds / SECONDS_PER_HOUR,
    workedHours: todaySeconds / SECONDS_PER_HOUR,
    progress: todaySeconds / shiftSeconds,
    monthWorkdays,
    hourlyRate: perSecond * SECONDS_PER_HOUR,
    perSecond,
    todayPay,
    monthPay: priorWorkdays * fullDayPay + todayPay,
    fullDayPay,
  }
}
