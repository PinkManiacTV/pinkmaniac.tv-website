import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type Lang = 'en' | 'nl'

const STRINGS = {
  en: {
    studio: 'PinkManiac Studio',
    title: 'Heart Hunter',
    language: 'Language',
    blurb1: 'The kitchen table is the battlefield.',
    blurb2: 'Test your family ties.',
    yourName: 'Your name',
    namePlaceholder: 'Type your name…',
    players: 'Players',
    maxCards: 'Max cards per round',
    startGame: 'Start game',
    help: 'Help',
    close: 'Close',
    gotIt: 'Got it',
    helpLead: 'Heart Hunter — predict how many tricks you will take, and try to hit it exactly.',
    helpTrump: 'Trump: hearts is always trump. Highest trump wins the trick. Without trump, the highest card of the lead suit wins.',
    helpFollow: 'Follow suit: you must follow the first card’s suit if you can. Otherwise you may play anything (including trump).',
    helpRounds: 'Rounds: start at 1 card, climb to max, play that max round twice, then back down to 1.',
    helpLeadPlay: 'Lead: whoever predicted highest plays first. On a tie, whoever predicted earlier in the round leads.',
    helpPoints: 'Points: 1 point per trick won. Exact prediction? +10 bonus.',
    helpBots: 'Play against Yuki, Max, Moppie, James, Aduh, Alfa R, and Michelle.',
    round: 'Round',
    cards: 'cards',
    card: 'card',
    score: 'Score',
    restart: 'Restart',
    restartQ: 'Start over?',
    yes: 'Yes',
    no: 'No',
    total: 'total',
    standings: 'Standings',
    perRound: 'Score per round',
    noRounds: 'No rounds yet.',
    next: 'Next',
    nextRound: 'Next round',
    seeFinal: 'See final scores',
    roundScores: 'Round scores',
    yourPrediction: 'Your prediction',
    whoStarts: 'Who starts?',
    dealerHint: 'Hearts is trump. Highest card starts.',
    dealing: 'Dealing…',
    checkingWinner: 'Checking who wins…',
    dealCards: 'Deal the cards',
    gameOver: 'Game over',
    playAgain: 'Play again',
    pickAndStart: 'Pick players, max cards, and start.',
    highestStarts: '{name} has the highest card and starts!',
    dealingRound: 'Round {n}: dealing cards…',
    asked: '{asked}/{total} asked',
    askedBang: '{asked} / {total} asked!',
    yourPredictHint: 'Your prediction — how many tricks will you take?',
    thinking: '{name} is thinking…',
    announced: '{name}: {n}!',
    leads: '{name} leads.',
    turn: '{name}’s turn.',
    winsTrick: '{name} wins the trick!',
    predictRound: 'Round {n}: {cards} {word}. Predict your tricks!',
    tie: 'Tie! {names} with {score} points.',
    winsGame: '{name} wins with {score} points!',
    youDefault: 'You',
    roundDone: 'Round over — check the scores.',
    lastRoundDone: 'Last round done — check the scores.',
    firstPredictor: 'Predicts first',
    yourTurnHint: 'Your turn…',
  },
  nl: {
    studio: 'PinkManiac Studio',
    title: 'Heart Hunter',
    language: 'Taal',
    blurb1: 'De keukentafel is het slagveld.',
    blurb2: 'Test je familiebanden.',
    yourName: 'Jouw naam',
    namePlaceholder: 'Typ je naam…',
    players: 'Spelers',
    maxCards: 'Max kaarten per ronde',
    startGame: 'Start spel',
    help: 'Uitleg',
    close: 'Sluiten',
    gotIt: 'Begrepen',
    helpLead:
      'Heart Hunter — voorspel hoeveel slagen je haalt, en probeer exact goed te zitten.',
    helpTrump:
      'Troef: harten is altijd troef. Hoogste troef wint de slag. Zonder troef wint de hoogste kaart van de uitgekomen kleur.',
    helpFollow:
      'Meekleur: je moet de kleur van de eerste kaart volgen als je die hebt. Anders mag je alles spelen (ook troef).',
    helpRounds:
      'Rondes: start met 1 kaart, stijgt tot max, speelt die max-ronde twee keer, daarna weer terug naar 1.',
    helpLeadPlay:
      'Uitkomen: wie het hoogst voorspelt, speelt de eerste kaart. Bij gelijke voorspelling begint wie eerder aan de beurt was in de voorspelronde.',
    helpPoints: 'Punten: 1 punt per gewonnen slag. Exact voorspeld? +10 bonus.',
    helpBots: 'Speel tegen Yuki, Max, Moppie, James, Aduh, Alfa R en Michelle.',
    round: 'Ronde',
    cards: 'kaarten',
    card: 'kaart',
    score: 'Score',
    restart: 'Opnieuw',
    restartQ: 'Opnieuw starten?',
    yes: 'Ja',
    no: 'Nee',
    total: 'totaal',
    standings: 'Stand',
    perRound: 'Score per ronde',
    noRounds: 'Nog geen rondes.',
    next: 'Volgende',
    nextRound: 'Volgende ronde',
    seeFinal: 'Bekijk eindstand',
    roundScores: 'Ronde scores',
    yourPrediction: 'Jouw voorspelling',
    whoStarts: 'Wie begint?',
    dealerHint: 'Harten is troef. Hoogste kaart mag beginnen.',
    dealing: 'Delen…',
    checkingWinner: 'Even kijken wie wint…',
    dealCards: 'Deel de kaarten',
    gameOver: 'Einde spel',
    playAgain: 'Opnieuw spelen',
    pickAndStart: 'Kies spelers, max kaarten en start het spel.',
    highestStarts: '{name} heeft de hoogste kaart en begint!',
    dealingRound: 'Ronde {n}: kaarten delen…',
    asked: '{asked}/{total} gevraagd',
    askedBang: '{asked} / {total} gevraagd!',
    yourPredictHint: 'Jouw voorspelling — kies hoeveel slagen je haalt.',
    thinking: '{name} denkt na…',
    announced: '{name}: {n}!',
    leads: '{name} speelt uit.',
    turn: '{name} is aan de beurt.',
    winsTrick: '{name} wint de slag!',
    predictRound: 'Ronde {n}: {cards} {word}. Voorspel je slagen!',
    tie: 'Gelijkspel! {names} met {score} punten.',
    winsGame: '{name} wint met {score} punten!',
    youDefault: 'Jij',
    roundDone: 'Ronde klaar — bekijk de scores.',
    lastRoundDone: 'Laatste ronde klaar — bekijk de scores.',
    firstPredictor: 'Begint met voorspellen',
    yourTurnHint: 'Jij bent aan de beurt…',
  },
} as const

export type I18nKey = keyof typeof STRINGS.en

type Vars = Record<string, string | number>

function fill(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

interface I18nApi {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: I18nKey, vars?: Vars) => string
}

const I18nContext = createContext<I18nApi | null>(null)

const STORAGE = 'wb-v2-lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE)
    return saved === 'nl' || saved === 'en' ? saved : 'en'
  })

  const api = useMemo<I18nApi>(() => {
    const setLang = (next: Lang) => {
      localStorage.setItem(STORAGE, next)
      setLangState(next)
    }
    const t = (key: I18nKey, vars?: Vars) => fill(STRINGS[lang][key], vars)
    return { lang, setLang, t }
  }, [lang])

  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}

const LANGS = [
  { id: 'en' as const, flag: '🇬🇧', name: 'English' },
  { id: 'nl' as const, flag: '🇳🇱', name: 'Nederlands' },
]

export function LangPicker({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const current = LANGS.find((item) => item.id === lang) ?? LANGS[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="wood-btn flex h-8 w-8 items-center justify-center text-[18px] leading-none"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language')}
        title={t('language')}
      >
        <span aria-hidden>{current.flag}</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-[70] mt-1 min-w-[11rem] overflow-hidden rounded-xl border-[3px] border-wood-dark bg-beige-light py-1 shadow-[0_6px_0_rgba(58,46,31,0.25)]"
        >
          {LANGS.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                role="option"
                aria-selected={opt.id === lang}
                onClick={() => {
                  setLang(opt.id)
                  setOpen(false)
                }}
                className={[
                  'flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-body text-lg leading-none',
                  opt.id === lang ? 'bg-beige-dark/80' : 'hover:bg-beige',
                ].join(' ')}
              >
                <span aria-hidden className="text-xl">
                  {opt.flag}
                </span>
                <span>{opt.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
