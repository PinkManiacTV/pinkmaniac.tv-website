import type { CSSProperties, ReactNode } from 'react'
import type { Phase, PlayerId, PlayerState, TrickPlay } from '../types'
import {
  pileRadius,
  portraitSize,
  seatPosition,
  speechInward,
  type TableDensity,
} from '../game/seats'
import { useI18n } from '../i18n'
import { BotPortrait } from './BotPortrait'
import { CardView } from './CardView'

interface Props {
  players: PlayerState[]
  currentTrick: TrickPlay[]
  currentPlayerId: number | null
  lastTrickWinner: number | null
  starterId: PlayerId
  phase: Phase
  announcement: string | null
  announcingPlayerId: PlayerId | null
  summaryLine: string | null
  collecting?: boolean
  cardsThisRound: number
  density: TableDensity
  centerSlot?: ReactNode
  onNextTrick?: () => void
}

function cardSlotStyle(
  playerId: number,
  playIndex: number,
  count: number,
  density: TableDensity,
): CSSProperties {
  const seat = seatPosition(playerId, count, density)
  const vx = seat.x - 50
  const vy = seat.y - 50
  const len = Math.hypot(vx, vy) || 1
  const radius = pileRadius(count, density)
  const dx = (vx / len) * radius
  const dy = (vy / len) * radius
  return {
    left: '50%',
    top: '50%',
    zIndex: 10 + playIndex,
    ['--slot-x' as string]: `${dx}px`,
    ['--slot-y' as string]: `${dy}px`,
    ['--slot-rot' as string]: `${vx * 0.2}deg`,
    ['--from-x' as string]: `${vx * 2.2}px`,
    ['--from-y' as string]: `${vy * 2.2}px`,
  }
}

export function GameTable({
  players,
  currentTrick,
  currentPlayerId,
  lastTrickWinner,
  starterId,
  phase,
  announcingPlayerId,
  summaryLine,
  collecting = false,
  cardsThisRound,
  density,
  centerSlot,
  onNextTrick,
}: Props) {
  const { t } = useI18n()
  const count = players.length
  const face = portraitSize(count, density)
  const trickDone = phase === 'trick-complete' && lastTrickWinner !== null
  const showAsked =
    (phase === 'playing' || phase === 'trick-complete') && Boolean(summaryLine)
  const dealing = phase === 'dealing'
  const tight = density === 'tight'
  const compact = density !== 'roomy'
  const plateW =
    count >= 7
      ? 'w-[3.9rem] px-1.5 py-1.5'
      : count >= 5
        ? 'w-[4.35rem] px-1.5 py-1.5'
        : 'w-[4.6rem] px-1.5 py-1.5'
  const pileBox =
    density === 'tight'
      ? 'h-[7.75rem] w-[7.75rem]'
      : density === 'compact'
        ? 'h-[11rem] w-[11rem]'
        : 'h-[15rem] w-[15rem]'
  const nextTop = '52%'

  const askedTotal = players.reduce((sum, p) => sum + (p.prediction ?? 0), 0)
  const winnerSeat =
    lastTrickWinner !== null
      ? seatPosition(lastTrickWinner, count, density)
      : { x: 50, y: 50 }

  return (
    <div className="relative h-full min-h-0 w-full">
      <div
        className="relative h-full min-h-0 w-full overflow-visible rounded-2xl border-[4px] border-wood-dark p-2.5"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #5a8f4a 0%, #3d6b2f 70%, #2a4a20 100%)',
          boxShadow: 'inset 0 0 0 3px rgba(245,230,200,0.15), 0 8px 0 rgba(58,46,31,0.2)',
        }}
      >
        {showAsked && (
          <div className="asked-badge absolute top-1.5 left-1.5 z-30">
            {summaryLine ?? t('asked', { asked: askedTotal, total: cardsThisRound })}
          </div>
        )}

        {players.map((p) => {
          const isTurn = currentPlayerId === p.id
          const won = trickDone && lastTrickWinner === p.id
          const isStarter = p.id === starterId
          const scoreLine =
            p.prediction === null ? '—' : `${p.tricksWon}/${p.prediction}`
          const seat = seatPosition(p.id, count, density)
          const announcing = phase === 'prediction-pause' && announcingPlayerId === p.id
          return (
            <div
              key={p.id}
              className={[
                'absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center',
                announcing ? 'z-30' : 'z-10',
              ].join(' ')}
              style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
            >
              <div className="relative">
                <div
                  className={[
                    'relative flex flex-col items-center gap-0.5 rounded-xl bg-beige shadow-sm',
                    plateW,
                    isTurn ? 'ring-2 ring-terracotta' : '',
                    won ? 'animate-pop ring-2 ring-sky' : '',
                  ].join(' ')}
                >
                  {isStarter && !dealing && (
                    <span
                      className="dealer-chip absolute -top-2 -right-2"
                      title={t('firstPredictor')}
                      aria-label={t('firstPredictor')}
                    >
                      ★
                    </span>
                  )}
                  <BotPortrait id={p.portrait} size={face} active={isTurn || Boolean(won)} />
                  <span
                    className={[
                      'max-w-full truncate font-body leading-none text-ink',
                      tight ? 'text-sm' : 'mt-0.5 text-base',
                    ].join(' ')}
                  >
                    {p.name}
                  </span>
                  <span className="min-h-[0.9rem] font-pixel text-[11px] leading-none text-terracotta sm:text-[14px]">
                    {scoreLine}
                  </span>

                  {phase === 'prediction-pause' &&
                    announcingPlayerId === p.id &&
                    p.prediction !== null && (
                      <div
                        className={`speech-bubble speech-in-${speechInward(p.id, count, density)}`}
                        role="status"
                      >
                        {p.prediction}!
                      </div>
                    )}
                </div>
                {p.id !== 0 && p.hand.length > 0 && density === 'roomy' && (
                  <div className="absolute top-full left-1/2 z-10 mt-1 flex -translate-x-1/2 -space-x-3">
                    {p.hand.slice(0, Math.min(p.hand.length, 5)).map((c, i) => (
                      <div
                        key={c.id}
                        className={dealing ? 'deal-pop-in' : undefined}
                        style={
                          dealing
                            ? { animationDelay: `${(i / Math.max(p.hand.length, 1)) * 0.85}s` }
                            : undefined
                        }
                      >
                        <CardView card={c} faceDown small className="!h-9 !w-6" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {phase === 'trick-complete' && onNextTrick ? (
          <div
            className="absolute z-30"
            style={{ top: nextTop, left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <button
              type="button"
              onClick={onNextTrick}
              disabled={collecting}
              className="wood-btn px-3 py-1 font-body text-xl leading-none"
            >
              {t('next')}
            </button>
          </div>
        ) : null}

        {centerSlot ? (
          <div className="absolute top-1/2 left-1/2 z-30 w-[min(13rem,46%)] -translate-x-1/2 -translate-y-1/2">
            {centerSlot}
          </div>
        ) : null}

        <div
          className={[
            'pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2',
            pileBox,
            collecting && lastTrickWinner !== null ? 'animate-fly-pile-seat' : '',
          ].join(' ')}
          style={
            collecting && lastTrickWinner !== null
              ? {
                  ['--fly-x' as string]: `${(winnerSeat.x - 50) * 1.15}%`,
                  ['--fly-y' as string]: `${(winnerSeat.y - 50) * 1.15}%`,
                }
              : undefined
          }
        >
          {currentTrick.map((play, playIndex) => (
            <div
              key={`${play.playerId}-${play.card.id}-${playIndex}`}
              className="absolute play-from-seat"
              style={cardSlotStyle(play.playerId, playIndex, count, density)}
            >
              <CardView card={play.card} small={compact || count >= 6} />
            </div>
          ))}
        </div>

        {phase === 'prediction-summary' && summaryLine && (
          <div className="absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-center px-6">
            <div className="animate-pop panel max-w-[85%] px-4 py-3 text-center">
              <p className="font-pixel text-[14px] leading-relaxed text-forest-dark sm:text-[16px]">
                {summaryLine}!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
