/**
 * Evaluates the full squad strength of an IPL franchise post-auction.
 * Enforces the IPL Rule: Minimum 18 players required to be eligible for squad comparison!
 */
export function calculateTeamRating(team, settings = {}, weights = {}) {
  const minSquad = settings.minSquad || 18;
  const squadDetails = team.squadDetails || [];
  const squadSize = squadDetails.length > 0 ? squadDetails.length : (team.squad?.length || 0);

  // Check Eligibility (< 18 players = Ineligible)
  const isEligible = squadSize >= minSquad;
  const ineligibleReason = !isEligible 
    ? `Squad size is ${squadSize}/${minSquad}. Team is NOT eligible for squad comparison (Minimum ${minSquad} players required by IPL rules).`
    : null;

  // Extract players and stats
  const players = squadDetails.map(item => {
    const p = item.player || item;
    const ratingObj = p.rating || {};
    const overallRating = typeof ratingObj === 'object' 
      ? (ratingObj.overall ? (ratingObj.overall > 10 ? ratingObj.overall : ratingObj.overall * 10) : 75)
      : (ratingObj > 10 ? ratingObj : ratingObj * 10);

    return {
      _id: p._id,
      name: p.name || 'Player',
      role: p.role || 'Batter',
      isOverseas: !!p.isOverseas,
      basePrice: p.basePrice || 0.2,
      boughtFor: item.boughtFor || p.basePrice || 0.2,
      rating: overallRating,
      rating10: parseFloat((overallRating / 10).toFixed(1)),
      careerStats: p.careerStats || {}
    };
  });

  // Categorize players by role (handling role nomenclature variations)
  const batters = players.filter(p => p.role === 'Batter' || p.role === 'Batsman');
  const wks = players.filter(p => p.role === 'Wicketkeeper' || p.role === 'Wicket-Keeper' || p.role === 'WK');
  const allRounders = players.filter(p => p.role === 'All-Rounder' || p.role === 'All Rounder');
  const fastBowlers = players.filter(p => p.role === 'Fast Bowler' || (p.role === 'Bowler' && !p.isSpinner));
  const spinners = players.filter(p => p.role === 'Spin Bowler' || p.role === 'Spinner');
  const allBowlers = [...fastBowlers, ...spinners, ...players.filter(p => p.role === 'Bowler')];

  // 1. Batting Strength (Top 7 Batting options including All-rounders & Keepers)
  const battingPool = [...batters, ...allRounders, ...wks].sort((a, b) => b.rating - a.rating);
  const topBatters = battingPool.slice(0, 7);
  const avgBatRating = topBatters.length > 0 
    ? topBatters.reduce((sum, p) => sum + p.rating, 0) / topBatters.length 
    : 40;
  
  // Bonus for explosive boundary hitters and depth
  const sixesCount = topBatters.reduce((acc, p) => acc + (p.careerStats?.batting?.sixes || 0), 0);
  const battingBonus = Math.min(10, (sixesCount / 600) * 10);
  const battingStrength = Math.min(100, Math.max(30, avgBatRating * 0.9 + battingBonus));

  // 2. Bowling Strength (Top 6 Bowling options: Pacers + Spinners + All-rounders)
  const bowlingPool = [...allBowlers, ...allRounders].sort((a, b) => b.rating - a.rating);
  const topBowlers = bowlingPool.slice(0, 6);
  const avgBowlRating = topBowlers.length > 0 
    ? topBowlers.reduce((sum, p) => sum + p.rating, 0) / topBowlers.length 
    : 40;
  
  // Pace and Spin attack balance
  const hasPace = topBowlers.some(p => p.role === 'Fast Bowler');
  const hasSpin = topBowlers.some(p => p.role === 'Spin Bowler' || p.role === 'Spinner');
  const varietyBonus = (hasPace && hasSpin) ? 8 : (hasPace || hasSpin) ? 4 : 0;
  const bowlingStrength = Math.min(100, Math.max(30, avgBowlRating * 0.9 + varietyBonus));

  // 3. Squad Balance & Role Coverage
  let balanceScore = 100;
  if (batters.length + allRounders.length < 5) balanceScore -= 25;
  if (wks.length < 1) balanceScore -= 35; // Crucial: must have at least 1 wicketkeeper
  if (allBowlers.length + allRounders.length < 5) balanceScore -= 25;
  if (allRounders.length < 2) balanceScore -= 15; // Modern T20 requires all-round depth
  balanceScore = Math.max(20, balanceScore);

  // 4. Bench Strength & Depth (Players ranked 8-15)
  const bench = [...players].sort((a, b) => b.rating - a.rating).slice(7, 16);
  const depthScore = bench.length > 0 
    ? Math.min(100, (bench.reduce((sum, p) => sum + p.rating, 0) / bench.length)) 
    : 30;

  // 5. Purse Utilization Efficiency
  const initialPurse = team.purse?.initial || (team.purse?.remaining + team.purse?.spent) || 120;
  const spent = team.purse?.spent || 0;
  const spentRatio = Math.min(1, spent / initialPurse);
  const purseEfficiency = Math.min(100, Math.max(40, spentRatio * 100));

  // Composite Score (0 - 100)
  let compositeScore = (
    (battingStrength * 0.35) +
    (bowlingStrength * 0.35) +
    (balanceScore * 0.15) +
    (depthScore * 0.10) +
    (purseEfficiency * 0.05)
  );

  // Penalty if squad size < 18
  if (!isEligible) {
    compositeScore = Math.max(10, compositeScore * (squadSize / minSquad) * 0.75);
  }

  const finalScore100 = parseFloat(Math.min(100, Math.max(10, compositeScore)).toFixed(1));
  const finalScore10 = parseFloat((finalScore100 / 10).toFixed(1));

  return {
    compositeScore: finalScore100,
    rating10: finalScore10,
    isEligible,
    ineligibleReason,
    squadSize,
    minSquad,
    breakdown: {
      battingStrength: parseFloat(battingStrength.toFixed(1)),
      bowlingStrength: parseFloat(bowlingStrength.toFixed(1)),
      balanceScore: parseFloat(balanceScore.toFixed(1)),
      depthScore: parseFloat(depthScore.toFixed(1)),
      purseEfficiency: parseFloat(purseEfficiency.toFixed(1))
    },
    counts: {
      batters: batters.length,
      wicketkeepers: wks.length,
      allRounders: allRounders.length,
      bowlers: allBowlers.length,
      overseas: team.overseas || players.filter(p => p.isOverseas).length
    }
  };
}
