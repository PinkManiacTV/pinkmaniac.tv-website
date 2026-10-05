import { useEffect, useRef, useState } from 'react'
import type { Card } from '../types'
import { CardView } from './CardView'

const CARD_W = 64

interface Props {
  hand: Card[]
  legalCardIds: string[]
  canPlay: boolean
  onPlay: (cardId: string) => void
  dealing?: boolean
}

export function PlayerHand({ hand, legalCardIds, canPlay, onPlay, dealing = false }: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const [railW, setRailW] = useState(320)

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    const sync = () => setRailW(el.clientWidth)
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    sync()
    return () => ro.disconnect()
  }, [])

  const legalSet = new Set(legalCardIds)
  const n = hand.length
  const mid = (n - 1) / 2
  const maxSpread = Math.max(0, railW - CARD_W - 8)
  const step = n <= 1 ? 0 : Math.min(48, maxSpread / (n - 1))
  const rotStep = n <= 1 ? 0 : Math.min(5.5, 32 / n)

  return (
    <div className="h-[7.25rem] w-full shrink-0 px-1 pt-0.5 pb-0.5">
      <div ref={railRef} className="relative mx-auto h-full w-full">
        {hand.map((card, i) => {
          const legal = !canPlay || legalSet.has(card.id)
          const dimmed = canPlay && !legalSet.has(card.id)
          const offset = i - mid
          const rot = offset * rotStep
          const x = offset * step
          return (
            <div
              key={card.id}
              className="absolute bottom-0 left-1/2 will-change-transform"
              style={{
                zIndex: canPlay && legal ? 40 + i : 10 + i,
                transform: `translateX(calc(-50% + ${x}px)) rotate(${rot}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div
                className={dealing ? 'deal-pop-in' : undefined}
                style={
                  dealing
                    ? { animationDelay: `${(i / Math.max(n, 1)) * 0.85}s` }
                    : undefined
                }
              >
                <CardView
                  card={card}
                  dimmed={dimmed}
                  selected={canPlay && legal}
                  onClick={canPlay && legal ? () => onPlay(card.id) : undefined}
                  className="!h-24 !w-16"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
