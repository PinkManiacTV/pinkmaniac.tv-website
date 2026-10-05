/** Build round sizes: 1..max, max again, then max-1..1 */
export function buildRoundSizes(maxCards: number): number[] {
  const ascending: number[] = []
  for (let n = 1; n <= maxCards; n += 1) ascending.push(n)
  const descending: number[] = []
  for (let n = maxCards - 1; n >= 1; n -= 1) descending.push(n)
  return [...ascending, maxCards, ...descending]
}

export function nextPlayer(playerId: number, playerCount = 4): number {
  return (playerId + 1) % playerCount
}

export function playerOrderFrom(start: number, playerCount = 4): number[] {
  return Array.from({ length: playerCount }, (_, i) => (start + i) % playerCount)
}
