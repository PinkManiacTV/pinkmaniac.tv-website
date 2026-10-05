import type { CSSProperties, ReactNode } from 'react'
import type { Phase, PlayerId, PlayerState, TrickPlay } from '../types'
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
  centerSlot?: ReactNode
  onNextTrick?: () => void
}

function seatClass(playerId: number): string {
  switch (playerId) {
    case 0:
      return 'col-start-2 row-start-3 self-end'
    case 1:
      return 'col-start-1 row-start-2 self-center justify-self-start'
    case 2:
      return 'col-start-2 row-start-1 self-start'
    case 3:
      return 'col-start-3 row-start-2 self-center justify-self-end'
    default:
      return ''
  }
}

function cardSlotStyle(playerId: number, playIndex: number): CSSProperties {
  const spread = [
    { x: 0, y: 30, rot: -5 },
    { x: -36, y: 0, rot: -12 },
    { x: 0, y: -30, rot: 5 },
    { x: 36, y: 0, rot: 12 },
  ][playerId]
  return {
    left: '50%',
    top: '50%',
    zIndex: 10 + playIndex,
    ['--slot-x' as string]: `${spread.x}px`,
    ['--slot-y' as string]: `${spread.y}px`,
    ['--slot-rot' as string]: `${spread.rot}deg`,
  }
}

function speechClass(playerId: number): string {
  switch (playerId) {
    case 0:
      return 'speech-bubble speech-from-0'
    case 1:
      return 'speech-bubble speech-from-1'
    case 2:
      return 'speech-bubble speech-from-2'
    case 3:
      return 'speech-bubble speech-from-3'
    default:
      return 'speech-bubble'
  }
}

export function GameTable({
  players,
  currentTrick,
  currentPlayerId,
  lastTrickWinner,
  starterId,
  phase,
  announcement,
  announcingPlayerId,
  summaryLine,
  collecting = false,
  cardsThisRound,
  centerSlot,
  onNextTrick,
}: Props) {
  const trickDone = phase === 'trick-complete' && lastTrickWinner !== null
  const showAsked =
    (phase === 'playing' || phase === 'trick-complete') && Boolean(summaryLine)
  const dealing = phase === 'dealing'

  const askedTotal = players.reduce((sum, p) => sum + (p.prediction ?? 0), 0)

  return (
    <div className="relative h-full min-h-0 w-full">
      <div
        className="relative grid h-full min-h-0 w-full grid-cols-3 grid-rows-3 gap-0.5 rounded-2xl border-[4px] border-wood-dark p-1.5"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #5a8f4a 0%, #3d6b2f 70%, #2a4a20 100%)',
          boxShadow: 'inset 0 0 0 3px rgba(245,230,200,0.15), 0 8px 0 rgba(58,46,31,0.2)',
        }}
      >
        {showAsked && (
          <div className="asked-badge absolute top-2 left-2 z-30">
            {summaryLine ?? `${askedTotal}/${cardsThisRound} gevraagd`}
          </div>
        )}

        {players.map((p) => {
          const isTurn = currentPlayerId === p.id
          const won = trickDone && lastTrickWinner === p.id
          const isStarter = p.id === starterId
          const scoreLine =
            p.prediction === null ? '—' : `${p.tricksWon}/${p.prediction}`
          return (
            <div
              key={p.id}
              className={`${seatClass(p.id)} z-10 flex flex-col items-center`}
            >
              <div className="relative">
                <div
                  className={[
                    'relative flex w-[4.75rem] flex-col items-center gap-0.5 rounded-xl bg-beige px-1.5 py-1 shadow-sm',
                    isTurn ? 'ring-2 ring-terracotta' : '',
                    won ? 'animate-pop ring-2 ring-sky' : '',
                  ].join(' ')}
                >
                  {isStarter && !dealing && (
                    <span
                      className="dealer-chip absolute -top-2 -right-2"
                      title="Begint met voorspellen"
                      aria-label="Deler / eerste voorspeller"
                    >
                      ★
                    </span>
                  )}
                  <BotPortrait id={p.portrait} size={48} active={isTurn || Boolean(won)} />
                  <span className="mt-0.5 max-w-full truncate font-body text-base leading-none text-ink">
                    {p.name}
                  </span>
                  <span className="min-h-[1rem] font-pixel text-[13px] leading-none text-terracotta sm:text-[14px]">
                    {scoreLine}
                  </span>

                  {phase === 'prediction-pause' &&
                    announcingPlayerId === p.id &&
                    announcement && (
                      <div className={speechClass(p.id)} role="status">
                        {announcement}
                      </div>
                    )}
                </div>
                {p.id !== 0 && p.hand.length > 0 && (
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
            className="absolute z-40"
            style={{ top: '73%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <button
              type="button"
              onClick={onNextTrick}
              disabled={collecting}
              className="wood-btn px-3 py-1 font-body text-xl leading-none"
            >
              Volgende
            </button>
          </div>
        ) : null}

        {centerSlot ? (
          <div className="absolute top-1/2 left-1/2 z-30 w-[min(12.5rem,40%)] -translate-x-1/2 -translate-y-1/2">
            {centerSlot}
          </div>
        ) : null}

        <div
          className={[
            'pointer-events-none absolute top-1/2 left-1/2 z-20 h-[9.5rem] w-[9.5rem] -translate-x-1/2 -translate-y-1/2',
            collecting && lastTrickWinner !== null
              ? `animate-fly-pile-${lastTrickWinner}`
              : '',
          ].join(' ')}
        >
          {currentTrick.map((play, playIndex) => (
            <div
              key={`${play.playerId}-${play.card.id}-${playIndex}`}
              className={`absolute play-from-${play.playerId}`}
              style={cardSlotStyle(play.playerId, playIndex)}
            >
              <CardView card={play.card} />
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
