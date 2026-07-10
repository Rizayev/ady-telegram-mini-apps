import {
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Navigation2,
  Plus,
  Share2,
  Star,
  TrainFront,
  WalletCards,
  X,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './motion.css'
import { dayTypeLabel, getDayType, parseISODate, toISODate } from './lib/calendar.js'
import { copy, detectLanguage, languages, type Language } from './lib/i18n.js'
import { destinationStationsForRoute, minutesToShortLabel, originStationsForRoute, searchDepartures } from './lib/schedule.js'
import { defaultRouteId, routeOptions, sourceMetadata } from './lib/scheduleData.js'
import { createDepartureShareCard } from './lib/shareCard.js'
import { createShareText } from './lib/share.js'
import { hapticImpact, initializeTelegramShell } from './lib/telegram.js'
import type { DayType, Departure, RouteId } from './lib/types.js'

interface FavoriteRoute {
  readonly id: string
  readonly routeId: RouteId
  readonly from: string
  readonly to: string
  readonly removable: boolean
}

type ScheduleMode = 'auto' | DayType
type DepartureListMode = 'upcoming' | 'past'

const favoritesStorageKey = 'ady-schedule-favorites:v1'
const routeIds = new Set<RouteId>(routeOptions.map((route) => route.id))
const scheduleModes = ['auto', 'workdays', 'saturday_holiday', 'sunday'] satisfies readonly ScheduleMode[]

const defaultFavorites: readonly FavoriteRoute[] = []

function isStoredFavorite(value: unknown): value is FavoriteRoute {
  if (!value || typeof value !== 'object') {
    return false
  }

  const favorite = value as Partial<FavoriteRoute>
  return (
    typeof favorite.id === 'string' &&
    routeIds.has(favorite.routeId as RouteId) &&
    typeof favorite.from === 'string' &&
    typeof favorite.to === 'string' &&
    favorite.from.length > 0 &&
    favorite.to.length > 0 &&
    favorite.from !== favorite.to
  )
}

function loadFavoriteRoutes(): readonly FavoriteRoute[] {
  try {
    const stored = window.localStorage.getItem(favoritesStorageKey)
    const parsed = stored ? (JSON.parse(stored) as unknown) : []
    const customFavorites = Array.isArray(parsed) ? parsed.filter(isStoredFavorite) : []

    return [...defaultFavorites, ...customFavorites.map((favorite) => ({ ...favorite, removable: true }))]
  } catch {
    return defaultFavorites
  }
}

function persistFavoriteRoutes(favorites: readonly FavoriteRoute[]) {
  try {
    window.localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites.filter((favorite) => favorite.removable)))
  } catch {
    // The schedule remains usable when storage is unavailable.
  }
}

function scheduleModeLabel(mode: ScheduleMode, language: Language): string {
  const t = copy[language]
  const labels = {
    auto: t.autoDayType,
    workdays: t.workdayShort,
    saturday_holiday: t.saturdayShort,
    sunday: t.sundayShort,
  } satisfies Record<ScheduleMode, string>

  return labels[mode]
}

function departureKey(departure: Departure): string {
  return `${departure.routeId}-${departure.trainNumber}-${departure.departAt}`
}

function uniqueStations(stationsByRoute: (routeId: RouteId) => readonly string[]): readonly string[] {
  return [...new Set(routeOptions.flatMap((route) => stationsByRoute(route.id)))].sort((a, b) => a.localeCompare(b, 'az'))
}

function routeForJourney(preferredRouteId: RouteId, from: string, to: string, date: Date, dayType: DayType): RouteId {
  const routeCanServeJourney = (candidateRouteId: RouteId) =>
    originStationsForRoute(candidateRouteId, date, dayType).includes(from) && destinationStationsForRoute(candidateRouteId, from, date, dayType).includes(to)

  return routeCanServeJourney(preferredRouteId)
    ? preferredRouteId
    : routeOptions.find((route) => routeCanServeJourney(route.id))?.id ?? preferredRouteId
}

function App() {
  const [language, setLanguage] = useState<Language>(() => detectLanguage())
  const [routeId, setRouteId] = useState<RouteId>(defaultRouteId)
  const [from, setFrom] = useState('Bakı')
  const [to, setTo] = useState('Sumqayıt')
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('auto')
  const [favorites, setFavorites] = useState<readonly FavoriteRoute[]>(() => loadFavoriteRoutes())
  const [telegramShell, setTelegramShell] = useState(() => initializeTelegramShell())
  const [isSwapping, setIsSwapping] = useState(false)
  const [departureListMode, setDepartureListMode] = useState<DepartureListMode>('upcoming')
  const dateInputRef = useRef<HTMLInputElement>(null)

  const t = copy[language]
  const selectedDate = useMemo(() => parseISODate(date || toISODate(new Date())), [date])
  const automaticDayType = useMemo(() => getDayType(selectedDate), [selectedDate])
  const activeDayType = scheduleMode === 'auto' ? automaticDayType : scheduleMode
  const originOptions = useMemo(
    () => uniqueStations((candidateRouteId) => originStationsForRoute(candidateRouteId, selectedDate, activeDayType)),
    [activeDayType, selectedDate],
  )
  const destinationOptions = useMemo(
    () => uniqueStations((candidateRouteId) => destinationStationsForRoute(candidateRouteId, from, selectedDate, activeDayType)),
    [activeDayType, from, selectedDate],
  )

  useEffect(() => {
    setTelegramShell(initializeTelegramShell())
  }, [])

  useEffect(() => {
    const nextFrom = originOptions.includes(from) ? from : originOptions[0] ?? ''
    const destinations = nextFrom
      ? uniqueStations((candidateRouteId) => destinationStationsForRoute(candidateRouteId, nextFrom, selectedDate, activeDayType))
      : []
    const nextTo = destinations.includes(to) && to !== nextFrom ? to : destinations[0] ?? ''
    const nextRouteId = routeForJourney(routeId, nextFrom, nextTo, selectedDate, activeDayType)

    if (nextFrom !== from) {
      setFrom(nextFrom)
    }

    if (nextTo !== to) {
      setTo(nextTo)
    }

    if (nextRouteId !== routeId) {
      setRouteId(nextRouteId)
    }
  }, [activeDayType, from, originOptions, routeId, selectedDate, to])

  const departures = useMemo(
    () =>
      searchDepartures({
        routeId,
        from,
        to,
        date: selectedDate,
        dayType: activeDayType,
        includePassed: true,
      }),
    [activeDayType, from, routeId, selectedDate, to],
  )

  const nextDeparture = departures.find((departure) => departure.next) ?? null
  const upcomingDepartures = departures.filter((departure) => !departure.passed)
  const followingDepartures = nextDeparture ? upcomingDepartures.filter((departure) => departureKey(departure) !== departureKey(nextDeparture)) : upcomingDepartures
  const pastDepartures = departures.filter((departure) => departure.passed)
  const visibleDepartures = departureListMode === 'upcoming' ? followingDepartures : pastDepartures
  const activeFavorite = favorites.some((favorite) => favorite.routeId === routeId && favorite.from === from && favorite.to === to)

  function swapStations() {
    hapticImpact('medium')
    setIsSwapping(true)
    setFrom(to)
    setTo(from)
    window.setTimeout(() => setIsSwapping(false), 360)
  }

  function applyFavorite(favorite: FavoriteRoute) {
    hapticImpact('light')
    setRouteId(favorite.routeId)
    setFrom(favorite.from)
    setTo(favorite.to)
  }

  function saveCurrentFavorite() {
    if (activeFavorite || !from || !to) {
      return
    }

    const nextFavorites = [
      ...favorites,
      {
        id: `${routeId}-${from}-${to}`.replace(/\s+/g, '-').toLowerCase(),
        routeId,
        from,
        to,
        removable: true,
      },
    ]
    hapticImpact('light')
    setFavorites(nextFavorites)
    persistFavoriteRoutes(nextFavorites)
  }

  function removeFavorite(id: string) {
    const nextFavorites = favorites.filter((favorite) => favorite.id !== id)
    hapticImpact('light')
    setFavorites(nextFavorites)
    persistFavoriteRoutes(nextFavorites)
  }

  function selectLanguage(nextLanguage: Language) {
    hapticImpact('light')
    setLanguage(nextLanguage)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', nextLanguage)
    window.history.replaceState(null, '', url)
  }

  function selectScheduleMode(mode: ScheduleMode) {
    hapticImpact('light')
    setScheduleMode(mode)
  }

  function selectDepartureListMode(mode: DepartureListMode) {
    hapticImpact('light')
    setDepartureListMode(mode)
  }

  function openDatePicker() {
    hapticImpact('light')
    dateInputRef.current?.focus()

    try {
      dateInputRef.current?.showPicker?.()
    } catch {
      // Some embedded browsers only open the picker after a direct input tap.
    }
  }

  return (
    <main
      className={`app-shell ${telegramShell.colorScheme === 'dark' ? 'app-shell-dark' : ''}`}
      style={telegramShell.themeVariables as CSSProperties}
    >
      <header className="app-header">
        <div className="app-identity">
          <div className="brand-mark" aria-hidden="true">
            <TrainFront size={21} />
          </div>
          <div>
            <h1>ADY</h1>
            <span>{t.appName}</span>
          </div>
        </div>

        <nav className="language-tabs" aria-label="Language">
          {languages.map((lang) => (
            <button
              key={lang}
              className={language === lang ? 'is-active' : ''}
              type="button"
              aria-pressed={language === lang}
              onClick={() => selectLanguage(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>

      <section className="route-workspace" aria-label="Schedule search">
        <div className="station-picker">
          <label className="station-field">
            <span>
              <Navigation2 size={15} />
              {t.from}
            </span>
            <select value={from} onChange={(event) => setFrom(event.target.value)}>
              {originOptions.map((station) => (
                <option key={station} value={station}>
                  {station}
                </option>
              ))}
            </select>
          </label>

          <button className={`swap-action ${isSwapping ? 'is-animating' : ''}`} type="button" aria-label={t.swap} title={t.swap} onClick={swapStations}>
            <ArrowLeftRight size={19} />
          </button>

          <label className="station-field">
            <span>
              <MapPin size={15} />
              {t.to}
            </span>
            <select value={to} onChange={(event) => setTo(event.target.value)}>
              {destinationOptions.map((station) => (
                <option key={station} value={station}>
                  {station}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="date-row">
          <label className="date-field">
            <span>
              <CalendarDays size={15} />
              {t.date}
            </span>
            <input ref={dateInputRef} value={date} type="date" onChange={(event) => setDate(event.target.value || toISODate(new Date()))} />
          </label>
          <button className="today-action" type="button" aria-label={t.date} title={t.date} onClick={openDatePicker}>
            <CalendarDays size={18} />
          </button>
        </div>

        <div className="service-day" aria-label={t.dayType}>
          <div className="service-day-title">
            <span>{t.dayType}</span>
            <small>{dayTypeLabel(activeDayType, language)}</small>
          </div>
          <div className="day-type-tabs" role="tablist" aria-label={t.dayType}>
            {scheduleModes.map((mode) => (
              <button
                key={mode}
                className={scheduleMode === mode ? 'is-selected' : ''}
                type="button"
                role="tab"
                aria-selected={scheduleMode === mode}
                onClick={() => selectScheduleMode(mode)}
              >
                {scheduleModeLabel(mode, language)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="favorites-section" aria-label={t.favorites}>
        <div className="section-heading">
          <div>
            <Star size={16} />
            <span>{t.favorites}</span>
          </div>
          <button
            className={`favorite-toggle ${activeFavorite ? 'is-active' : ''}`}
            type="button"
            aria-label={t.addFavorite}
            title={t.addFavorite}
            disabled={activeFavorite || !from || !to}
            onClick={saveCurrentFavorite}
          >
            {activeFavorite ? <Check size={17} /> : <Plus size={18} />}
          </button>
        </div>
        <div className="favorite-list">
          {favorites.length > 0 ? (
            favorites.map((favorite) => {
              const isActive = favorite.routeId === routeId && favorite.from === from && favorite.to === to

              return (
                <div key={favorite.id} className={`favorite-item ${isActive ? 'is-active' : ''}`}>
                  <button className="favorite-chip" type="button" onClick={() => applyFavorite(favorite)}>
                    {favorite.from} <ArrowRight size={13} /> {favorite.to}
                  </button>
                  {favorite.removable ? (
                    <button className="favorite-remove" type="button" aria-label={t.removeFavorite} title={t.removeFavorite} onClick={() => removeFavorite(favorite.id)}>
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              )
            })
          ) : (
            <p className="favorites-empty">{t.noFavorites}</p>
          )}
        </div>
      </section>

      {nextDeparture ? (
        <section className="next-train-section" aria-label={t.closestTrain}>
          <div className="section-heading">
            <div>
              <span>{t.closestTrain}</span>
              <span className="live-dot" aria-hidden="true" />
            </div>
            <span className="count-chip">{departures.length}</span>
          </div>
          <DepartureCard departure={nextDeparture} date={selectedDate} language={language} featured animationIndex={0} />
        </section>
      ) : null}

      <section className="departures-section" aria-label={t.allTrains}>
        <div className="section-heading">
          <div>
            <span>{t.allTrains}</span>
            <span className="section-context">{from} - {to}</span>
          </div>
          <span className="count-chip">{visibleDepartures.length}</span>
        </div>

        <div className="departure-filter-tabs" role="tablist" aria-label={t.allTrains}>
          <button
            className={departureListMode === 'upcoming' ? 'is-selected' : ''}
            type="button"
            role="tab"
            aria-selected={departureListMode === 'upcoming'}
            onClick={() => selectDepartureListMode('upcoming')}
          >
            {t.upcomingTrains}
            <span>{followingDepartures.length}</span>
          </button>
          <button
            className={departureListMode === 'past' ? 'is-selected' : ''}
            type="button"
            role="tab"
            aria-selected={departureListMode === 'past'}
            onClick={() => selectDepartureListMode('past')}
          >
            {t.pastTrains}
            <span>{pastDepartures.length}</span>
          </button>
        </div>

        {visibleDepartures.length > 0 ? (
          <div className="departure-list">
            {visibleDepartures.map((departure, index) => (
              <DepartureCard key={departureKey(departure)} departure={departure} date={selectedDate} language={language} animationIndex={index + 1} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <TrainFront size={28} />
            <p>{t.noResults}</p>
          </div>
        )}
      </section>

      <footer className="source-footer">
        <span>{t.updated}: {sourceMetadata.checkedAt}</span>
        <a href={sourceMetadata.sourceUrl} target="_blank" rel="noreferrer">
          {t.openAdy}
          <ExternalLink size={14} />
        </a>
      </footer>
    </main>
  )
}

function DepartureCard({
  departure,
  date,
  language,
  featured = false,
  animationIndex = 0,
}: {
  readonly departure: Departure
  readonly date: Date
  readonly language: Language
  readonly featured?: boolean
  readonly animationIndex?: number
}) {
  const t = copy[language]
  const [isSharing, setIsSharing] = useState(false)
  const waitLabel =
    departure.minutesUntilDeparture === null
      ? null
      : departure.minutesUntilDeparture < 0
        ? t.passed
        : `${t.departsIn}: ${minutesToShortLabel(departure.minutesUntilDeparture, language)}`

  async function shareDeparture() {
    hapticImpact('light')
    const text = createShareText(departure)
    setIsSharing(true)

    try {
      const image = await createDepartureShareCard(departure, date, language)
      if (image && navigator.share && (!navigator.canShare || navigator.canShare({ files: [image] }))) {
        await navigator.share({ files: [image], text, title: t.appName })
        return
      }

      if (navigator.share) {
        await navigator.share({ text, title: t.appName })
        return
      }

      await navigator.clipboard?.writeText(text)
    } catch {
      // Dismissing a system share sheet is not an application error.
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <article
      className={`departure-card ${featured ? 'is-featured' : ''} ${departure.passed ? 'is-passed' : ''}`}
      style={{ '--entry-delay': `${Math.min(animationIndex, 10) * 36}ms` } as CSSProperties}
    >
      <div className="departure-times">
        <div>
          <time>{departure.departAt}</time>
          <span>{departure.from}</span>
        </div>
        <div className="route-connector" aria-hidden="true">
          <span />
          <ArrowRight size={16} />
        </div>
        <div>
          <time>{departure.arriveAt}</time>
          <span>{departure.to}</span>
        </div>
      </div>

      <div className="departure-details">
        <span className={departure.next ? 'status-badge is-next' : 'status-badge'}>
          {waitLabel ?? `${departure.intermediateStops.length} ${t.stops}`}
        </span>
        <span className="train-label">
          <TrainFront size={14} />
          №{departure.trainNumber}
        </span>
        <span className="trip-label">
          <Clock3 size={14} />
          {minutesToShortLabel(departure.durationMinutes, language)}
        </span>
        {departure.fareInfo ? (
          <span className="trip-label">
            <WalletCards size={14} />
            {departure.fareInfo.fare.toFixed(2)} AZN
          </span>
        ) : null}
        <button className="share-action" type="button" aria-label={t.share} title={t.share} disabled={isSharing} onClick={shareDeparture}>
          {isSharing ? <LoaderCircle className="share-spinner" size={17} /> : <Share2 size={17} />}
        </button>
      </div>
    </article>
  )
}

export default App
