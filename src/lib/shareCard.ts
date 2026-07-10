import { minutesToShortLabel } from './schedule.js'
import type { Departure } from './types.js'

type ShareLanguage = 'az' | 'ru' | 'en'

const cardSize = { width: 1200, height: 1500 } as const

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
  context.fill()
}

function writeText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) {
    context.fillText(text, x, y)
    return
  }

  let clipped = text
  while (clipped.length > 0 && context.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1)
  }
  context.fillText(`${clipped}...`, x, y)
}

function dateLabel(date: Date, language: ShareLanguage): string {
  return new Intl.DateTimeFormat(language === 'az' ? 'az-AZ' : language === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function canvasFile(canvas: HTMLCanvasElement, filename: string): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? new File([blob], filename, { type: 'image/png' }) : null), 'image/png')
  })
}

function drawRailPattern(context: CanvasRenderingContext2D) {
  context.save()
  context.strokeStyle = '#173452'
  context.lineWidth = 2
  context.globalAlpha = 0.62

  for (let offset = -500; offset < 1400; offset += 120) {
    context.beginPath()
    context.moveTo(offset, 0)
    context.lineTo(offset + 760, cardSize.height)
    context.stroke()
  }

  context.restore()
}

function drawMetric(context: CanvasRenderingContext2D, x: number, label: string, value: string) {
  context.fillStyle = '#132d4b'
  roundedRect(context, x, 1050, 500, 168, 28)
  context.fillStyle = '#86b7db'
  context.font = '600 26px Arial, sans-serif'
  context.fillText(label, x + 30, 1100)
  context.fillStyle = '#ffffff'
  context.font = '700 43px Arial, sans-serif'
  context.fillText(value, x + 30, 1170)
}

export async function createDepartureShareCard(departure: Departure, date: Date, language: ShareLanguage): Promise<File | null> {
  const canvas = document.createElement('canvas')
  canvas.width = cardSize.width
  canvas.height = cardSize.height
  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  const duration = minutesToShortLabel(departure.durationMinutes, language)
  const durationLabel = language === 'ru' ? 'В пути' : language === 'en' ? 'Duration' : 'Yolda'
  const fareLabel = language === 'ru' ? 'Цена' : language === 'en' ? 'Fare' : 'Gediş haqqı'
  const stopsLabel = language === 'ru' ? 'остановок' : language === 'en' ? 'stops' : 'dayanacaq'

  context.fillStyle = '#091525'
  context.fillRect(0, 0, cardSize.width, cardSize.height)
  drawRailPattern(context)

  context.shadowColor = 'rgba(0, 0, 0, 0.28)'
  context.shadowBlur = 44
  context.shadowOffsetY = 20
  context.fillStyle = '#102b49'
  roundedRect(context, 48, 48, 1104, 310, 42)
  context.shadowColor = 'transparent'

  context.fillStyle = '#2dd4bf'
  roundedRect(context, 86, 86, 10, 234, 5)
  context.fillStyle = '#183b60'
  roundedRect(context, 126, 86, 132, 132, 28)
  context.strokeStyle = '#9ceade'
  context.lineWidth = 7
  context.strokeRect(164, 117, 57, 62)
  context.beginPath()
  context.moveTo(174, 194)
  context.lineTo(158, 214)
  context.moveTo(211, 194)
  context.lineTo(227, 214)
  context.stroke()

  context.fillStyle = '#ffffff'
  context.font = '700 48px Arial, sans-serif'
  context.fillText('ADY', 292, 140)
  context.fillStyle = '#a8cbe3'
  context.font = '600 28px Arial, sans-serif'
  context.fillText(language === 'ru' ? 'Расписание поездов' : language === 'en' ? 'Train schedule' : 'Qatar cədvəli', 292, 185)

  context.fillStyle = '#183b60'
  roundedRect(context, 126, 254, 520, 58, 18)
  context.fillStyle = '#d7f3ff'
  context.font = '700 25px Arial, sans-serif'
  context.fillText(dateLabel(date, language), 151, 292)
  context.textAlign = 'right'
  context.fillStyle = '#9ceade'
  context.font = '700 29px Arial, sans-serif'
  context.fillText(`№${departure.trainNumber}`, 1080, 292)
  context.textAlign = 'left'

  context.shadowColor = 'rgba(0, 0, 0, 0.2)'
  context.shadowBlur = 34
  context.shadowOffsetY = 16
  context.fillStyle = '#f7fbff'
  roundedRect(context, 48, 410, 1104, 580, 42)
  context.shadowColor = 'transparent'

  context.fillStyle = '#11233b'
  context.font = '700 118px Arial, sans-serif'
  context.fillText(departure.departAt, 106, 600)
  context.textAlign = 'right'
  context.fillText(departure.arriveAt, 1094, 600)
  context.textAlign = 'left'

  context.fillStyle = '#5f748a'
  context.font = '600 34px Arial, sans-serif'
  writeText(context, departure.from, 106, 660, 310)
  context.textAlign = 'right'
  writeText(context, departure.to, 1094, 660, 310)
  context.textAlign = 'left'

  context.strokeStyle = '#b8cee0'
  context.lineWidth = 5
  context.beginPath()
  context.moveTo(430, 575)
  context.lineTo(770, 575)
  context.stroke()
  context.fillStyle = '#2481cc'
  context.beginPath()
  context.arc(450, 575, 14, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#2dd4bf'
  context.beginPath()
  context.moveTo(730, 554)
  context.lineTo(780, 575)
  context.lineTo(730, 596)
  context.closePath()
  context.fill()

  context.fillStyle = '#eaf3fa'
  roundedRect(context, 106, 750, 988, 152, 28)
  context.fillStyle = '#4a647c'
  context.font = '600 27px Arial, sans-serif'
  context.fillText(`${departure.intermediateStops.length} ${stopsLabel}`, 142, 808)
  context.fillStyle = '#11233b'
  context.font = '700 38px Arial, sans-serif'
  context.fillText(departure.routeName, 142, 864)

  drawMetric(context, 48, durationLabel, duration)
  drawMetric(context, 652, fareLabel, departure.fareInfo ? `${departure.fareInfo.fare.toFixed(2)} AZN` : 'ADY')

  context.fillStyle = '#2dd4bf'
  roundedRect(context, 48, 1300, 1104, 12, 6)
  context.fillStyle = '#ffffff'
  context.font = '700 35px Arial, sans-serif'
  context.fillText('ady.elsevar.dev', 48, 1390)
  context.textAlign = 'right'
  context.fillStyle = '#9dbbd0'
  context.font = '600 28px Arial, sans-serif'
  context.fillText('ADY Mini App', 1152, 1390)
  context.textAlign = 'left'

  return canvasFile(canvas, `ady-${departure.departAt.replace(':', '-')}-${departure.trainNumber}.png`)
}
