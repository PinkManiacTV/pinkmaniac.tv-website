export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  id: string
  suit: Suit
  rank: Rank
}

export type PlayerId = 0 | 1 | 2 | 3

export interface PlayerState {
  id: PlayerId
  name: string
  isHuman: boolean
  portrait: BotPortraitId
  hand: Card[]
  prediction: number | null
  tricksWon: number
  score: number
}

export type BotPortraitId = 'human' | 'yuki' | 'max' | 'moppie'

export type Phase =
  | 'start'
  | 'dealer-draw'
  | 'dealing'
  | 'predicting'
  | 'prediction-pause'
  | 'prediction-summary'
  | 'playing'
  | 'trick-complete'
  | 'round-score'
  | 'game-over'

export interface TrickPlay {
  playerId: PlayerId
  card: Card
}

export interface RoundResult {
  roundIndex: number
  cardsThisRound: number
  predictions: number[]
  tricksWon: number[]
  roundScores: number[]
}

export interface GameConfig {
  maxCards: number
}

export const TRUMP_SUIT: Suit = 'hearts'

export const SUIT_LABELS: Record<Suit, string> = {
  hearts: 'Harten',
  diamonds: 'Ruiten',
  clubs: 'Klaveren',
  spades: 'Schoppen',
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

export const RANK_LABELS: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

export const PLAYER_META: Array<{
  id: PlayerId
  name: string
  isHuman: boolean
  portrait: BotPortraitId
}> = [
  { id: 0, name: 'Jij', isHuman: true, portrait: 'human' },
  { id: 1, name: 'Yuki', isHuman: false, portrait: 'yuki' },
  { id: 2, name: 'Max', isHuman: false, portrait: 'max' },
  { id: 3, name: 'Moppie', isHuman: false, portrait: 'moppie' },
]
