export interface SeatPos {
  x: number
  y: number
}

/** Fits the whole table in the viewport. tight ≈ iPhone SE, compact ≈ iPhone 14. */
export type TableDensity = 'roomy' | 'compact' | 'tight'

export function tableDensity(viewportH: number): TableDensity {
  if (viewportH < 720) return 'tight'
  if (viewportH < 900) return 'compact'
  return 'roomy'
}

/**
 * Human (0) always bottom-center. Others around the felt, inset so nameplates
 * stay inside the rail on both phone and wide layouts. Percents 0–100.
 */
export function seatPosition(
  id: number,
  count: number,
  density: TableDensity = 'roomy',
): SeatPos {
  const layouts: Record<number, SeatPos[]> = {
    4: [
      { x: 50, y: 82 },
      { x: 16, y: 48 },
      { x: 50, y: 14 },
      { x: 84, y: 48 },
    ],
    5: [
      { x: 50, y: 82 },
      { x: 16, y: 50 },
      { x: 30, y: 14 },
      { x: 70, y: 14 },
      { x: 84, y: 50 },
    ],
    6: [
      { x: 50, y: 82 },
      { x: 16, y: 56 },
      { x: 30, y: 14 },
      { x: 50, y: 12 },
      { x: 70, y: 14 },
      { x: 84, y: 56 },
    ],
    7: [
      { x: 50, y: 82 },
      { x: 16, y: 66 },
      { x: 16, y: 36 },
      { x: 32, y: 13 },
      { x: 68, y: 13 },
      { x: 84, y: 36 },
      { x: 84, y: 66 },
    ],
    8: [
      { x: 50, y: 82 },
      { x: 16, y: 68 },
      { x: 16, y: 40 },
      { x: 28, y: 13 },
      { x: 50, y: 12 },
      { x: 72, y: 13 },
      { x: 84, y: 40 },
      { x: 84, y: 68 },
    ],
  }
  const seats = layouts[count] ?? layouts[4]
  const base = seats[id] ?? { x: 50, y: 50 }
  if (id === 0 && density === 'tight') return { x: base.x, y: base.y - 4 }
  return base
}

export function portraitSize(count: number, density: TableDensity = 'roomy'): number {
  const base = count <= 4 ? 48 : count <= 6 ? 40 : 32
  if (density === 'tight') return Math.max(28, base - 12)
  if (density === 'compact') return Math.max(30, base - 6)
  return base
}

export function pileRadius(count: number, density: TableDensity = 'roomy'): number {
  const base = count >= 7 ? 70 : count >= 5 ? 48 : 34
  if (density === 'tight') return Math.round(base * 0.52)
  if (density === 'compact') return Math.round(base * 0.72)
  return base
}

export function maxCardsCap(playerCount: number): number {
  return Math.floor(52 / playerCount)
}

export type SpeechIn = 'top' | 'bottom' | 'left' | 'right'

/** Speech bubble sits toward table center, clear of the portrait. */
export function speechInward(
  id: number,
  count: number,
  density: TableDensity = 'roomy',
): SpeechIn {
  const seat = seatPosition(id, count, density)
  const dx = seat.x - 50
  const dy = seat.y - 50
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'right' : 'left'
  return dy < 0 ? 'bottom' : 'top'
}
