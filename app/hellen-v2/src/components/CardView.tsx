import type { Card } from '../types'
import { RANK_LABELS, SUIT_SYMBOLS } from '../types'

interface Props {
  card: Card
  faceDown?: boolean
  selected?: boolean
  /** Dim illegal cards during play only — never during prediction */
  dimmed?: boolean
  small?: boolean
  onClick?: () => void
  className?: string
}

export function CardView({
  card,
  faceDown = false,
  selected = false,
  dimmed = false,
  small = false,
  onClick,
  className = '',
}: Props) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds'
  const ink = red ? '#c23b3b' : '#2a4a20'
  const w = small ? 'w-11 h-16' : 'w-14 h-[5.25rem] sm:w-16 sm:h-24'
  const corner = small ? 'text-sm' : 'text-base sm:text-lg'
  const pip = small ? 26 : 36

  if (faceDown) {
    return (
      <div
        className={`${w} overflow-hidden rounded-md border-[3px] border-wood-dark bg-sky-dark shadow-[2px_3px_0_rgba(58,46,31,0.3)] ${className}`}
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #5a849e 0 4px, #7ba3c4 4px 8px)',
        }}
        aria-hidden
      />
    )
  }

  const Comp = onClick ? 'button' : 'div'

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={Boolean(onClick) && dimmed}
      className={[
        w,
        'relative overflow-hidden rounded-md border-[3px] border-wood-dark bg-cream',
        'shadow-[2px_3px_0_rgba(58,46,31,0.25)]',
        'transition-transform duration-150',
        selected ? '-translate-y-3 ring-2 ring-terracotta' : '',
        onClick && !dimmed ? 'hover:-translate-y-2 active:translate-y-0' : '',
        dimmed ? 'opacity-45 grayscale-[0.25]' : '',
        className,
      ].join(' ')}
      aria-label={`${RANK_LABELS[card.rank]} ${card.suit}`}
    >
      <span
        className={`absolute top-0.5 left-1 z-10 font-body leading-none ${corner}`}
        style={{ color: ink }}
      >
        {RANK_LABELS[card.rank]}
        {SUIT_SYMBOLS[card.suit]}
      </span>
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center pt-2 font-body leading-none"
        style={{ fontSize: pip, color: ink }}
        aria-hidden
      >
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </Comp>
  )
}
