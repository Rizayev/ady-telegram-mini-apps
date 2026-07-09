import {
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPinned,
  Navigation2,
  Search,
  Share2,
  Star,
  TrainFront,
  X,
  WalletCards,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { dayTypeLabel, getDayType, parseISODate, toISODate } from './lib/calendar.js'
import { copy, detectLanguage, languages, type Language } from './lib/i18n.js'
import { defaultSearchForRoute, destinationStationsForRoute, minutesToShortLabel, originStationsForRoute, searchDepartures } from './lib/schedule.js'
import { defaultRouteId, routeOptions, sourceMetadata } from './lib/scheduleData.js'
import { createShareText } from './lib/share.js'
import { initializeTelegramShell } from './lib/telegram.js'
import type { Departure, RouteId } from './lib/types.js'

interface FavoriteRoute {
  readonly id: string
  readonly routeId: RouteId
  readonly from: string
  readonly to: string
  readonly removable: boolean
}

const favoritesStorageKey = 'ady-schedule-favorites:v1'
const routeIds = new Set<RouteId>(routeOptions.map((route) => route.id))

const defaultFavorites: readonly FavoriteRoute[] = [
  { id: 'default-baki-sumqayit', routeId: 'baki_pirshagi_sumqayit', from: 'Bakı', to: 'Sumqayıt', removable: false },
  { id: 'default-sumqayit-baki', routeId: 'baki_pirshagi_sumqayit', from: 'Sumqayıt', to: 'Bakı', removable: false },
  { id: 'default-baki-xirdalan', routeId: 'baki_xirdalan_sumqayit', from: 'Bakı', to: 'Xırdalan', removable: false },
  { id: 'default-xirdalan-baki', routeId: 'baki_xirdalan_sumqayit', from: 'Xırdalan', to: 'Bakı', removable: false },
]

function loadFavoriteRoutes(): readonly FavoriteRoute[] {
  try {
    const stored = window.localStorage.getItem(favoritesStorageKey)
    const parsed = stored ? (JSON.parse(stored) as FavoriteRoute[]) : []
    const customFavorites = parsed.filter(
      (favorite) => routeIds.has(favorite.routeId) && favorite.from && favorite.to,
    )

    return [
      ...defaultFavorites,
      ...customFavorites.map((favorite) => ({ ...favorite, removable: true })),
    ]
  } catch {
    return defaultFavorites
  }
}

function persistFavoriteRoutes(favorites: readonly FavoriteRoute[]) {
  try {
    const customFavorites = favorites.filter((favorite) => favorite.removable)
    window.localStorage.setItem(favoritesStorageKey, JSON.stringify(customFavorites))
  } catch {
    // The app still works if private browsing blocks localStorage.
  }
}

function App() {
  const [language, setLanguage] = useState<Language>(() => detectLanguage())
  const [routeId, setRouteId] = useState<RouteId>(defaultRouteId)
  const [from, setFrom] = useState('Bakı')
  const [to, setTo] = useState('Sumqayıt')
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [favorites, setFavorites] = useState<readonly FavoriteRoute[]>(() => loadFavoriteRoutes())
  const [telegramShell, setTelegramShell] = useState(() => ({
    isTelegram: false,
    userFirstName: null as string | null,
    colorScheme: 'light' as 'light' | 'dark',
  }))

  const t = copy[language]
  const selectedDate = useMemo(() => parseISODate(date || toISODate(new Date())), [date])
  const originOptions = useMemo(() => originStationsForRoute(routeId, selectedDate), [routeId, selectedDate])
  const destinationOptions = useMemo(() => destinationStationsForRoute(routeId, from, selectedDate), [from, routeId, selectedDate])

  useEffect(() => {
    setTelegramShell(initializeTelegramShell())
  }, [])

  useEffect(() => {
    const defaults = defaultSearchForRoute(routeId, selectedDate)
    const nextFrom = originOptions.includes(from) ? from : defaults.from
    const destinations = nextFrom ? destinationStationsForRoute(routeId, nextFrom, selectedDate) : []
    const nextTo = destinations.includes(to) && to !== nextFrom ? to : destinations[0] ?? defaults.to

    if (nextFrom !== from) {
      setFrom(nextFrom)
    }

    if (nextTo !== to) {
      setTo(nextTo)
    }
  }, [from, originOptions, routeId, selectedDate, to])

  const departures = useMemo(
    () =>
      searchDepartures({
        routeId,
        from,
        to,
        date: selectedDate,
        includePassed: true,
      }),
    [from, routeId, selectedDate, to],
  )

  const nextDeparture = departures.find((departure) => departure.next) ?? null
  const dayType = dayTypeLabel(getDayType(selectedDate), language)
  const currentFavoriteExists = favorites.some((favorite) => favorite.routeId === routeId && favorite.from === from && favorite.to === to)

  function swapStations() {
    setFrom(to)
    setTo(from)
  }

  function selectRoute(nextRouteId: RouteId) {
    const defaults = defaultSearchForRoute(nextRouteId, selectedDate)
    setRouteId(nextRouteId)
    setFrom(defaults.from)
    setTo(defaults.to)
  }

  function applyFavorite(favorite: FavoriteRoute) {
    setRouteId(favorite.routeId)
    setFrom(favorite.from)
    setTo(favorite.to)
  }

  function saveCurrentFavorite() {
    if (currentFavoriteExists || !from || !to) {
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
    setFavorites(nextFavorites)
    persistFavoriteRoutes(nextFavorites)
  }

  function removeFavorite(id: string) {
    const nextFavorites = favorites.filter((favorite) => favorite.id !== id)
    setFavorites(nextFavorites)
    persistFavoriteRoutes(nextFavorites)
  }

  function selectLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', nextLanguage)
    window.history.replaceState(null, '', url)
  }

  return (
    <main className={`app-shell ${telegramShell.colorScheme === 'dark' ? 'app-shell-dark' : ''}`}>
      <section className="hero-section" aria-labelledby="page-title">
        <img className="hero-image" src="/train-hero.png" alt="" />
        <div className="hero-overlay" />
        <nav className="topbar" aria-label="Language and mode">
          <div className="mode-pill">
            <TrainFront size={16} />
            <span>{telegramShell.isTelegram ? t.telegramMode : t.webMode}</span>
          </div>
          <div className="language-tabs" aria-label="Language">
            {languages.map((lang) => (
              <button
                key={lang}
                className={language === lang ? 'is-active' : ''}
                type="button"
                onClick={() => selectLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>

        <div className="hero-content">
          <div className="brand-mark">
            <TrainFront size={22} />
          </div>
          <div>
            <h1 id="page-title">{t.appName}</h1>
            <p>{telegramShell.userFirstName ? `${telegramShell.userFirstName}, ${t.tagline}` : t.tagline}</p>
          </div>
        </div>
      </section>

      <section className="search-surface" aria-label="Schedule search">
        <div className="route-tabs">
          {routeOptions.map((route) => (
            <button
              key={route.id}
              className={route.id === routeId ? 'is-selected' : ''}
              style={{ '--route-accent': route.accent } as CSSProperties}
              type="button"
              onClick={() => selectRoute(route.id)}
            >
              <span>{route.shortName}</span>
              <small>{route.description}</small>
            </button>
          ))}
        </div>

        <div className="favorites-row" aria-label={t.favorites}>
          <div className="favorites-title">
            <Star size={15} />
            <span>{t.favorites}</span>
          </div>
          <div className="favorite-chips">
            {favorites.map((favorite) => (
              <button
                key={favorite.id}
                className={favorite.routeId === routeId && favorite.from === from && favorite.to === to ? 'favorite-chip is-active' : 'favorite-chip'}
                type="button"
                onClick={() => applyFavorite(favorite)}
              >
                <span>{favorite.from} → {favorite.to}</span>
                {favorite.removable ? (
                  <X
                    aria-label={t.removeFavorite}
                    size={14}
                    onClick={(event) => {
                      event.stopPropagation()
                      removeFavorite(favorite.id)
                    }}
                  />
                ) : null}
              </button>
            ))}
            <button className="favorite-chip save-chip" type="button" disabled={currentFavoriteExists || !from || !to} onClick={saveCurrentFavorite}>
              <Star size={14} />
              <span>{t.addFavorite}</span>
            </button>
          </div>
        </div>

        <div className="field-grid">
          <label className="field">
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

          <button className="icon-action swap-action" type="button" aria-label={t.swap} onClick={swapStations}>
            <ArrowLeftRight size={20} />
          </button>

          <label className="field">
            <span>
              <MapPinned size={15} />
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

          <label className="field date-field">
            <span>
              <CalendarDays size={15} />
              {t.date}
            </span>
            <input value={date} type="date" onChange={(event) => setDate(event.target.value || toISODate(new Date()))} />
          </label>
        </div>

        <div className="summary-strip">
          <div>
            <Search size={18} />
            <span>{dayType}</span>
          </div>
          <button className="text-action" type="button" onClick={() => setDate(toISODate(new Date()))}>
            {t.today}
          </button>
        </div>
      </section>

      {nextDeparture ? (
        <section className="next-band" aria-label={t.nextTrain}>
          <div className="section-title">
            <span>{t.nextTrain}</span>
            <CheckCircle2 size={18} />
          </div>
          <DepartureCard departure={nextDeparture} language={language} featured />
        </section>
      ) : null}

      <section className="departures-section" aria-label={t.allTrains}>
        <div className="section-title">
          <span>{t.allTrains}</span>
          <strong>{departures.length}</strong>
        </div>

        {departures.length > 0 ? (
          <div className="departure-list">
            {departures.map((departure) => (
              <DepartureCard key={`${departure.routeId}-${departure.trainNumber}-${departure.departAt}`} departure={departure} language={language} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <TrainFront size={32} />
            <p>{t.noResults}</p>
          </div>
        )}
      </section>

      <footer className="source-footer">
        <div>
          <span>{t.source}: {sourceMetadata.title}</span>
          <small>{t.updated}: {sourceMetadata.checkedAt}</small>
        </div>
        <a href={sourceMetadata.sourceUrl} target="_blank" rel="noreferrer">
          {t.openAdy}
          <ExternalLink size={14} />
        </a>
      </footer>
    </main>
  )
}

function DepartureCard({ departure, language, featured = false }: { readonly departure: Departure; readonly language: Language; readonly featured?: boolean }) {
  const t = copy[language]
  const waitLabel =
    departure.minutesUntilDeparture === null
      ? null
      : departure.minutesUntilDeparture < 0
        ? t.passed
        : minutesToShortLabel(departure.minutesUntilDeparture, language)
  const stopsCount = departure.intermediateStops.length

  async function shareDeparture() {
    const text = createShareText(departure)
    if (navigator.share) {
      await navigator.share({ text, title: t.appName })
      return
    }

    await navigator.clipboard?.writeText(text)
  }

  return (
    <article className={`departure-card ${featured ? 'is-featured' : ''} ${departure.passed ? 'is-passed' : ''}`}>
      <div className="ticket-top">
        <div className="train-number">
          <TrainFront size={16} />
          №{departure.trainNumber}
        </div>
        {departure.next ? <span className="next-badge">{t.nextTrain}</span> : null}
      </div>

      <div className="route-times">
        <div>
          <strong>{departure.departAt}</strong>
          <span>{departure.from}</span>
        </div>
        <div className="rail-line" aria-hidden="true">
          <span />
        </div>
        <div>
          <strong>{departure.arriveAt}</strong>
          <span>{departure.to}</span>
        </div>
      </div>

      <div className="trip-metrics">
        <span>
          <Clock3 size={15} />
          {t.duration}: {minutesToShortLabel(departure.durationMinutes, language)}
        </span>
        {waitLabel ? (
          <span>
            <Navigation2 size={15} />
            {departure.passed ? waitLabel : `${t.departsIn}: ${waitLabel}`}
          </span>
        ) : null}
        {departure.fareInfo ? (
          <span>
            <WalletCards size={15} />
            {departure.fareInfo.fare.toFixed(2)} AZN · {departure.fareInfo.distance} km
          </span>
        ) : null}
      </div>

      <div className="ticket-bottom">
        <div className="stops-preview">
          <MapPinned size={15} />
          <span>{stopsCount} {t.stops}</span>
          {departure.note ? <em>{departure.note}</em> : null}
        </div>
        <button className="icon-action" type="button" aria-label={t.share} onClick={shareDeparture}>
          <Share2 size={18} />
        </button>
      </div>
    </article>
  )
}

export default App
