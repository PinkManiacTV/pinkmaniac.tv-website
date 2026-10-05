import type { PlayerState } from '../types'
import type { TableDensity } from '../game/seats'
import { useI18n } from '../i18n'
import { BotPortrait } from './BotPortrait'

interface Props {
  players: PlayerState[]
  message: string
  onRestart: () => void
  density: TableDensity
}

export function GameOver({ players, message, onRestart, density }: Props) {
  const { t } = useI18n()
  const ranked = [...players].sort((a, b) => b.score - a.score)
  const top = ranked[0]?.score ?? 0
  const twoCol = ranked.length >= 5
  const face = density === 'tight' ? 28 : twoCol ? 32 : 48

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-3 py-2">
      <div className="panel w-full max-w-md overflow-hidden px-3 py-2.5 text-center">
        <h2 className="font-pixel text-[13px] leading-relaxed text-forest-dark">{t('gameOver')}</h2>
        <p className="mt-1.5 font-body text-lg leading-snug text-ink sm:text-xl">{message}</p>

        <ul
          className={
            twoCol ? 'mt-2 grid grid-cols-2 gap-1' : 'mt-2 flex flex-col gap-1'
          }
        >
          {ranked.map((p, i) => (
            <li
              key={p.id}
              className={[
                'flex items-center gap-1.5 rounded-xl border-[3px] px-1.5 py-1',
                p.score === top
                  ? 'border-terracotta bg-beige-light'
                  : 'border-wood-dark/30 bg-beige/50',
              ].join(' ')}
            >
              <span className="w-4 shrink-0 font-body text-base text-ink-soft">{i + 1}</span>
              <BotPortrait id={p.portrait} size={face} active={p.score === top} />
              <span className="min-w-0 flex-1 truncate text-left font-body text-lg text-ink">
                {p.name}
              </span>
              <span className="shrink-0 font-body text-xl text-ink">{p.score}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onRestart}
          className="wood-btn mt-2.5 w-full py-2 font-body text-xl"
        >
          {t('playAgain')}
        </button>
      </div>
    </div>
  )
}
