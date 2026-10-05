import { useEffect, useRef, useState } from 'react'
import type { Card } from '../types'
import type { TableDensity } from '../game/seats'
import { useI18n } from '../i18n'
import { CardView } from './CardView'

interface Props {
  hand: Card[]
  legalCardIds: string[]
  canPlay: boolean
  onPlay: (cardId: string) => void
  dealing?: boolean
  density: TableDensity
}

function handMetrics(density: TableDensity) {
  if (density === 'tight') {
    return { slot: 'h-[6.25rem]', card: '!h-16 !w-11 !-translate-y-0', cardW: 44 }
  }
  if (density === 'compact') {
    return { slot: 'h-[7rem]', card: '!h-[4.75rem] !w-12', cardW: 48 }
  }
  return { slot: 'h-[8.25rem]', card: '!h-24 !w-16', cardW: 64 }
}

export function PlayerHand({
  hand,
  legalCardIds,
  canPlay,
  onPlay,
  dealing = false,
  density,
}: Props) {
  const { t } = useI18n()
  const railRef = useRef<HTMLDivElement>(null)
  const [railW, setRailW] = useState(320)
  const [showTurnHint, setShowTurnHint] = useState(false)
  const { slot, card, cardW } = handMetrics(density)

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    const sync = () => setRailW(el.clientWidth)
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    sync()
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!canPlay) {
      setShowTurnHint(false)
      return
    }
    const id = window.setTimeout(() => setShowTurnHint(true), 2000)
    return () => window.clearTimeout(id)
  }, [canPlay])

  const legalSet = new Set(legalCardIds)
  const n = hand.length
  const mid = (n - 1) / 2
  const maxSpread = Math.max(0, railW - cardW - 8)
  const step = n <= 1 ? 0 : Math.min(density === 'tight' ? 36 : 48, maxSpread / (n - 1))
  const rotStep = n <= 1 ? 0 : Math.min(5.5, 32 / n)
  const nameSize = density === 'tight' ? 'text-sm' : 'text-base'

  return (
    <div className={`${slot} flex w-full shrink-0 flex-col overflow-visible px-1 pt-0.5 pb-1`}>
      <div ref={railRef} className="relative min-h-0 w-full flex-1">
        {hand.map((cardItem, i) => {
          const legal = !canPlay || legalSet.has(cardItem.id)
          const dimmed = canPlay && !legalSet.has(cardItem.id)
          const offset = i - mid
          const rot = offset * rotStep
          const x = offset * step
          return (
            <div
              key={cardItem.id}
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
                  card={cardItem}
                  dimmed={dimmed}
                  selected={canPlay && legal}
                  onClick={canPlay && legal ? () => onPlay(cardItem.id) : undefined}
                  className={card}
                />
              </div>
            </div>
          )
        })}
      </div>
      <p
        className={`h-4 shrink-0 text-center font-body leading-none text-ink ${nameSize}`}
        aria-live="polite"
      >
        {showTurnHint ? t('yourTurnHint') : '\u00a0'}
      </p>
    </div>
  )
}
