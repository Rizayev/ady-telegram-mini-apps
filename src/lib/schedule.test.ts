import { describe, expect, it } from 'vitest'
import { dayTypeLabel, getBakuClockMinutes, getDayType, parseISODate, toISODate } from './calendar.js'
import {
  defaultSearchForRoute,
  destinationStationsForRoute,
  durationBetween,
  getFare,
  minutesToShortLabel,
  originStationsForRoute,
  searchDepartures,
  stationsForRoute,
  timeToMinutes,
} from './schedule.js'
import type { RouteId } from './types.js'

describe('schedule search', () => {
  it('returns sorted workday departures and marks the next train', () => {
    const results = searchDepartures({
      routeId: 'baki_pirshagi_sumqayit',
      from: 'Bakı',
      to: 'Sumqayıt',
      date: parseISODate('2026-07-09'),
      now: new Date('2026-07-09T08:00:00+04:00'),
    })

    expect(results[0]).toMatchObject({
      trainNumber: '6601',
      departAt: '06:37',
      arriveAt: '07:29',
      passed: true,
    })
    expect(results.find((departure) => departure.next)).toMatchObject({
      trainNumber: '6609',
      minutesUntilDeparture: 32,
    })
  })

  it('excludes trains that do not reach the requested destination', () => {
    const results = searchDepartures({
      routeId: 'baki_xirdalan_sumqayit',
      from: 'Bakı',
      to: 'Sumqayıt',
      date: parseISODate('2026-07-09'),
      now: new Date('2026-07-09T06:00:00+04:00'),
    })

    expect(results).toHaveLength(0)
  })

  it('can hide already passed trains', () => {
    const results = searchDepartures({
      routeId: 'baki_pirshagi_sumqayit',
      from: 'Bakı',
      to: 'Sumqayıt',
      date: parseISODate('2026-07-09'),
      now: new Date('2026-07-09T08:00:00+04:00'),
      includePassed: false,
    })

    expect(results[0]).toMatchObject({
      trainNumber: '6609',
      passed: false,
      next: true,
    })
  })

  it('finds reverse-direction departures', () => {
    const results = searchDepartures({
      routeId: 'baki_xirdalan_sumqayit',
      from: 'Xırdalan',
      to: 'Bakı',
      date: parseISODate('2026-07-09'),
      now: new Date('2026-07-09T07:00:00+04:00'),
    })

    expect(results[0]).toMatchObject({
      trainNumber: '6002',
      departAt: '07:16',
      arriveAt: '07:42',
    })
  })

  it('returns no departures for impossible station ordering', () => {
    expect(
      searchDepartures({
        routeId: 'baki_pirshagi_sumqayit',
        from: 'Bakı',
        to: 'Xırdalan',
        date: parseISODate('2026-07-09'),
      }),
    ).toEqual([])
  })

  it('finds fares independently from travel direction', () => {
    expect(getFare('baki_pirshagi_sumqayit', 'Sumqayıt', 'Bakı')).toEqual({
      distance: 49,
      fare: 1.2,
    })
  })

  it('returns null for unknown fare pairs', () => {
    expect(getFare('baki_xirdalan_sumqayit', 'Bakı', 'Koroğlu')).toBeNull()
  })

  it('classifies holidays as saturday or holiday schedules', () => {
    expect(getDayType(parseISODate('2026-07-09'))).toBe('workdays')
    expect(getDayType(parseISODate('2026-07-11'))).toBe('saturday_holiday')
    expect(getDayType(parseISODate('2026-06-26'))).toBe('saturday_holiday')
    expect(getDayType(parseISODate('2026-07-12'))).toBe('sunday')
  })

  it('formats day and duration labels for supported languages', () => {
    expect(dayTypeLabel('workdays', 'az')).toBe('İş günü')
    expect(dayTypeLabel('saturday_holiday', 'ru')).toBe('Суббота / праздник')
    expect(dayTypeLabel('sunday', 'en')).toBe('Sunday')
    expect(minutesToShortLabel(0, 'az')).toBe('indi')
    expect(minutesToShortLabel(0, 'ru')).toBe('сейчас')
    expect(minutesToShortLabel(0, 'en')).toBe('now')
    expect(minutesToShortLabel(8, 'ru')).toBe('8 мин')
    expect(minutesToShortLabel(8, 'en')).toBe('8 min')
    expect(minutesToShortLabel(75, 'en')).toBe('1h 15 min')
    expect(minutesToShortLabel(60, 'ru')).toBe('1 ч')
    expect(minutesToShortLabel(60, 'az')).toBe('1 saat')
    expect(durationBetween('23:50', '00:10')).toBe(20)
  })

  it('rejects malformed times', () => {
    expect(() => timeToMinutes('bad-time')).toThrow('Invalid time')
  })

  it('rejects malformed dates', () => {
    expect(() => parseISODate('bad-date')).toThrow('YYYY-MM-DD')
    expect(() => parseISODate('2026-02-31')).toThrow('YYYY-MM-DD')
  })

  it('formats current date and time in Baku timezone', () => {
    const bakuMidnight = new Date('2026-07-10T00:30:00+04:00')

    expect(toISODate(bakuMidnight)).toBe('2026-07-10')
    expect(getBakuClockMinutes(bakuMidnight)).toBe(30)
  })

  it('returns station options for a route', () => {
    expect(stationsForRoute('baki_xirdalan_sumqayit')).toEqual(
      expect.arrayContaining(['Bakı', 'Biləcəri', 'Dərnəgül', 'Xırdalan', 'Sumqayıt']),
    )
  })

  it('returns valid origin and destination options for route defaults', () => {
    const date = parseISODate('2026-07-09')

    expect(defaultSearchForRoute('baki_xirdalan_sumqayit', date)).toEqual({
      from: 'Bakı',
      to: 'Xırdalan',
    })
    expect(originStationsForRoute('baki_xirdalan_sumqayit', date)).toEqual(expect.arrayContaining(['Bakı', 'Xırdalan']))
    expect(destinationStationsForRoute('baki_xirdalan_sumqayit', 'Bakı', date)).toEqual(
      expect.arrayContaining(['Dərnəgül', 'Biləcəri', 'Xırdalan']),
    )
    expect(destinationStationsForRoute('baki_xirdalan_sumqayit', 'Bakı', date)).not.toContain('Sumqayıt')
    expect(destinationStationsForRoute('baki_xirdalan_sumqayit', 'Koroğlu', date)).toEqual([])
    expect(defaultSearchForRoute('unknown' as RouteId, date)).toEqual({ from: '', to: '' })
  })
})
