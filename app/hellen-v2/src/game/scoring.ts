export function scoreRound(prediction: number, tricksWon: number): number {
  const base = tricksWon
  const bonus = prediction === tricksWon ? 10 : 0
  return base + bonus
}
