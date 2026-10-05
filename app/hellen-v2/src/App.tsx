import { useEffect, useState } from 'react'
import { DealerDraw } from './components/DealerDraw'
import { GameOver } from './components/GameOver'
import { GameTable } from './components/GameTable'
import { HelpModal } from './components/HelpModal'
import { PlayerHand } from './components/PlayerHand'
import { PredictionButtons } from './components/PredictionButtons'
import { Scoreboard } from './components/Scoreboard'
import { StartScreen } from './components/StartScreen'
import { tableDensity, type TableDensity } from './game/seats'
import { useGame } from './game/useGame'
import { useI18n } from './i18n'

const COLLECT_MS = 750

function useTableDensity(): TableDensity {
  const [density, setDensity] = useState<TableDensity>(() =>
    typeof window === 'undefined' ? 'roomy' : tableDensity(window.innerHeight),
  )

  useEffect(() => {
    const sync = () => {
      const h = window.visualViewport?.height ?? window.innerHeight
      setDensity(tableDensity(h))
    }
    sync()
    window.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('resize', sync)
    }
  }, [])

  return density
}

export default function App() {
  const game = useGame()
  const { t } = useI18n()
  const density = useTableDensity()
  const [helpOpen, setHelpOpen] = useState(false)
  const [collecting, setCollecting] = useState(false)

  useEffect(() => {
    if (game.phase !== 'trick-complete') setCollecting(false)
  }, [game.phase])

  useEffect(() => {
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [])

  if (game.phase === 'start') {
    return (
      <StartScreen
        maxCards={game.maxCards}
        setMaxCards={game.setMaxCards}
        playerCount={game.playerCount}
        setPlayerCount={game.setPlayerCount}
        onStart={game.startGame}
        density={density}
      />
    )
  }

  const inTablePhases =
    game.phase === 'dealing' ||
    game.phase === 'predicting' ||
    game.phase === 'prediction-pause' ||
    game.phase === 'prediction-summary' ||
    game.phase === 'playing' ||
    game.phase === 'trick-complete' ||
    game.phase === 'round-score'

  const showHand =
    game.phase === 'dealing' ||
    game.phase === 'playing' ||
    game.phase === 'predicting' ||
    game.phase === 'prediction-pause' ||
    game.phase === 'prediction-summary' ||
    game.phase === 'trick-complete'

  const handleNextTrick = () => {
    if (collecting || game.phase !== 'trick-complete') return
    setCollecting(true)
    window.setTimeout(() => {
      game.nextTrick()
      setCollecting(false)
    }, COLLECT_MS)
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="relative z-[60] w-full shrink-0">
        <Scoreboard
          players={game.players}
          roundIndex={game.roundIndex}
          totalRounds={game.totalRounds}
          cardsThisRound={game.cardsThisRound}
          currentPlayerId={game.currentPlayerId}
          roundHistory={game.roundHistory}
          onHelp={() => setHelpOpen(true)}
          onRestart={game.restart}
        />
      </div>

      {game.phase === 'dealer-draw' && (
        <DealerDraw
          players={game.players}
          cards={game.dealerDrawCards}
          winner={game.dealerDrawWinner}
          message={game.message}
          onConfirm={game.confirmDealerDraw}
        />
      )}

      {game.phase === 'game-over' && (
        <GameOver
          players={game.players}
          message={game.message}
          onRestart={game.restart}
          density={density}
        />
      )}

      {inTablePhases && (
        <>
          <p className="panel mt-1 h-7 w-full shrink-0 overflow-hidden px-2 py-0.5 text-center font-body text-base leading-none text-ellipsis whitespace-nowrap text-ink sm:h-8 sm:text-xl">
            {game.message}
          </p>

          <div className="relative mt-1 min-h-0 w-full flex-1">
            <GameTable
              players={game.players}
              currentTrick={game.currentTrick}
              currentPlayerId={game.currentPlayerId}
              lastTrickWinner={game.lastTrickWinner}
              starterId={game.starterId}
              phase={game.phase}
              announcement={game.announcement}
              announcingPlayerId={game.announcingPlayerId}
              summaryLine={game.summaryLine}
              collecting={collecting}
              cardsThisRound={game.cardsThisRound}
              density={density}
              onNextTrick={handleNextTrick}
              centerSlot={
                game.phase === 'predicting' &&
                game.isHumanTurn &&
                game.currentPlayerId !== null &&
                game.players[game.currentPlayerId]?.isHuman ? (
                  <PredictionButtons
                    max={game.players[0].hand.length}
                    onPredict={game.makePrediction}
                  />
                ) : null
              }
            />

            {game.phase === 'round-score' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#2a4a20]/45 p-2">
                <div className="panel w-full max-w-md overflow-hidden px-2.5 py-2">
                  <h3 className="text-center font-body text-lg text-ink sm:text-xl">
                    {t('roundScores')}
                  </h3>
                  <ul
                    className={
                      game.players.length >= 5
                        ? 'mt-1.5 grid grid-cols-2 gap-1'
                        : 'mt-1.5 flex flex-col gap-1'
                    }
                  >
                    {game.players.map((p) => {
                      const exact = p.prediction === p.tricksWon
                      const gained = (p.tricksWon ?? 0) + (exact ? 10 : 0)
                      return (
                        <li
                          key={p.id}
                          className={[
                            'flex items-center justify-between gap-1 rounded-md px-1.5 py-0.5 font-body leading-none text-ink',
                            game.players.length >= 7
                              ? 'text-sm'
                              : game.players.length >= 5
                                ? 'text-base'
                                : 'text-lg',
                            exact ? 'bg-[#c8e6b8]' : 'bg-[#f0c4c0]',
                          ].join(' ')}
                        >
                          <span className="min-w-0 truncate">
                            {p.name}: {p.tricksWon}/{p.prediction}
                            {exact ? ' ★' : ''}
                          </span>
                          <span className="shrink-0">+{gained} pt</span>
                        </li>
                      )
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={game.nextRound}
                    className="wood-btn mt-2 w-full py-2 font-body text-lg sm:text-xl"
                  >
                    {game.roundIndex >= game.totalRounds - 1
                      ? t('seeFinal')
                      : t('nextRound')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <PlayerHand
            hand={showHand ? game.players[0].hand : []}
            legalCardIds={game.legalCardIds}
            canPlay={game.phase === 'playing' && game.isHumanTurn}
            onPlay={game.playCard}
            dealing={game.phase === 'dealing'}
            density={density}
          />
        </>
      )}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
