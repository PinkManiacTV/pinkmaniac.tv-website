import type { Card, Rank, Suit } from '../types'
import { TRUMP_SUIT } from '../types'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank })
    }
  }
  return deck
}

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function compareCards(a: Card, b: Card, leadSuit: Suit): number {
  const aTrump = a.suit === TRUMP_SUIT
  const bTrump = b.suit === TRUMP_SUIT
  if (aTrump && !bTrump) return 1
  if (!aTrump && bTrump) return -1
  if (aTrump && bTrump) return a.rank - b.rank

  const aLead = a.suit === leadSuit
  const bLead = b.suit === leadSuit
  if (aLead && !bLead) return 1
  if (!aLead && bLead) return -1
  if (aLead && bLead) return a.rank - b.rank
  return 0
}

export function winnerOfTrick(plays: Array<{ playerId: number; card: Card }>): number {
  if (plays.length === 0) throw new Error('Empty trick')
  const leadSuit = plays[0].card.suit
  let best = plays[0]
  for (let i = 1; i < plays.length; i += 1) {
    if (compareCards(plays[i].card, best.card, leadSuit) > 0) {
      best = plays[i]
    }
  }
  return best.playerId
}

export function legalCards(hand: Card[], leadSuit: Suit | null): Card[] {
  if (!leadSuit) return [...hand]
  const following = hand.filter((c) => c.suit === leadSuit)
  return following.length > 0 ? following : [...hand]
}

export function sortHand(hand: Card[]): Card[] {
  const suitOrder: Suit[] = ['hearts', 'spades', 'diamonds', 'clubs']
  return [...hand].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit)
    if (suitDiff !== 0) return suitDiff
    return b.rank - a.rank
  })
}

export function dealHands(deck: Card[], cardsPerPlayer: number, playerCount = 4): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  let idx = 0
  for (let c = 0; c < cardsPerPlayer; c += 1) {
    for (let p = 0; p < playerCount; p += 1) {
      hands[p].push(deck[idx])
      idx += 1
    }
  }
  return hands.map(sortHand)
}
