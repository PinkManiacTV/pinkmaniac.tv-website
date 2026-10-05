import { useState } from 'react'
import pmLogo from '../assets/pm-logo-pixel.png'
import { maxCardsCap, type TableDensity } from '../game/seats'
import { LangPicker, useI18n } from '../i18n'
import { HelpModal } from './HelpModal'

const NAME_MAX = 16

interface Props {
  maxCards: number
  setMaxCards: (n: number) => void
  playerCount: number
  setPlayerCount: (n: number) => void
  onStart: (playerName: string) => void
  density: TableDensity
}

export function StartScreen({
  maxCards,
  setMaxCards,
  playerCount,
  setPlayerCount,
  onStart,
  density,
}: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const trimmed = name.trim()
  const canStart = trimmed.length > 0
  const cap = maxCardsCap(playerCount)
  const tight = density === 'tight'
  const compact = density !== 'roomy'

  const changePlayers = (n: number) => {
    setPlayerCount(n)
    const nextCap = maxCardsCap(n)
    if (maxCards > nextCap) setMaxCards(nextCap)
  }

  const field =
    tight
      ? 'mt-2 rounded-xl border-[3px] border-wood-dark/40 bg-beige-light/80 px-3 py-1.5'
      : compact
        ? 'mt-2.5 rounded-xl border-[3px] border-wood-dark/40 bg-beige-light/80 px-3 py-2'
        : 'mt-3 rounded-xl border-[3px] border-wood-dark/40 bg-beige-light/80 px-4 py-3'

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex h-8 w-full max-w-md shrink-0 items-center justify-between">
        <LangPicker />
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="wood-btn flex h-8 w-8 items-center justify-center font-pixel text-[14px]"
          aria-label={t('help')}
          title={t('help')}
        >
          ?
        </button>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col justify-center">
        <div
          className={[
            'panel w-full text-center',
            tight ? 'px-3 py-2.5' : compact ? 'px-4 py-4' : 'px-5 py-7',
          ].join(' ')}
        >
          <img
            src={pmLogo}
            alt="PinkManiac"
            className={[
              'pixel-logo mx-auto',
              tight ? 'mb-1 h-12 w-12' : compact ? 'mb-2 h-16 w-16' : 'mb-3 h-20 w-20 sm:h-24 sm:w-24',
            ].join(' ')}
            width={tight ? 48 : compact ? 64 : 80}
            height={tight ? 48 : compact ? 64 : 80}
          />
          <p
            className={[
              'font-body tracking-wide text-terracotta',
              tight ? 'text-lg leading-none' : 'text-2xl',
            ].join(' ')}
          >
            {t('studio')}
          </p>
          <h1
            className={[
              'animate-float font-pixel leading-relaxed text-forest-dark',
              tight ? 'mt-1.5 text-[15px]' : compact ? 'mt-2 text-[16px]' : 'mt-3 text-[18px] sm:text-[22px]',
            ].join(' ')}
          >
            {t('title')}
          </h1>
          <p
            className={[
              'mx-auto font-body leading-snug text-ink-soft',
              tight ? 'mt-1 text-base' : compact ? 'mt-2 text-lg' : 'mt-3 text-xl',
            ].join(' ')}
          >
            {t('blurb1')}
            <br />
            {t('blurb2')}
          </p>

          <div className={`${field} text-left`}>
            <label htmlFor="player-name" className={`font-body text-ink ${tight ? 'text-lg' : 'text-xl'}`}>
              {t('yourName')}
            </label>
            <input
              id="player-name"
              type="text"
              maxLength={NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              placeholder={t('namePlaceholder')}
              className={[
                'w-full rounded-lg border-[3px] border-wood-dark bg-cream font-body text-ink outline-none focus:ring-2 focus:ring-terracotta',
                tight ? 'mt-1 px-2.5 py-1 text-xl' : 'mt-2 px-3 py-2 text-2xl',
              ].join(' ')}
              autoComplete="nickname"
            />
          </div>

          <div className={field}>
            <label htmlFor="player-count" className={`font-body text-ink ${tight ? 'text-lg' : 'text-xl'}`}>
              {t('players')}
            </label>
            <div className={`flex items-center gap-3 ${tight ? 'mt-1' : 'mt-2'}`}>
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
            <p className={`font-pixel text-terracotta ${tight ? 'mt-0.5 text-[14px]' : 'mt-1 text-[16px]'}`}>
              {playerCount}
            </p>
          </div>

          <div className={field}>
            <label htmlFor="max-cards" className={`font-body text-ink ${tight ? 'text-lg' : 'text-xl'}`}>
              {t('maxCards')}
            </label>
            <div className={`flex items-center gap-3 ${tight ? 'mt-1' : 'mt-2'}`}>
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
            <p className={`font-pixel text-terracotta ${tight ? 'mt-0.5 text-[14px]' : 'mt-1 text-[16px]'}`}>
              {Math.min(maxCards, cap)}
            </p>
          </div>

          <button
            type="button"
            disabled={!canStart}
            onClick={() => onStart(trimmed)}
            className={
              compact
                ? 'wood-btn mt-3 w-full py-2.5 font-body text-2xl'
                : 'wood-btn wood-btn-lg mt-6 w-full'
            }
          >
            {t('startGame')}
          </button>
        </div>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
