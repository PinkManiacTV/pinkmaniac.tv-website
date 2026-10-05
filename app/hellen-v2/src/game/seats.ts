export interface SeatPos {
  x: number
  y: number
}

/** Human (0) always bottom-center. Others around the table. Percents 0–100. */
export function seatPosition(id: number, count: number): SeatPos {
  const layouts: Record<number, SeatPos[]> = {
    4: [
      { x: 50, y: 90 },
      { x: 8, y: 50 },
      { x: 50, y: 9 },
      { x: 92, y: 50 },
    ],
    5: [
      { x: 50, y: 90 },
      { x: 8, y: 52 },
      { x: 28, y: 10 },
      { x: 72, y: 10 },
      { x: 92, y: 52 },
    ],
    6: [
      { x: 50, y: 90 },
      { x: 8, y: 58 },
      { x: 22, y: 12 },
      { x: 50, y: 8 },
      { x: 78, y: 12 },
      { x: 92, y: 58 },
    ],
    7: [
      { x: 50, y: 90 },
      { x: 8, y: 68 },
      { x: 8, y: 32 },
      { x: 28, y: 9 },
      { x: 72, y: 9 },
      { x: 92, y: 32 },
      { x: 92, y: 68 },
    ],
    8: [
      { x: 50, y: 90 },
      { x: 8, y: 70 },
      { x: 8, y: 38 },
      { x: 26, y: 9 },
      { x: 50, y: 8 },
      { x: 74, y: 9 },
      { x: 92, y: 38 },
      { x: 92, y: 70 },
    ],
  }
  const seats = layouts[count] ?? layouts[4]
  return seats[id] ?? { x: 50, y: 50 }
}

export function portraitSize(count: number): number {
  if (count <= 4) return 48
  if (count <= 6) return 40
  return 32
}

export function maxCardsCap(playerCount: number): number {
  return Math.floor(52 / playerCount)
}

export type SpeechIn = 'top' | 'bottom' | 'left' | 'right'

/** Speech bubble sits toward table center, clear of the portrait. */
export function speechInward(id: number, count: number): SpeechIn {
  const seat = seatPosition(id, count)
  const dx = seat.x - 50
  const dy = seat.y - 50
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'right' : 'left'
  return dy < 0 ? 'bottom' : 'top'
}
