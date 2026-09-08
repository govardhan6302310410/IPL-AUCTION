export function normalizePlayerStats(stats) {
  if (!stats) return null;
  const normalized = { ...stats };
  if (stats.innings > 0) {
    normalized.RunsPerInnings = stats.runs / stats.innings;
  }
  if (stats.matches > 0) {
    normalized.WicketsPerMatch = stats.wickets / stats.matches;
  }
  if (stats.economy && stats.bowlingAverage && stats.strikeRate) {
    normalized.BowlingEfficiency = (stats.economy * 0.4) + (stats.bowlingAverage * 0.4) + (stats.strikeRate * 0.2);
  }
  return normalized;
}

export function computePlayerImpactScore(player) {
  // Simple overall rating placeholder for impact
  return player.rating || 50;
}
