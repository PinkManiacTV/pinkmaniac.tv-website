import { useState } from 'react'
import pmLogo from '../assets/pm-logo-pixel.png'
import { maxCardsCap } from '../game/seats'
import { LangPicker, useI18n } from '../i18n'
import { HelpModal } from './HelpModal'

const NAME_MAX = 16

interface Props {
  maxCards: number
  setMaxCards: (n: number) => void
  playerCount: number
  setPlayerCount: (n: number) => void
  onStart: (playerName: string) => void
}

export function StartScreen({
  maxCards,
  setMaxCards,
  playerCount,
  setPlayerCount,
  onStart,
}: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const trimmed = name.trim()
  const canStart = trimmed.length > 0
  const cap = maxCardsCap(playerCount)

  const changePlayers = (n: number) => {
    setPlayerCount(n)
    const nextCap = maxCardsCap(n)
    if (maxCards > nextCap) setMaxCards(nextCap)
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8">
      <LangPicker className="absolute top-3 left-3" />
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="wood-btn absolute top-3 right-3 flex h-8 w-8 items-center justify-center font-pixel text-[14px]"
        aria-label={t('help')}
        title={t('help')}
      >
        ?
      </button>

      <div className="panel animate-pop w-full max-w-md px-5 py-7 text-center">
        <img
          src={pmLogo}
          alt="PinkManiac"
          className="pixel-logo mx-auto mb-3 h-20 w-20 sm:h-24 sm:w-24"
          width={80}
          height={80}
        />
        <p className="font-body text-2xl tracking-wide text-terracotta">{t('studio')}</p>
        <h1 className="animate-float mt-3 font-pixel text-[18px] leading-relaxed text-forest-dark sm:text-[22px]">
          {t('title')}
        </h1>
        <p className="mx-auto mt-3 font-body text-xl leading-snug text-ink-soft">
          {t('blurb1')}
          <br />
          {t('blurb2')}
        </p>

        <div className="mt-5 rounded-xl border-[3px] border-wood-dark/40 bg-beige-light/80 px-4 py-3 text-left">
          <label htmlFor="player-name" className="font-body text-xl text-ink">
            {t('yourName')}
          </label>
          <input
            id="player-name"
            type="text"
            maxLength={NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            placeholder={t('namePlaceholder')}
            className="mt-2 w-full rounded-lg border-[3px] border-wood-dark bg-cream px-3 py-2 font-body text-2xl text-ink outline-none focus:ring-2 focus:ring-terracotta"
            autoComplete="nickname"
          />
        </div>

        <div className="mt-3 rounded-xl border-[3px] border-wood-dark/40 bg-beige-light/80 px-4 py-3">
          <label htmlFor="player-count" className="font-body text-xl text-ink">
            {t('players')}
          </label>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-body text-2xl text-ink">4</span>
            <input
              id="player-count"
              type="range"
              min={4}
              max={8}
              value={playerCount}
              onChange={(e) => changePlayers(Number(e.target.value))}
              className="stardew-slider"
            />
            <span className="font-body text-2xl text-ink">8</span>
          </div>
          <p className="mt-1 font-pixel text-[16px] text-terracotta">{playerCount}</p>
        </div>

        <div className="mt-3 rounded-xl border-[3px] border-wood-dark/40 bg-beige-light/80 px-4 py-3">
          <label htmlFor="max-cards" className="font-body text-xl text-ink">
            {t('maxCards')}
          </label>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-body text-2xl text-ink">3</span>
            <input
              id="max-cards"
              type="range"
              min={3}
              max={cap}
              value={Math.min(maxCards, cap)}
              onChange={(e) => setMaxCards(Number(e.target.value))}
              className="stardew-slider"
            />
            <span className="font-body text-2xl text-ink">{cap}</span>
          </div>
          <p className="mt-1 font-pixel text-[16px] text-terracotta">{Math.min(maxCards, cap)}</p>
        </div>

        <button
          type="button"
          disabled={!canStart}
          onClick={() => onStart(trimmed)}
          className="wood-btn wood-btn-lg mt-6 w-full"
        >
          {t('startGame')}
        </button>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
