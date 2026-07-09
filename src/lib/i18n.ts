export type Language = 'az' | 'ru' | 'en'

export const languages: readonly Language[] = ['az', 'ru', 'en']

export const copy = {
  az: {
    appName: 'ADY Cədvəl',
    tagline: 'Bakı-Sumqayıt elektrik qatarları',
    today: 'Bugün',
    route: 'Xətt',
    from: 'Haradan',
    to: 'Haraya',
    date: 'Tarix',
    swap: 'Dəyiş',
    nextTrain: 'Növbəti qatar',
    allTrains: 'Reyslər',
    noResults: 'Bu istiqamət üçün reys tapılmadı.',
    passed: 'Keçib',
    departsIn: 'Çıxışa',
    duration: 'Yolda',
    fare: 'Gediş haqqı',
    distance: 'Məsafə',
    stops: 'dayanacaq',
    source: 'Mənbə',
    updated: 'Yoxlanılıb',
    openAdy: 'ADY',
    share: 'Paylaş',
    webMode: 'Web',
    telegramMode: 'Telegram',
  },
  ru: {
    appName: 'ADY Расписание',
    tagline: 'Электрички Баку-Сумгаит',
    today: 'Сегодня',
    route: 'Линия',
    from: 'Откуда',
    to: 'Куда',
    date: 'Дата',
    swap: 'Поменять',
    nextTrain: 'Ближайший поезд',
    allTrains: 'Рейсы',
    noResults: 'Для этого направления рейсы не найдены.',
    passed: 'Ушел',
    departsIn: 'До отправления',
    duration: 'В пути',
    fare: 'Цена',
    distance: 'Расстояние',
    stops: 'остановок',
    source: 'Источник',
    updated: 'Проверено',
    openAdy: 'ADY',
    share: 'Поделиться',
    webMode: 'Web',
    telegramMode: 'Telegram',
  },
  en: {
    appName: 'ADY Schedule',
    tagline: 'Baku-Sumgayit commuter trains',
    today: 'Today',
    route: 'Line',
    from: 'From',
    to: 'To',
    date: 'Date',
    swap: 'Swap',
    nextTrain: 'Next train',
    allTrains: 'Departures',
    noResults: 'No departures found for this direction.',
    passed: 'Gone',
    departsIn: 'Departs in',
    duration: 'Duration',
    fare: 'Fare',
    distance: 'Distance',
    stops: 'stops',
    source: 'Source',
    updated: 'Checked',
    openAdy: 'ADY',
    share: 'Share',
    webMode: 'Web',
    telegramMode: 'Telegram',
  },
} satisfies Record<Language, Record<string, string>>

export function detectLanguage(): Language {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('lang')
  if (requested === 'az' || requested === 'ru' || requested === 'en') {
    return requested
  }

  const browser = navigator.language.toLowerCase()
  if (browser.startsWith('ru')) {
    return 'ru'
  }

  if (browser.startsWith('en')) {
    return 'en'
  }

  return 'az'
}
