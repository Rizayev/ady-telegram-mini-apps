import type { Departure } from './types.js'

export function createShareText(departure: Departure): string {
  const fare = departure.fareInfo ? `, ${departure.fareInfo.fare.toFixed(2)} AZN` : ''
  return `${departure.from} → ${departure.to}: ${departure.departAt} - ${departure.arriveAt}, №${departure.trainNumber}${fare}`
}
