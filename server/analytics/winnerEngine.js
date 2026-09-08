import { calculateTeamRating } from './teamRating.js';

/**
 * Evaluates all franchises post-auction, separating eligible vs ineligible squads.
 * Teams with squad size < 18 are NOT eligible for squad comparison.
 */
export function calculateAuctionResults(room) {
  const minSquad = room.settings?.minSquad || 18;

  const evaluatedTeams = (room.teams || []).map(team => {
    const rating = calculateTeamRating(team, room.settings);
    return {
      teamId: team._id,
      teamName: team.name,
      teamShortName: team.shortName,
      primaryColor: team.primaryColor || '#f5a623',
      purseRemaining: team.purse?.remaining || 0,
      purseSpent: team.purse?.spent || 0,
      squadSize: rating.squadSize,
      minSquad,
      isEligible: rating.isEligible,
      ineligibleReason: rating.ineligibleReason,
      compositeScore: rating.compositeScore,
      rating10: rating.rating10,
      breakdown: rating.breakdown,
      counts: rating.counts
    };
  });

  // Separate eligible and ineligible squads
  const eligibleTeams = evaluatedTeams.filter(t => t.isEligible);
  const ineligibleTeams = evaluatedTeams.filter(t => !t.isEligible);

  // Sort eligible squads by composite score
  eligibleTeams.sort((a, b) => b.compositeScore - a.compositeScore);
  // Sort ineligible squads by squad size then score
  ineligibleTeams.sort((a, b) => b.squadSize - a.squadSize || b.compositeScore - a.compositeScore);

  // Assign ranks
  const rankedEligible = eligibleTeams.map((t, idx) => ({
    ...t,
    rank: idx + 1,
    statusText: idx === 0 ? '🏆 Best Auction Draft' : `Rank ${idx + 1}`,
    explanation: generateSquadExplanation(t, idx)
  }));

  const rankedIneligible = ineligibleTeams.map((t) => ({
    ...t,
    rank: 'Ineligible',
    statusText: '⚠️ Ineligible Squad',
    explanation: t.ineligibleReason
  }));

  const allRankings = [...rankedEligible, ...rankedIneligible];
  const champion = rankedEligible.length > 0 ? rankedEligible[0] : (rankedIneligible[0] || null);

  return {
    champion,
    eligibleCount: eligibleTeams.length,
    ineligibleCount: ineligibleTeams.length,
    minSquad,
    rankings: allRankings
  };
}

function generateSquadExplanation(t, rank) {
  const b = t.breakdown || {};
  let notes = [];

  if (rank === 0) {
    notes.push(`Championship-ready squad! Highest composite rating (${t.compositeScore}/100) with exceptional depth.`);
  } else {
    notes.push(`Finished Rank ${rank + 1} with a composite rating of ${t.compositeScore}/100.`);
  }

  if (b.battingStrength >= 88) notes.push(`Potent batting firepower (${b.battingStrength}/100).`);
  if (b.bowlingStrength >= 88) notes.push(`Lethal bowling attack (${b.bowlingStrength}/100).`);
  if (b.balanceScore < 70) notes.push(`Lacks role depth (missing wicketkeeper or all-rounder reserves).`);

  return notes.join(' ');
}
