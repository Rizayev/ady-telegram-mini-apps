import type { DayType } from './types.js'

const bakuTimeZone = 'Asia/Baku'
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

const nonWorkingDays = new Set([
  '2025-12-31',
  '2026-01-01',
  '2026-01-02',
  '2026-01-20',
  '2026-03-08',
  '2026-03-09',
  '2026-03-20',
  '2026-03-21',
  '2026-03-22',
  '2026-03-23',
  '2026-03-24',
  '2026-03-25',
  '2026-03-26',
  '2026-03-27',
  '2026-03-30',
  '2026-05-09',
  '2026-05-11',
  '2026-05-27',
  '2026-05-28',
  '2026-05-29',
  '2026-06-15',
  '2026-06-26',
  '2026-11-08',
  '2026-11-09',
  '2026-11-10',
  '2026-12-31',
])

function getBakuDateParts(date: Date): { year: string; month: string; day: string; hour: string; minute: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: bakuTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  }
}

export function toISODate(date: Date): string {
  const parts = getBakuDateParts(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function parseISODate(value: string): Date {
  if (!isoDatePattern.test(value)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

  if (toISODate(date) !== value) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }

  return date
}

export function getBakuClockMinutes(date: Date): number {
  const parts = getBakuDateParts(date)
  return Number(parts.hour) * 60 + Number(parts.minute)
}

function dayOfISODate(value: string): number {
  return new Date(`${value}T12:00:00.000Z`).getUTCDay()
}

export function getDayType(date: Date): DayType {
  const dateKey = toISODate(date)
  const day = dayOfISODate(dateKey)

  if (day === 0) {
    return 'sunday'
  }

  if (day === 6 || nonWorkingDays.has(dateKey)) {
    return 'saturday_holiday'
  }

  return 'workdays'
}

export function dayTypeLabel(dayType: DayType, lang: 'az' | 'ru' | 'en'): string {
  const labels = {
    az: {
      workdays: 'İş günü',
      saturday_holiday: 'Şənbə / bayram',
      sunday: 'Bazar',
    },
    ru: {
      workdays: 'Рабочий день',
      saturday_holiday: 'Суббота / праздник',
      sunday: 'Воскресенье',
    },
    en: {
      workdays: 'Workday',
      saturday_holiday: 'Saturday / holiday',
      sunday: 'Sunday',
    },
  } satisfies Record<'az' | 'ru' | 'en', Record<DayType, string>>

  return labels[lang][dayType]
}
