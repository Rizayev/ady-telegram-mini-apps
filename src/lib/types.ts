export type DayType = 'workdays' | 'saturday_holiday' | 'sunday'

export type DirectionId = 'baki_to_sumqayit' | 'sumqayit_to_baki'

export type RouteId = 'baki_pirshagi_sumqayit' | 'baki_xirdalan_sumqayit'

export interface TrainRecord {
  readonly number: string
  readonly times: readonly (string | null)[]
  readonly note?: string
}

export interface DaySchedule {
  readonly stations: readonly string[]
  readonly trains: readonly TrainRecord[]
}

export interface RouteRecord {
  readonly name: string
  readonly fareInfoKey: string
  readonly directions: Readonly<Record<DirectionId, Readonly<Record<DayType, DaySchedule>>>>
}

export interface FareInfo {
  readonly distance: number
  readonly fare: number
}

export interface ScheduleDatabase {
  readonly routesData: Readonly<Record<RouteId, RouteRecord>>
  readonly fareData: Readonly<Record<string, Readonly<Record<string, FareInfo>>>>
}

export interface RouteOption {
  readonly id: RouteId
  readonly name: string
  readonly accent: string
  readonly shortName: string
  readonly description: string
}

export interface StopTime {
  readonly station: string
  readonly time: string
}

export interface Departure {
  readonly routeId: RouteId
  readonly routeName: string
  readonly directionId: DirectionId
  readonly trainNumber: string
  readonly from: string
  readonly to: string
  readonly departAt: string
  readonly arriveAt: string
  readonly durationMinutes: number
  readonly minutesUntilDeparture: number | null
  readonly passed: boolean
  readonly next: boolean
  readonly note?: string
  readonly intermediateStops: readonly StopTime[]
  readonly allStops: readonly StopTime[]
  readonly fareInfo: FareInfo | null
}

export interface ScheduleSearchParams {
  readonly routeId?: RouteId
  readonly from: string
  readonly to: string
  readonly date: Date
  readonly now?: Date
  readonly includePassed?: boolean
}
