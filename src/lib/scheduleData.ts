import generatedData from '../data/schedule-data.generated.json' with { type: 'json' }
import type { RouteId, RouteOption, ScheduleDatabase } from './types.js'

export const scheduleData = generatedData as ScheduleDatabase

export const routeOptions: readonly RouteOption[] = [
  {
    id: 'baki_pirshagi_sumqayit',
    name: scheduleData.routesData.baki_pirshagi_sumqayit.name,
    accent: '#00a7d8',
    shortName: 'Pirşağı',
    description: 'Bakı, Koroğlu, Sabunçu, Pirşağı, Sumqayıt',
  },
  {
    id: 'baki_xirdalan_sumqayit',
    name: scheduleData.routesData.baki_xirdalan_sumqayit.name,
    accent: '#10b981',
    shortName: 'Xırdalan',
    description: 'Bakı, Dərnəgül, Biləcəri, Xırdalan',
  },
]

export const sourceMetadata = {
  title: 'ADY Abşeron dairəvi hərəkət cədvəli',
  sourceUrl: 'https://ticket.ady.az/az/yeni-hereket-cedveli',
  effectiveFrom: '2026-01-21',
  checkedAt: '2026-07-09',
} as const

export const defaultRouteId: RouteId = 'baki_pirshagi_sumqayit'
