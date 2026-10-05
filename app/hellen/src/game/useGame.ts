import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Card,
  Phase,
  PlayerId,
  PlayerState,
  RoundResult,
  Suit,
  TrickPlay,
} from '../types'
import { PLAYER_META, TRUMP_SUIT } from '../types'
import { botChooseCard, botPredict } from './bot'
import { createDeck, dealHands, legalCards, shuffle, winnerOfTrick } from './cards'
import { buildRoundSizes, nextPlayer, playerOrderFrom } from './rounds'
import { scoreRound } from './scoring'

/** Opening draw: hearts is trump, so any heart beats any non-heart. */
function compareDrawCards(a: Card, b: Card): number {
  const aTrump = a.suit === TRUMP_SUIT
  const bTrump = b.suit === TRUMP_SUIT
  if (aTrump && !bTrump) return 1
  if (!aTrump && bTrump) return -1
  if (a.rank !== b.rank) return a.rank - b.rank
  const order = { hearts: 3, spades: 2, diamonds: 1, clubs: 0 }
  return order[a.suit] - order[b.suit]
}

const DEAL_MS = 1000
const PREDICT_BOT_MS = 850
const PREDICT_PAUSE_MS = 1200
const PREDICT_SUMMARY_MS = 2200

function freshPlayers(humanName = 'Jij'): PlayerState[] {
  return PLAYER_META.map((meta) => ({
    ...meta,
    name: meta.isHuman ? humanName : meta.name,
    hand: [],
    prediction: null,
    tricksWon: 0,
    score: 0,
  }))
}

export interface GameApi {
  phase: Phase
  maxCards: number
  setMaxCards: (n: number) => void
  players: PlayerState[]
  roundIndex: number
  cardsThisRound: number
  totalRounds: number
  starterId: PlayerId
  currentPlayerId: PlayerId | null
  currentTrick: TrickPlay[]
  lastTrickWinner: PlayerId | null
  dealerDrawCards: Card[]
  dealerDrawWinner: PlayerId | null
  message: string
  announcement: string | null
  announcingPlayerId: PlayerId | null
  summaryLine: string | null
  roundHistory: RoundResult[]
  startGame: (playerName: string) => void
  confirmDealerDraw: () => void
  makePrediction: (value: number) => void
  playCard: (cardId: string) => void
  nextTrick: () => void
  nextRound: () => void
  restart: () => void
  legalCardIds: string[]
  isHumanTurn: boolean
}

export function useGame(): GameApi {
  const [phase, setPhase] = useState<Phase>('start')
  const [maxCards, setMaxCards] = useState(7)
  const [players, setPlayers] = useState<PlayerState[]>(freshPlayers)
  const [roundSizes, setRoundSizes] = useState<number[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [starterId, setStarterId] = useState<PlayerId>(0)
  const [currentPlayerId, setCurrentPlayerId] = useState<PlayerId | null>(null)
  const [currentTrick, setCurrentTrick] = useState<TrickPlay[]>([])
  const [lastTrickWinner, setLastTrickWinner] = useState<PlayerId | null>(null)
  const [dealerDrawCards, setDealerDrawCards] = useState<Card[]>([])
  const [dealerDrawWinner, setDealerDrawWinner] = useState<PlayerId | null>(null)
  const [message, setMessage] = useState('Kies max kaarten en start het spel.')
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [announcingPlayerId, setAnnouncingPlayerId] = useState<PlayerId | null>(null)
  const [summaryLine, setSummaryLine] = useState<string | null>(null)
  const [roundHistory, setRoundHistory] = useState<RoundResult[]>([])
  const [leadSuit, setLeadSuit] = useState<Suit | null>(null)
  const botTimer = useRef<number | null>(null)
  const pauseTimer = useRef<number | null>(null)

  const cardsThisRound = roundSizes[roundIndex] ?? 0
  const totalRounds = roundSizes.length

  const clearBotTimer = () => {
    if (botTimer.current !== null) {
      window.clearTimeout(botTimer.current)
      botTimer.current = null
    }
  }

  const clearPauseTimer = () => {
    if (pauseTimer.current !== null) {
      window.clearTimeout(pauseTimer.current)
      pauseTimer.current = null
    }
  }

  const restart = useCallback(() => {
    clearBotTimer()
    clearPauseTimer()
    setPhase('start')
    setPlayers(freshPlayers())
    setRoundSizes([])
    setRoundIndex(0)
    setStarterId(0)
    setCurrentPlayerId(null)
    setCurrentTrick([])
    setLastTrickWinner(null)
    setDealerDrawCards([])
    setDealerDrawWinner(null)
    setLeadSuit(null)
    setAnnouncement(null)
    setAnnouncingPlayerId(null)
    setSummaryLine(null)
    setRoundHistory([])
    setMessage('Kies max kaarten en start het spel.')
  }, [])

  const startGame = useCallback((playerName: string) => {
    clearBotTimer()
    clearPauseTimer()
    const clamped = Math.max(3, Math.min(13, maxCards))
    const name = playerName.trim().slice(0, 16) || 'Jij'
    const nextPlayers = freshPlayers(name)
    setMaxCards(clamped)
    setRoundSizes(buildRoundSizes(clamped))
    setRoundIndex(0)
    setPlayers(nextPlayers)
    setCurrentTrick([])
    setLastTrickWinner(null)
    setLeadSuit(null)
    setAnnouncement(null)
    setAnnouncingPlayerId(null)
    setSummaryLine(null)
    setRoundHistory([])

    const draw = shuffle(createDeck()).slice(0, 4)
    setDealerDrawCards(draw)
    let winner: PlayerId = 0
    for (let i = 1; i < 4; i += 1) {
      if (compareDrawCards(draw[i], draw[winner]) > 0) winner = i as PlayerId
    }
    setDealerDrawWinner(winner)
    setStarterId(winner)
    setPhase('dealer-draw')
    setMessage(`${nextPlayers[winner].name} heeft de hoogste kaart en begint!`)
  }, [maxCards])

  const dealRound = useCallback(
    (roundIdx: number, sizes: number[], startId: PlayerId, basePlayers: PlayerState[]) => {
      const n = sizes[roundIdx]
      const deck = shuffle(createDeck())
      const hands = dealHands(deck, n, 4)
      const dealt = basePlayers.map((p, i) => ({
        ...p,
        hand: hands[i],
        prediction: null,
        tricksWon: 0,
      }))
      setPlayers(dealt)
      setCurrentTrick([])
      setLastTrickWinner(null)
      setLeadSuit(null)
      setAnnouncement(null)
      setAnnouncingPlayerId(null)
      setSummaryLine(null)
      setStarterId(startId)
      setCurrentPlayerId(null)
      setPhase('dealing')
      setMessage(`Ronde ${roundIdx + 1}: kaarten delen…`)
    },
    [],
  )

  const confirmDealerDraw = useCallback(() => {
    if (dealerDrawWinner === null) return
    dealRound(0, roundSizes, dealerDrawWinner, players)
  }, [dealRound, dealerDrawWinner, players, roundSizes])

  /** Highest prediction leads; ties → first in prediction order. */
  const leadFromPredictions = useCallback(
    (updatedPlayers: PlayerState[], predictOrderStart: PlayerId): PlayerId => {
      const order = playerOrderFrom(predictOrderStart)
      let bestId = order[0] as PlayerId
      let bestPred = updatedPlayers[bestId].prediction ?? 0
      for (let i = 1; i < order.length; i += 1) {
        const id = order[i] as PlayerId
        const pred = updatedPlayers[id].prediction ?? 0
        if (pred > bestPred) {
          bestPred = pred
          bestId = id
        }
      }
      return bestId
    },
    [],
  )

  const beginPlay = useCallback((updatedPlayers: PlayerState[], leadId: PlayerId) => {
    setPlayers(updatedPlayers)
    setCurrentPlayerId(leadId)
    setAnnouncement(null)
    setAnnouncingPlayerId(null)
    setPhase('playing')
    setMessage(`${updatedPlayers[leadId].name} speelt uit.`)
  }, [])

  const showPredictionSummary = useCallback(
    (updatedPlayers: PlayerState[], predictOrderStart: PlayerId, cardsInRound: number) => {
      const totalAsked = updatedPlayers.reduce((sum, p) => sum + (p.prediction ?? 0), 0)
      const line = `${totalAsked}/${cardsInRound} gevraagd`
      const leadId = leadFromPredictions(updatedPlayers, predictOrderStart)
      setPlayers(updatedPlayers)
      setCurrentPlayerId(null)
      setAnnouncement(null)
      setAnnouncingPlayerId(null)
      setSummaryLine(line)
      setPhase('prediction-summary')
      setMessage(`${totalAsked} / ${cardsInRound} gevraagd!`)

      clearPauseTimer()
      pauseTimer.current = window.setTimeout(() => {
        beginPlay(updatedPlayers, leadId)
      }, PREDICT_SUMMARY_MS)
    },
    [beginPlay, leadFromPredictions],
  )

  const continueAfterPrediction = useCallback(
    (updatedPlayers: PlayerState[], fromPlayer: PlayerId) => {
      const order = playerOrderFrom(starterId)
      const fromPos = order.indexOf(fromPlayer)
      if (fromPos < 3) {
        const next = order[fromPos + 1] as PlayerId
        setCurrentPlayerId(next)
        setPlayers(updatedPlayers)
        setAnnouncement(null)
        setAnnouncingPlayerId(null)
        setPhase('predicting')
        if (updatedPlayers[next].isHuman) {
          setMessage('Jouw voorspelling — kies hoeveel slagen je haalt.')
        } else {
          setMessage(`${updatedPlayers[next].name} denkt na…`)
        }
        return
      }

      showPredictionSummary(updatedPlayers, starterId, updatedPlayers[0].hand.length)
    },
    [showPredictionSummary, starterId],
  )

  const announcePrediction = useCallback(
    (updatedPlayers: PlayerState[], fromPlayer: PlayerId, value: number) => {
      const name = updatedPlayers[fromPlayer].name
      const line =
        value === 1
          ? `${name} voorspelt 1 slag!`
          : `${name} voorspelt ${value} slagen!`
      setPlayers(updatedPlayers)
      setCurrentPlayerId(null)
      setAnnouncement(line)
      setAnnouncingPlayerId(fromPlayer)
      setPhase('prediction-pause')
      setMessage(line)

      clearPauseTimer()
      pauseTimer.current = window.setTimeout(() => {
        continueAfterPrediction(updatedPlayers, fromPlayer)
      }, PREDICT_PAUSE_MS)
    },
    [continueAfterPrediction],
  )

  const makePrediction = useCallback(
    (value: number) => {
      if (phase !== 'predicting' || currentPlayerId === null) return
      const actor = players[currentPlayerId]
      if (!actor.isHuman) return
      if (value < 0 || value > actor.hand.length) return

      const updated = players.map((p) =>
        p.id === currentPlayerId ? { ...p, prediction: value } : p,
      )
      announcePrediction(updated, currentPlayerId, value)
    },
    [announcePrediction, currentPlayerId, phase, players],
  )

  const finishTrick = useCallback(
    (plays: TrickPlay[], handsAfter: PlayerState[]) => {
      const winner = winnerOfTrick(plays) as PlayerId
      const withTricks = handsAfter.map((p) =>
        p.id === winner ? { ...p, tricksWon: p.tricksWon + 1 } : p,
      )
      setPlayers(withTricks)
      setLastTrickWinner(winner)
      setCurrentTrick(plays)
      setCurrentPlayerId(null)
      setPhase('trick-complete')
      setMessage(`${withTricks[winner].name} wint de slag!`)
    },
    [],
  )

  const playCardAs = useCallback(
    (playerId: PlayerId, card: Card, statePlayers: PlayerState[], trick: TrickPlay[]) => {
      const lead = trick.length === 0 ? card.suit : leadSuit ?? trick[0].card.suit
      if (trick.length === 0) setLeadSuit(card.suit)

      const legal = legalCards(statePlayers[playerId].hand, trick.length === 0 ? null : lead)
      if (!legal.some((c) => c.id === card.id)) return

      const nextTrick = [...trick, { playerId, card }]
      const nextPlayers = statePlayers.map((p) =>
        p.id === playerId ? { ...p, hand: p.hand.filter((c) => c.id !== card.id) } : p,
      )

      if (nextTrick.length === 4) {
        finishTrick(nextTrick, nextPlayers)
        return
      }

      const nxt = nextPlayer(playerId) as PlayerId
      setPlayers(nextPlayers)
      setCurrentTrick(nextTrick)
      setCurrentPlayerId(nxt)
      setLeadSuit(lead)
      setMessage(`${nextPlayers[nxt].name} is aan de beurt.`)
    },
    [finishTrick, leadSuit],
  )

  const playCard = useCallback(
    (cardId: string) => {
      if (phase !== 'playing' || currentPlayerId === null) return
      const human = players[currentPlayerId]
      if (!human.isHuman) return
      const card = human.hand.find((c) => c.id === cardId)
      if (!card) return
      playCardAs(currentPlayerId, card, players, currentTrick)
    },
    [currentPlayerId, currentTrick, phase, playCardAs, players],
  )

  const applyRoundScores = useCallback((statePlayers: PlayerState[]) => {
    return statePlayers.map((p) => ({
      ...p,
      score: p.score + scoreRound(p.prediction ?? 0, p.tricksWon),
      hand: [],
    }))
  }, [])

  const nextTrick = useCallback(() => {
    if (phase !== 'trick-complete' || lastTrickWinner === null) return

    const handsEmpty = players.every((p) => p.hand.length === 0)
    if (handsEmpty) {
      const roundScores = players.map((p) => scoreRound(p.prediction ?? 0, p.tricksWon))
      const historyEntry: RoundResult = {
        roundIndex,
        cardsThisRound: cardsThisRound,
        predictions: players.map((p) => p.prediction ?? 0),
        tricksWon: players.map((p) => p.tricksWon),
        roundScores,
      }
      setRoundHistory((prev) => [...prev, historyEntry])

      const scored = applyRoundScores(players)
      setPlayers(scored)
      setPhase('round-score')
      setMessage(
        roundIndex >= roundSizes.length - 1
          ? 'Laatste ronde klaar — bekijk de scores.'
          : 'Ronde klaar — bekijk de scores.',
      )
      setCurrentTrick([])
      setLeadSuit(null)
      return
    }

    setCurrentTrick([])
    setLeadSuit(null)
    setCurrentPlayerId(lastTrickWinner)
    setPhase('playing')
    setMessage(`${players[lastTrickWinner].name} speelt uit.`)
  }, [
    applyRoundScores,
    cardsThisRound,
    lastTrickWinner,
    phase,
    players,
    roundIndex,
    roundSizes.length,
  ])

  const nextRound = useCallback(() => {
    if (phase !== 'round-score') return
    if (roundIndex >= roundSizes.length - 1) {
      setPhase('game-over')
      const top = Math.max(...players.map((p) => p.score))
      const winners = players.filter((p) => p.score === top)
      setMessage(
        winners.length > 1
          ? `Gelijkspel! ${winners.map((w) => w.name).join(' & ')} met ${top} punten.`
          : `${winners[0].name} wint met ${top} punten!`,
      )
      return
    }
    const nextIdx = roundIndex + 1
    const nextStart = nextPlayer(starterId) as PlayerId
    setRoundIndex(nextIdx)
    dealRound(nextIdx, roundSizes, nextStart, players)
  }, [dealRound, phase, players, roundIndex, roundSizes, starterId])

  // Fixed 1s deal animation, regardless of hand size
  useEffect(() => {
    if (phase !== 'dealing') return
    clearPauseTimer()
    pauseTimer.current = window.setTimeout(() => {
      setCurrentPlayerId(starterId)
      setPhase('predicting')
      setMessage(
        `Ronde ${roundIndex + 1}: ${cardsThisRound} kaart${cardsThisRound === 1 ? '' : 'en'}. Voorspel je slagen!`,
      )
    }, DEAL_MS)
    return clearPauseTimer
  }, [phase, starterId, roundIndex, cardsThisRound])

  useEffect(() => {
    clearBotTimer()
    if (currentPlayerId === null) return
    const actor = players[currentPlayerId]
    if (actor.isHuman) return

    if (phase === 'predicting' && actor.prediction === null) {
      botTimer.current = window.setTimeout(() => {
        const value = botPredict(actor.hand)
        const updated = players.map((p) =>
          p.id === currentPlayerId ? { ...p, prediction: value } : p,
        )
        announcePrediction(updated, currentPlayerId, value)
      }, PREDICT_BOT_MS + Math.random() * 350)
      return clearBotTimer
    }

    if (phase === 'playing') {
      botTimer.current = window.setTimeout(() => {
        const lead = currentTrick.length === 0 ? null : (leadSuit ?? currentTrick[0].card.suit)
        const card = botChooseCard(
          actor.hand,
          lead,
          currentTrick,
          actor.prediction ?? 0,
          actor.tricksWon,
          currentPlayerId,
          actor.hand.length,
        )
        playCardAs(currentPlayerId, card, players, currentTrick)
      }, 420 + Math.random() * 280)
      return clearBotTimer
    }

    return clearBotTimer
  }, [
    announcePrediction,
    currentPlayerId,
    currentTrick,
    leadSuit,
    phase,
    playCardAs,
    players,
  ])

  useEffect(() => () => {
    clearBotTimer()
    clearPauseTimer()
  }, [])

  const legalCardIds = useMemo(() => {
    if (phase !== 'playing' || currentPlayerId === null) return []
    const actor = players[currentPlayerId]
    if (!actor.isHuman) return []
    const lead = currentTrick.length === 0 ? null : (leadSuit ?? currentTrick[0].card.suit)
    return legalCards(actor.hand, lead).map((c) => c.id)
  }, [currentPlayerId, currentTrick, leadSuit, phase, players])

  const isHumanTurn =
    currentPlayerId !== null &&
    players[currentPlayerId]?.isHuman === true &&
    phase === 'predicting'

  const isHumanPlayTurn =
    currentPlayerId !== null &&
    players[currentPlayerId]?.isHuman === true &&
    phase === 'playing'

  return {
    phase,
    maxCards,
    setMaxCards,
    players,
    roundIndex,
    cardsThisRound,
    totalRounds,
    starterId,
    currentPlayerId,
    currentTrick,
    lastTrickWinner,
    dealerDrawCards,
    dealerDrawWinner,
    message,
    announcement,
    announcingPlayerId,
    summaryLine,
    roundHistory,
    startGame,
    confirmDealerDraw,
    makePrediction,
    playCard,
    nextTrick,
    nextRound,
    restart,
    legalCardIds,
    isHumanTurn: isHumanTurn || isHumanPlayTurn,
  }
}
