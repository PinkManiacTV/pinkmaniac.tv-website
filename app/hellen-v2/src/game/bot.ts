import type { Card, Suit } from '../types'
import { TRUMP_SUIT } from '../types'
import { compareCards, legalCards } from './cards'

/**
 * Rule-first prediction for fixed hearts trump.
 * Dead off-suit cards cap maxBid so junk never bids a slam (e.g. A♥K♥ + 2♠ ≠ 3).
 */
export function botPredict(hand: Card[]): number {
  if (hand.length === 0) return 0

  const n = hand.length

  // --- Hard singleton rules (most important for short rounds) ---
  if (n === 1) {
    const c = hand[0]
    if (c.suit === TRUMP_SUIT) {
      if (c.rank >= 10) return 1
      if (c.rank >= 7) return Math.random() < 0.35 ? 1 : 0
      return 0
    }
    // Off-suit singleton: only Ace is a real bid; King sometimes
    if (c.rank === 14) return 1
    if (c.rank === 13) return Math.random() < 0.25 ? 1 : 0
    return 0 // Q and below off-suit alone = 0
  }

  const maxBid = maxBidFromHand(hand)

  let expected = 0
  for (const card of hand) {
    expected += winChance(card, n)
  }

  const suits: Suit[] = ['diamonds', 'clubs', 'spades']
  const voids = suits.filter((s) => !hand.some((c) => c.suit === s)).length
  const lowTrumps = hand.filter((c) => c.suit === TRUMP_SUIT && c.rank <= 10).length
  if (voids > 0 && lowTrumps > 0) {
    expected += Math.min(voids, lowTrumps) * (n <= 4 ? 0.3 : 0.18)
  }

  if (n <= 3) expected *= 1.05
  else if (n >= 8) expected *= 0.95

  let prediction = Math.round(expected)

  const trumps = hand.filter((c) => c.suit === TRUMP_SUIT)
  const premium = trumps.filter((c) => c.rank >= 12).length
  const strong = trumps.filter((c) => c.rank >= 11).length
  const midTrump = trumps.some((c) => c.rank >= 9)
  const highOff = hand.filter((c) => c.suit !== TRUMP_SUIT && c.rank >= 12).length

  if (premium > 0) prediction = Math.max(prediction, Math.min(premium, maxBid))
  if (strong > 0) prediction = Math.max(prediction, Math.min(1, maxBid))
  if (n <= 3 && midTrump) prediction = Math.max(prediction, Math.min(1, maxBid))
  if (n <= 3 && trumps.length > 0 && highOff > 0) {
    prediction = Math.max(prediction, Math.min(1, maxBid))
  }

  // Two-card junk with no trump / no high card stays 0
  if (n === 2) {
    const best = Math.max(...hand.map((c) => (c.suit === TRUMP_SUIT ? c.rank + 3 : c.rank)))
    if (trumps.length === 0 && best < 12) prediction = 0
  }

  prediction = Math.max(0, Math.min(maxBid, prediction))

  // Ceiling: never invent a trick from a worthless hand
  if (expected < 0.35 && premium === 0 && strong === 0 && !midTrump) {
    prediction = 0
  }

  // Tiny upward jitter ONLY inside maxBid — never invent a slam over dead cards
  if (
    Math.random() < 0.1 &&
    prediction >= 1 &&
    prediction < maxBid &&
    expected >= 0.55
  ) {
    prediction += 1
  }

  return Math.max(0, Math.min(maxBid, prediction))
}

/** Off-suit cards that almost never win a trick. Caps slam bids. */
export function maxBidFromHand(hand: Card[]): number {
  const n = hand.length
  if (n === 0) return 0
  let dead = 0
  for (const card of hand) {
    if (isDeadOffSuit(card, n)) dead += 1
  }
  return Math.max(0, n - dead)
}

function isDeadOffSuit(card: Card, handSize: number): boolean {
  if (card.suit === TRUMP_SUIT) return false
  return winChance(card, handSize) < 0.08
}

function winChance(card: Card, handSize: number): number {
  const short = handSize <= 3
  const mid = handSize <= 6

  if (card.suit === TRUMP_SUIT) {
    if (card.rank === 14) return short ? 1.0 : 0.98
    if (card.rank === 13) return short ? 0.98 : 0.9
    if (card.rank === 12) return short ? 0.9 : 0.72
    if (card.rank === 11) return short ? 0.75 : 0.55
    if (card.rank >= 9) return short ? 0.55 : mid ? 0.35 : 0.22
    if (card.rank >= 6) return short ? 0.28 : 0.12
    return short ? 0.15 : 0.05
  }

  if (card.rank === 14) return short ? 0.7 : mid ? 0.5 : 0.38
  if (card.rank === 13) return short ? 0.45 : mid ? 0.28 : 0.18
  if (card.rank === 12) return short ? 0.28 : mid ? 0.14 : 0.08
  if (card.rank === 11) return short ? 0.1 : 0.04
  return 0
}

function cardStrength(card: Card, leadSuit: Suit | null): number {
  if (card.suit === TRUMP_SUIT) return 100 + card.rank
  if (leadSuit && card.suit === leadSuit) return 50 + card.rank
  return card.rank
}

function wouldWinTrick(
  card: Card,
  handOwnerId: number,
  currentPlays: Array<{ playerId: number; card: Card }>,
): boolean {
  const plays = [...currentPlays, { playerId: handOwnerId, card }]
  const leadSuit = plays[0].card.suit
  let best = plays[0]
  for (let i = 1; i < plays.length; i += 1) {
    if (compareCards(plays[i].card, best.card, leadSuit) > 0) best = plays[i]
  }
  return best.playerId === handOwnerId
}

function shouldSpendTrump(
  card: Card,
  stillNeeds: number,
  tricksRemaining: number,
  currentPlays: Array<{ playerId: number; card: Card }>,
): boolean {
  if (card.suit !== TRUMP_SUIT) return true
  if (stillNeeds >= tricksRemaining) return true
  if (card.rank < 10 && currentPlays.length < 2 && stillNeeds <= 1) return false
  return card.rank >= 10 || currentPlays.length >= 2
}

export function botChooseCard(
  hand: Card[],
  leadSuit: Suit | null,
  currentPlays: Array<{ playerId: number; card: Card }>,
  prediction: number,
  tricksWon: number,
  playerId: number,
  tricksRemaining: number,
): Card {
  const legal = legalCards(hand, leadSuit)
  if (legal.length === 1) return legal[0]

  const stillNeeds = prediction - tricksWon
  const wantsToWin = stillNeeds > 0
  const mustDump = stillNeeds <= 0

  const sortedAsc = [...legal].sort(
    (a, b) => cardStrength(a, leadSuit) - cardStrength(b, leadSuit),
  )
  const sortedDesc = [...sortedAsc].reverse()

  if (mustDump) {
    const losers = sortedAsc.filter((c) => !wouldWinTrick(c, playerId, currentPlays))
    if (losers.length > 0) {
      const offSuit = losers.filter(
        (c) => leadSuit && c.suit !== leadSuit && c.suit !== TRUMP_SUIT,
      )
      const nonTrump = (offSuit.length ? offSuit : losers).filter((c) => c.suit !== TRUMP_SUIT)
      if (nonTrump.length > 0) return nonTrump[nonTrump.length - 1]
      return losers[0]
    }
    return sortedAsc[0]
  }

  if (wantsToWin) {
    const winners = sortedAsc.filter(
      (c) =>
        wouldWinTrick(c, playerId, currentPlays) &&
        shouldSpendTrump(c, stillNeeds, tricksRemaining, currentPlays),
    )
    if (winners.length > 0) return winners[0]

    const anyWinner = sortedAsc.filter((c) => wouldWinTrick(c, playerId, currentPlays))
    if (anyWinner.length > 0 && stillNeeds >= tricksRemaining) return anyWinner[0]

    if (!leadSuit) {
      const nonTrumpHigh = sortedDesc.find((c) => c.suit !== TRUMP_SUIT && c.rank >= 13)
      if (nonTrumpHigh) return nonTrumpHigh
      const topTrump = sortedDesc.find((c) => c.suit === TRUMP_SUIT && c.rank >= 12)
      if (topTrump) return topTrump
      const midTrump = sortedDesc.find((c) => c.suit === TRUMP_SUIT && c.rank >= 10)
      if (midTrump) return midTrump
      return sortedAsc.find((c) => c.suit !== TRUMP_SUIT) ?? sortedAsc[0]
    }

    return sortedAsc[0]
  }

  return sortedAsc[0]
}
