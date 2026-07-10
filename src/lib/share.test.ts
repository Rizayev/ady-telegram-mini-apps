import { describe, expect, it } from 'vitest'
import { createShareText } from './share.js'
import type { Departure } from './types.js'

const departure: Departure = {
  routeId: 'baki_pirshagi_sumqayit',
  routeName: 'Bakı — Sumqayıt',
  directionId: 'baki_to_sumqayit',
  trainNumber: '6625',
  from: 'Bakı',
  to: 'Sumqayıt',
  departAt: '15:00',
  arriveAt: '15:52',
  durationMinutes: 52,
  minutesUntilDeparture: 30,
  passed: false,
  next: true,
  intermediateStops: [],
  allStops: [],
  fareInfo: { fare: 1.2, distance: 45 },
}

describe('createShareText', () => {
  it('includes route, times, train number, and fare', () => {
    expect(createShareText(departure)).toBe('Bakı → Sumqayıt: 15:00 - 15:52, №6625, 1.20 AZN')
  })
})
