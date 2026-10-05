import { useEffect, useState } from 'react'
import type { Card, PlayerId, PlayerState } from '../types'
import { useI18n } from '../i18n'
import { BotPortrait } from './BotPortrait'
import { CardView } from './CardView'

interface Props {
  players: PlayerState[]
  cards: Card[]
  winner: PlayerId | null
  message: string
  onConfirm: () => void
}

export function DealerDraw({ players, cards, winner, message, onConfirm }: Props) {
  const { t } = useI18n()
  const [revealed, setRevealed] = useState(0)
  const [highlightWinner, setHighlightWinner] = useState(false)
  const many = players.length >= 7
  const mid = players.length >= 5
  const cols = players.length <= 4 ? 2 : players.length <= 6 ? 3 : 4
  const face = many ? 28 : mid ? 34 : 40

  useEffect(() => {
    setRevealed(0)
    setHighlightWinner(false)
  }, [cards])

  useEffect(() => {
    if (revealed < cards.length) {
      const id = window.setTimeout(() => setRevealed((n) => n + 1), 480)
      return () => window.clearTimeout(id)
    }
    const id = window.setTimeout(() => setHighlightWinner(true), 350)
    return () => window.clearTimeout(id)
  }, [revealed, cards.length])

  const done = highlightWinner && winner !== null

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden px-2 py-1">
      <div className="panel w-full max-w-md shrink-0 px-3 py-2 text-center">
        <h2 className="font-pixel text-[12px] leading-relaxed text-forest-dark">{t('whoStarts')}</h2>
        <p className="mt-1 font-body text-lg leading-snug text-ink-soft">{t('dealerHint')}</p>
      </div>

      <div
        className="grid min-h-0 w-full max-w-md flex-1 gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {players.map((p, i) => {
          const showCard = i < revealed
          const isWinner = done && winner === p.id
          return (
            <div
              key={p.id}
              className={[
                'panel flex min-h-0 flex-col items-center justify-start overflow-hidden px-2 py-2 transition-all duration-300',
                isWinner ? 'winner-glow ring-2 ring-terracotta scale-[1.03]' : '',
              ].join(' ')}
            >
              <BotPortrait id={p.portrait} size={face} active={isWinner} />
              <span className="relative z-10 mt-1 max-w-full shrink-0 truncate px-0.5 text-center font-body text-base leading-tight text-ink">
                {p.name}
              </span>
              <div className="relative z-0 mt-1.5 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
                {showCard && cards[i] ? (
                  <div className="animate-deal-fly">
                    <CardView card={cards[i]} small />
                  </div>
                ) : (
                  <div className="h-16 w-11 rounded-md border-[3px] border-dashed border-wood-dark/40 bg-beige-dark/30" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="panel w-full max-w-md shrink-0 px-3 py-1.5 text-center font-body text-xl leading-snug text-ink">
        {done ? message : revealed < cards.length ? t('dealing') : t('checkingWinner')}
      </p>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!done}
        className="wood-btn w-full max-w-md shrink-0 py-2.5 font-body text-xl"
      >
        {t('dealCards')}
      </button>
    </div>
  )
}
