import { useState } from 'react'
import pmLogo from '../assets/pm-logo-pixel.png'
import { HelpModal } from './HelpModal'

const NAME_MAX = 16

interface Props {
  maxCards: number
  setMaxCards: (n: number) => void
  onStart: (playerName: string) => void
}

export function StartScreen({ maxCards, setMaxCards, onStart }: Props) {
  const [name, setName] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const trimmed = name.trim()
  const canStart = trimmed.length > 0

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8">
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="wood-btn absolute right-3 top-3 flex h-12 w-12 items-center justify-center font-pixel text-[18px]"
        aria-label="Uitleg"
        title="Uitleg"
      >
        ?
      </button>

      <div className="panel animate-pop w-full max-w-md px-5 py-8 text-center">
        <img
          src={pmLogo}
          alt="PinkManiac"
          className="pixel-logo mx-auto mb-3 h-24 w-24 sm:h-28 sm:w-28"
          width={96}
          height={96}
        />
        <p className="font-body text-2xl tracking-wide text-terracotta">PinkManiac Studio</p>
        <h1 className="animate-float mt-4 font-pixel text-[20px] leading-relaxed text-forest-dark sm:text-[24px]">
          Wel bekennen, he!
        </h1>
        <p className="mx-auto mt-4 font-body text-2xl leading-snug text-ink-soft">
          De keukentafel is het slagveld.
          <br />
          Test je familiebanden.
        </p>

        <div className="mt-6 rounded-xl border-[3px] border-wood-dark/40 bg-beige-light/80 px-4 py-4 text-left">
          <label htmlFor="player-name" className="font-body text-xl text-ink">
            Jouw naam
          </label>
          <input
            id="player-name"
            type="text"
            maxLength={NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            placeholder="Typ je naam…"
            className="mt-2 w-full rounded-lg border-[3px] border-wood-dark bg-cream px-3 py-2.5 font-body text-2xl text-ink outline-none focus:ring-2 focus:ring-terracotta"
            autoComplete="nickname"
          />
          <p className="mt-1 text-right font-body text-base text-ink-soft">
            {trimmed.length}/{NAME_MAX}
          </p>
        </div>

        <div className="mt-5 rounded-xl border-[3px] border-wood-dark/40 bg-beige-light/80 px-4 py-4">
          <label htmlFor="max-cards" className="font-body text-xl text-ink">
            Max kaarten per ronde
          </label>
          <div className="mt-3 flex items-center gap-3">
            <span className="font-body text-3xl text-ink">3</span>
            <input
              id="max-cards"
              type="range"
              min={3}
              max={13}
              value={maxCards}
              onChange={(e) => setMaxCards(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-wood-light accent-terracotta"
            />
            <span className="font-body text-3xl text-ink">13</span>
          </div>
          <p className="mt-2 font-pixel text-[16px] text-terracotta">{maxCards}</p>
        </div>

        <button
          type="button"
          disabled={!canStart}
          onClick={() => onStart(trimmed)}
          className="wood-btn wood-btn-lg mt-8 w-full"
        >
          Start spel
        </button>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
