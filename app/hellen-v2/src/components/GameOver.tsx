import type { PlayerState } from '../types'
import { useI18n } from '../i18n'
import { BotPortrait } from './BotPortrait'

interface Props {
  players: PlayerState[]
  message: string
  onRestart: () => void
}

export function GameOver({ players, message, onRestart }: Props) {
  const { t } = useI18n()
  const ranked = [...players].sort((a, b) => b.score - a.score)
  const top = ranked[0]?.score ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-3 py-2">
      <div className="panel w-full max-w-md px-4 py-3 text-center">
        <h2 className="font-pixel text-[14px] leading-relaxed text-forest-dark">{t('gameOver')}</h2>
        <p className="mt-2 font-body text-xl leading-snug text-ink">{message}</p>

        <ul className="mt-3 space-y-1.5">
          {ranked.map((p, i) => (
            <li
              key={p.id}
              className={[
                'flex items-center gap-2 rounded-xl border-[3px] px-2.5 py-1.5',
                p.score === top
                  ? 'border-terracotta bg-beige-light'
                  : 'border-wood-dark/30 bg-beige/50',
              ].join(' ')}
            >
              <span className="w-5 font-body text-lg text-ink-soft">{i + 1}</span>
              <BotPortrait id={p.portrait} size={48} active={p.score === top} />
              <span className="flex-1 truncate text-left font-body text-xl text-ink">
                {p.name}
              </span>
              <span className="font-body text-2xl text-ink">{p.score}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onRestart}
          className="wood-btn mt-3 w-full py-2.5 font-body text-xl"
        >
          {t('playAgain')}
        </button>
      </div>
    </div>
  )
}
