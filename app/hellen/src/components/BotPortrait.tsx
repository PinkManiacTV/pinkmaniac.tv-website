import type { BotPortraitId } from '../types'
import humanSrc from '../assets/portraits/human.png'
import yukiSrc from '../assets/portraits/yuki.png'
import maxSrc from '../assets/portraits/max.png'
import moppieSrc from '../assets/portraits/moppie.png'

const PORTRAITS: Record<BotPortraitId, string> = {
  human: humanSrc,
  yuki: yukiSrc,
  max: maxSrc,
  moppie: moppieSrc,
}

interface Props {
  id: BotPortraitId
  size?: number
  active?: boolean
  className?: string
}

/** Pixel-art bust portraits (PNG assets). */
export function BotPortrait({ id, size = 64, active = false, className = '' }: Props) {
  return (
    <div
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: active ? '0 0 0 3px #c46b4a' : '0 0 0 2px #6b4220',
        borderRadius: 8,
        background: '#f5e6c8',
      }}
      aria-hidden
    >
      <img
        src={PORTRAITS[id]}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  )
}
