import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Card, Rank, Suit } from '../types'
import { botPredict, maxBidFromHand } from './bot'

function c(suit: Suit, rank: Rank): Card {
  return { id: `${suit}-${rank}`, suit, rank }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('maxBidFromHand', () => {
  it('caps slam when hand has a dead off-suit', () => {
    expect(maxBidFromHand([c('hearts', 14), c('hearts', 13), c('spades', 2)])).toBe(2)
  })

  it('is 0 for all-junk off-suit', () => {
    expect(maxBidFromHand([c('spades', 2), c('clubs', 3), c('diamonds', 5)])).toBe(0)
  })
})

describe('botPredict', () => {
  it('never bids 3 with A♥ K♥ + 2♠ even when jitter fires', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // force jitter branch if reached
    const hand = [c('hearts', 14), c('hearts', 13), c('spades', 2)]
    for (let i = 0; i < 30; i += 1) {
      expect(botPredict(hand)).toBeLessThanOrEqual(2)
    }
  })

  it('singleton diamond 5 always bids 0', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(botPredict([c('diamonds', 5)])).toBe(0)
    }
  })

  it('singleton heart Ace always bids 1', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(botPredict([c('hearts', 14)])).toBe(1)
    }
  })

  it('two-card junk without trump bids 0', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(botPredict([c('spades', 2), c('clubs', 4)])).toBe(0)
    }
  })

  it('strong trump trio can still bid 3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // no upward jitter
    const hand = [c('hearts', 14), c('hearts', 13), c('hearts', 12)]
    expect(botPredict(hand)).toBe(3)
  })

  it('A♥ K♥ J♥ may bid 3 (statistically near-certain)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(botPredict([c('hearts', 14), c('hearts', 13), c('hearts', 11)])).toBe(3)
    expect(maxBidFromHand([c('hearts', 14), c('hearts', 13), c('hearts', 11)])).toBe(3)
  })
})
