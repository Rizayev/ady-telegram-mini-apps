import { getDayType } from './calendar.js'
import { routeOptions, scheduleData } from './scheduleData.js'
import type {
  DaySchedule,
  Departure,
  DirectionId,
  FareInfo,
  RouteId,
  ScheduleSearchParams,
  StopTime,
} from './types.js'

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error(`Invalid time: ${value}`)
  }

  return hours * 60 + minutes
}

export function minutesToShortLabel(minutes: number, lang: 'az' | 'ru' | 'en'): string {
  if (minutes <= 0) {
    return lang === 'ru' ? 'сейчас' : lang === 'en' ? 'now' : 'indi'
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) {
    return lang === 'ru' ? `${rest} мин` : lang === 'en' ? `${rest} min` : `${rest} dəq`
  }

  const minutePart = rest > 0 ? ` ${rest}${lang === 'ru' ? ' мин' : lang === 'en' ? ' min' : ' dəq'}` : ''
  return lang === 'ru' ? `${hours} ч${minutePart}` : lang === 'en' ? `${hours}h${minutePart}` : `${hours} saat${minutePart}`
}

export function durationBetween(departAt: string, arriveAt: string): number {
  const depart = timeToMinutes(departAt)
  const arrive = timeToMinutes(arriveAt)
  const duration = arrive - depart

  return duration >= 0 ? duration : duration + 24 * 60
}

export function uniqueStations(routeId?: RouteId): readonly string[] {
  const routeIds = routeId ? [routeId] : routeOptions.map((route) => route.id)
  const stations = new Set<string>()

  for (const id of routeIds) {
    const route = scheduleData.routesData[id]
    for (const direction of Object.values(route.directions)) {
      for (const schedule of Object.values(direction)) {
        for (const station of schedule.stations) {
          stations.add(station)
        }
      }
    }
  }

  return [...stations].sort((a, b) => a.localeCompare(b, 'az'))
}

export function stationsForRoute(routeId: RouteId): readonly string[] {
  return uniqueStations(routeId)
}

export function getFare(routeId: RouteId, from: string, to: string): FareInfo | null {
  const route = scheduleData.routesData[routeId]
  const fares = scheduleData.fareData[route.fareInfoKey]
  const key = [from, to].sort((a, b) => a.localeCompare(b, 'az')).join('|')

  return fares?.[key] ?? null
}

function createStops(schedule: DaySchedule, times: readonly (string | null)[]): readonly StopTime[] {
  return schedule.stations.flatMap((station, index) => {
    const time = times[index]
    return time ? [{ station, time }] : []
  })
}

function routeMatches(schedule: DaySchedule, from: string, to: string): { fromIndex: number; toIndex: number } | null {
  const fromIndex = schedule.stations.indexOf(from)
  const toIndex = schedule.stations.indexOf(to)

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return null
  }

  return { fromIndex, toIndex }
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function searchDepartures(params: ScheduleSearchParams): readonly Departure[] {
  const now = params.now ?? new Date()
  const includePassed = params.includePassed ?? true
  const dayType = getDayType(params.date)
  const routeIds = params.routeId ? [params.routeId] : routeOptions.map((route) => route.id)
  const currentMinute = now.getHours() * 60 + now.getMinutes()
  const isToday = sameCalendarDay(params.date, now)

  const departures = routeIds.flatMap((routeId) => {
    const route = scheduleData.routesData[routeId]

    return (Object.entries(route.directions) as [DirectionId, typeof route.directions[DirectionId]][]).flatMap(
      ([directionId, schedules]) => {
        const schedule = schedules[dayType]
        const match = routeMatches(schedule, params.from, params.to)

        if (!match) {
          return []
        }

        return schedule.trains.flatMap((train) => {
          const departAt = train.times[match.fromIndex]
          const arriveAt = train.times[match.toIndex]

          if (!departAt || !arriveAt) {
            return []
          }

          const departureMinute = timeToMinutes(departAt)
          const passed = isToday && departureMinute < currentMinute
          if (passed && !includePassed) {
            return []
          }

          const intermediateStops = schedule.stations.slice(match.fromIndex + 1, match.toIndex).flatMap((station, offset) => {
            const time = train.times[match.fromIndex + 1 + offset]
            return time ? [{ station, time }] : []
          })

          return [
            {
              routeId,
              routeName: route.name,
              directionId,
              trainNumber: train.number,
              from: params.from,
              to: params.to,
              departAt,
              arriveAt,
              durationMinutes: durationBetween(departAt, arriveAt),
              minutesUntilDeparture: isToday ? departureMinute - currentMinute : null,
              passed,
              next: false,
              note: train.note,
              intermediateStops,
              allStops: createStops(schedule, train.times),
              fareInfo: getFare(routeId, params.from, params.to),
            } satisfies Departure,
          ]
        })
      },
    )
  })

  const sorted = departures.toSorted((a, b) => timeToMinutes(a.departAt) - timeToMinutes(b.departAt))
  const nextIndex = sorted.findIndex((departure) => !departure.passed)

  return sorted.map((departure, index) => ({
    ...departure,
    next: index === nextIndex,
  }))
}
