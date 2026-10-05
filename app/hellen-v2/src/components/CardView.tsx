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
  const w = small ? 'w-12 h-[4.5rem]' : 'w-16 h-24 sm:w-[4.5rem] sm:h-[6.5rem]'
  const text = small ? 'text-base' : 'text-lg sm:text-xl'

  if (faceDown) {
    return (
      <div
        className={`${w} rounded-md border-[3px] border-wood-dark bg-sky-dark shadow-[2px_3px_0_rgba(58,46,31,0.3)] ${className}`}
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
        'flex flex-col items-center justify-between p-1',
        'transition-transform duration-150',
        selected ? '-translate-y-3 ring-2 ring-terracotta' : '',
        onClick && !dimmed ? 'hover:-translate-y-2 active:translate-y-0' : '',
        dimmed ? 'opacity-45 grayscale-[0.25]' : '',
        className,
      ].join(' ')}
      aria-label={`${RANK_LABELS[card.rank]} ${card.suit}`}
    >
      <span
        className={`self-start font-body leading-none ${text}`}
        style={{ color: red ? '#c23b3b' : '#2a4a20' }}
      >
        {RANK_LABELS[card.rank]}
        {SUIT_SYMBOLS[card.suit]}
      </span>
      <span
        className="font-body leading-none"
        style={{ fontSize: small ? 22 : 30, color: red ? '#c23b3b' : '#2a4a20' }}
      >
        {SUIT_SYMBOLS[card.suit]}
      </span>
      <span
        className={`self-end rotate-180 font-body leading-none ${text}`}
        style={{ color: red ? '#c23b3b' : '#2a4a20' }}
      >
        {RANK_LABELS[card.rank]}
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </Comp>
  )
}
