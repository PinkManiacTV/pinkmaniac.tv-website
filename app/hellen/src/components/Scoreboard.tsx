import { useState } from 'react'
import type { PlayerState, RoundResult } from '../types'
import { BotPortrait } from './BotPortrait'

interface Props {
  players: PlayerState[]
  roundIndex: number
  totalRounds: number
  cardsThisRound: number
  currentPlayerId: number | null
  roundHistory: RoundResult[]
  onHelp?: () => void
  onRestart?: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

export function Scoreboard({
  players,
  roundIndex,
  totalRounds,
  cardsThisRound,
  currentPlayerId,
  roundHistory,
  onHelp,
  onRestart,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [restartOpen, setRestartOpen] = useState(false)

  const standings = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="panel relative w-full px-2 py-1">
      <div className="mb-2.5 flex h-8 items-center gap-1.5">
        <p className="min-w-0 flex-1 truncate font-body text-base leading-none text-ink sm:text-lg">
          {`Ronde ${Math.min(roundIndex + 1, Math.max(totalRounds, 1))}/${totalRounds || '—'}${
            cardsThisRound > 0
              ? ` · ${cardsThisRound} kaart${cardsThisRound === 1 ? '' : 'en'} · ♥`
              : ' · ♥'
          }`}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="wood-btn relative z-10 flex h-8 shrink-0 items-center px-2 font-body text-sm leading-none"
          aria-expanded={expanded}
        >
          {expanded ? '▲' : '▼'} Score
        </button>
        {onRestart ? (
          <button
            type="button"
            onClick={() => {
              setExpanded(false)
              setRestartOpen(true)
            }}
            className="wood-btn flex h-8 w-8 shrink-0 items-center justify-center"
            aria-label="Opnieuw beginnen"
            title="Opnieuw beginnen"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="square"
              strokeLinejoin="miter"
              aria-hidden
            >
              <path d="M3 12a9 9 0 1 0 9-9c-2.5 0-4.8 1-6.5 2.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        ) : null}
        {onHelp ? (
          <button
            type="button"
            onClick={onHelp}
            className="wood-btn flex h-8 w-8 shrink-0 items-center justify-center font-pixel text-[13px] leading-none"
            aria-label="Uitleg"
            title="Uitleg"
          >
            ?
          </button>
        ) : null}
      </div>

      {restartOpen && onRestart ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2a4a20]/55 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restart-title"
          onClick={() => setRestartOpen(false)}
        >
          <div
            className="panel w-full max-w-xs px-5 py-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="restart-title" className="font-body text-2xl leading-snug text-ink">
              Opnieuw starten?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRestartOpen(false)}
                className="wood-btn flex h-10 flex-1 items-center justify-center font-body text-xl"
              >
                Nee
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestartOpen(false)
                  onRestart()
                }}
                className="wood-btn flex h-10 flex-1 items-center justify-center font-body text-xl"
              >
                Ja
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-0.5">
        {players.map((p) => {
          const active = currentPlayerId === p.id
          return (
            <div
              key={p.id}
              className={[
                'flex min-w-0 flex-col items-center rounded-md px-0.5 py-0.5',
                active ? 'bg-beige-dark/70' : 'bg-transparent',
              ].join(' ')}
            >
              <BotPortrait id={p.portrait} size={32} active={active} />
              <span className="mt-0.5 max-w-full truncate font-body text-sm leading-none text-ink">
                {p.name}
              </span>
              <span className="font-body text-base leading-none text-ink">
                {p.score}
                <span className="ml-0.5 text-sm text-ink-soft">pt</span>
              </span>
            </div>
          )
        })}
      </div>

      {expanded && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[70dvh] overflow-auto rounded-xl border-[3px] border-wood-dark bg-beige-light p-1.5 shadow-[0_8px_0_rgba(58,46,31,0.25)]">
          <p className="mb-1 text-center font-body text-lg leading-none text-ink">Score per ronde</p>
          {roundHistory.length === 0 ? (
            <p className="py-1 text-center font-body text-base text-ink-soft">Nog geen rondes.</p>
          ) : (
            <table className="w-full min-w-[260px] border-collapse text-center font-body text-base leading-tight">
              <thead>
                <tr className="text-ink-soft">
                  <th className="w-10 px-0.5 py-0.5 font-normal" />
                  {players.map((p) => (
                    <th key={p.id} className="px-0.5 py-0.5 font-normal">
                      {p.name.slice(0, 6)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roundHistory.map((r) => (
                  <tr key={r.roundIndex}>
                    <td className="px-0.5 py-1 font-body text-2xl leading-none text-ink">
                      {r.cardsThisRound}
                    </td>
                    {players.map((p) => {
                      const exact = r.predictions[p.id] === r.tricksWon[p.id]
                      const pts = r.roundScores[p.id]
                      return (
                        <td key={p.id} className="px-0.5 py-0.5">
                          <div
                            className={[
                              'rounded px-0.5 py-0.5 leading-none',
                              exact ? 'bg-[#c8e6b8]' : 'bg-[#f0c4c0]',
                            ].join(' ')}
                          >
                            <div className="text-sm text-ink">
                              {r.tricksWon[p.id]}/{r.predictions[p.id]}
                              <span className="text-ink-soft"> +{pts}</span>
                            </div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="px-0.5 py-1.5 font-body text-lg leading-none text-ink">
                    totaal
                  </td>
                  {players.map((p) => (
                    <td
                      key={p.id}
                      className="px-0.5 py-1.5 font-body text-2xl font-bold leading-none text-ink"
                    >
                      {p.score}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}

          <div className="mt-1.5 border-t-2 border-wood-dark/20 pt-1.5">
            <p className="mb-1 text-center font-body text-lg leading-none text-ink">Stand</p>
            <ul className="space-y-0.5">
              {standings.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-1.5 rounded bg-beige/80 px-1.5 py-0.5 font-body text-lg leading-none text-ink"
                >
                  <span className="w-6 text-center text-lg" aria-hidden>
                    {i < 3 ? MEDALS[i] : i + 1}
                  </span>
                  <BotPortrait id={p.portrait} size={40} />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-bold">{p.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  )
}
