import { getBakuClockMinutes, getDayType, toISODate } from './calendar.js'
import { routeOptions, scheduleData } from './scheduleData.js'
import type {
  DaySchedule,
  Departure,
  DirectionId,
  FareInfo,
  RouteId,
  ScheduleSearchParams,
  StopTime,
  DayType,
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

function resolveDayType(date: Date, dayType?: DayType): DayType {
  return dayType ?? getDayType(date)
}

export function originStationsForRoute(routeId: RouteId, date: Date, dayTypeOverride?: DayType): readonly string[] {
  const dayType = resolveDayType(date, dayTypeOverride)
  const route = scheduleData.routesData[routeId]
  const origins = new Set<string>()

  for (const schedule of Object.values(route.directions).map((direction) => direction[dayType])) {
    schedule.stations.forEach((station, stationIndex) => {
      const canDepart = schedule.trains.some((train) => {
        const departAt = train.times[stationIndex]
        const hasLaterArrival = train.times.slice(stationIndex + 1).some(Boolean)
        return Boolean(departAt && hasLaterArrival)
      })

      if (canDepart) {
        origins.add(station)
      }
    })
  }

  return [...origins].sort((a, b) => a.localeCompare(b, 'az'))
}

export function destinationStationsForRoute(routeId: RouteId, from: string, date: Date, dayTypeOverride?: DayType): readonly string[] {
  const dayType = resolveDayType(date, dayTypeOverride)
  const route = scheduleData.routesData[routeId]
  const destinations = new Set<string>()

  for (const schedule of Object.values(route.directions).map((direction) => direction[dayType])) {
    const fromIndex = schedule.stations.indexOf(from)
    if (fromIndex === -1) {
      continue
    }

    schedule.stations.slice(fromIndex + 1).forEach((station, offset) => {
      const stationIndex = fromIndex + 1 + offset
      const hasTrip = schedule.trains.some((train) => train.times[fromIndex] && train.times[stationIndex])
      if (hasTrip) {
        destinations.add(station)
      }
    })
  }

  return [...destinations].sort((a, b) => a.localeCompare(b, 'az'))
}

export function defaultSearchForRoute(routeId: RouteId, date: Date, dayTypeOverride?: DayType): { from: string; to: string } {
  const option = routeOptions.find((route) => route.id === routeId)
  if (!option) {
    return { from: '', to: '' }
  }

  const origins = originStationsForRoute(routeId, date, dayTypeOverride)
  const preferredFrom = origins.includes(option.defaultFrom) ? option.defaultFrom : origins[0]
  const destinations = preferredFrom ? destinationStationsForRoute(routeId, preferredFrom, date, dayTypeOverride) : []
  const preferredTo = destinations.includes(option.defaultTo) ? option.defaultTo : destinations[0]

  return {
    from: preferredFrom ?? '',
    to: preferredTo ?? '',
  }
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
  return toISODate(a) === toISODate(b)
}

export function searchDepartures(params: ScheduleSearchParams): readonly Departure[] {
  const now = params.now ?? new Date()
  const includePassed = params.includePassed ?? true
  const dayType = resolveDayType(params.date, params.dayType)
  const routeIds = params.routeId ? [params.routeId] : routeOptions.map((route) => route.id)
  const currentMinute = getBakuClockMinutes(now)
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
