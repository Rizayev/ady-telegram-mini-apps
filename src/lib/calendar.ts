import type { DayType } from './types.js'

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

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }

  return new Date(year, month - 1, day)
}

export function getDayType(date: Date): DayType {
  const dateKey = toISODate(date)
  const day = date.getDay()

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
