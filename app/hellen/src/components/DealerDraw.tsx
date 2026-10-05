import { useEffect, useState } from 'react'
import type { Card, PlayerId, PlayerState } from '../types'
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
  const [revealed, setRevealed] = useState(0)
  const [highlightWinner, setHighlightWinner] = useState(false)

  useEffect(() => {
    setRevealed(0)
    setHighlightWinner(false)
  }, [cards])

  useEffect(() => {
    if (revealed < cards.length) {
      const t = window.setTimeout(() => setRevealed((n) => n + 1), 480)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setHighlightWinner(true), 350)
    return () => window.clearTimeout(t)
  }, [revealed, cards.length])

  const done = highlightWinner && winner !== null

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden px-2 py-1">
      <div className="panel w-full max-w-md shrink-0 px-3 py-2 text-center">
        <h2 className="font-pixel text-[12px] leading-relaxed text-forest-dark">Wie begint?</h2>
        <p className="mt-1 font-body text-lg leading-snug text-ink-soft">
          Harten is troef. Hoogste kaart mag beginnen.
        </p>
      </div>

      <div className="grid min-h-0 w-full max-w-md flex-1 grid-cols-2 grid-rows-2 gap-2">
        {players.map((p, i) => {
          const showCard = i < revealed
          const isWinner = done && winner === p.id
          return (
            <div
              key={p.id}
              className={[
                'panel flex min-h-0 flex-col items-center justify-center gap-1 px-2 py-2 transition-all duration-300',
                isWinner ? 'winner-glow ring-2 ring-terracotta scale-[1.03]' : '',
              ].join(' ')}
            >
              <BotPortrait id={p.portrait} size={48} active={isWinner} />
              <span className="max-w-full truncate font-body text-lg leading-none text-ink">
                {p.name}
              </span>
              <div className="flex h-16 items-center justify-center">
                {showCard && cards[i] ? (
                  <div className="animate-deal-fly">
                    <CardView card={cards[i]} small />
                  </div>
                ) : (
                  <div className="h-14 w-10 rounded-md border-[3px] border-dashed border-wood-dark/40 bg-beige-dark/30" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="panel w-full max-w-md shrink-0 px-3 py-1.5 text-center font-body text-xl leading-snug text-ink">
        {done ? message : revealed < cards.length ? 'Delen…' : 'Even kijken wie wint…'}
      </p>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!done}
        className="wood-btn w-full max-w-md shrink-0 py-2.5 font-body text-xl"
      >
        Deel de kaarten
      </button>
    </div>
  )
}
