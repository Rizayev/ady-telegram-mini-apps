import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDepartureShareCard } from './shareCard.js'
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
  intermediateStops: [{ station: 'Koroğlu', time: '15:08' }],
  allStops: [],
  fareInfo: { fare: 1.2, distance: 45 },
}

function canvasContext() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 16 })),
    set fillStyle(_value: string) {},
    set strokeStyle(_value: string) {},
    set lineWidth(_value: number) {},
    set font(_value: string) {},
    set textAlign(_value: CanvasTextAlign) {},
    set shadowColor(_value: string) {},
    set shadowBlur(_value: number) {},
    set shadowOffsetY(_value: number) {},
    set globalAlpha(_value: number) {},
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

describe('createDepartureShareCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('draws and returns a shareable PNG ticket', async () => {
    const context = canvasContext()
    const originalCreateElement = document.createElement.bind(document)
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(context),
      toBlob: (callback: BlobCallback) => callback(new Blob(['card'], { type: 'image/png' })),
    } as unknown as HTMLCanvasElement
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (tagName === 'canvas' ? canvas : originalCreateElement(tagName))) as typeof document.createElement)

    const file = await createDepartureShareCard(departure, new Date('2026-07-10T12:00:00Z'), 'ru')

    expect(file).toMatchObject({ name: 'ady-15-00-6625.png', type: 'image/png' })
    expect(canvas.width).toBe(1200)
    expect(canvas.height).toBe(1500)
    expect(context.fillText).toHaveBeenCalledWith('15:00', 106, 600)
  })

  it('returns null when a canvas context is unavailable', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const canvas = { getContext: vi.fn().mockReturnValue(null) } as unknown as HTMLCanvasElement
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (tagName === 'canvas' ? canvas : originalCreateElement(tagName))) as typeof document.createElement)

    await expect(createDepartureShareCard(departure, new Date(), 'en')).resolves.toBeNull()
  })

  it('fits long station labels and handles a missing fare', async () => {
    const context = canvasContext()
    const originalCreateElement = document.createElement.bind(document)
    const canvas = {
      getContext: vi.fn().mockReturnValue(context),
      toBlob: (callback: BlobCallback) => callback(new Blob(['card'], { type: 'image/png' })),
    } as unknown as HTMLCanvasElement
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (tagName === 'canvas' ? canvas : originalCreateElement(tagName))) as typeof document.createElement)

    const file = await createDepartureShareCard(
      { ...departure, from: 'Bakı Beynəlxalq Hava Limanı Terminalı', to: 'Sumqayıt Dəmiryol Vağzalı', fareInfo: null },
      new Date('2026-07-10T12:00:00Z'),
      'az',
    )

    expect(file).not.toBeNull()
    expect(context.fillText).toHaveBeenCalledWith(expect.stringMatching(/\.\.\.$/), 106, 660)
  })

  it('returns null when the canvas cannot create a PNG blob', async () => {
    const context = canvasContext()
    const originalCreateElement = document.createElement.bind(document)
    const canvas = {
      getContext: vi.fn().mockReturnValue(context),
      toBlob: (callback: BlobCallback) => callback(null),
    } as unknown as HTMLCanvasElement
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (tagName === 'canvas' ? canvas : originalCreateElement(tagName))) as typeof document.createElement)

    await expect(createDepartureShareCard(departure, new Date(), 'en')).resolves.toBeNull()
  })
})
