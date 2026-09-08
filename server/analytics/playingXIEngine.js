/**
 * Evaluates and rates a franchise's submitted Playing XI (11 players).
 * Enforces IPL Playing XI Constraints:
 * 1. Exactly 11 players
 * 2. Maximum 4 overseas players
 * 3. At least 1 designated wicketkeeper
 * 4. At least 5 bowling options
 */
export function ratePlayingXI(submittedXI = [], team = {}, settings = {}) {
  const maxOverseas = settings.maxOverseasXI || 4;

  if (!Array.isArray(submittedXI) || submittedXI.length !== 11) {
    return {
      valid: false,
      error: `Playing XI must contain exactly 11 players (currently ${submittedXI?.length || 0})`
    };
  }

  // Normalize players
  const players = submittedXI.map((item, index) => {
    const p = item.player || item;
    const ratingObj = p.rating || {};
    const overall = typeof ratingObj === 'object' 
      ? (ratingObj.overall ? (ratingObj.overall > 10 ? ratingObj.overall : ratingObj.overall * 10) : 75)
      : (ratingObj > 10 ? ratingObj : ratingObj * 10);

    return {
      _id: p._id,
      name: p.name || 'Player',
      role: p.role || 'Batter',
      isOverseas: !!p.isOverseas,
      rating: overall,
      position: item.position || (index + 1),
      isCaptain: !!item.isCaptain,
      isViceCaptain: !!item.isViceCaptain,
      isWicketkeeper: !!item.isWicketkeeper || p.role === 'Wicketkeeper',
      careerStats: p.careerStats || {}
    };
  });

  // 1. Constraints Validations
  const overseasCount = players.filter(p => p.isOverseas).length;
  if (overseasCount > maxOverseas) {
    return {
      valid: false,
      error: `Too many overseas players: ${overseasCount} selected (Maximum allowed is ${maxOverseas})`
    };
  }

  const hasWk = players.some(p => p.isWicketkeeper || p.role === 'Wicketkeeper');
  if (!hasWk) {
    return {
      valid: false,
      error: 'Playing XI must include at least one designated Wicketkeeper'
    };
  }

  const bowlingOptions = players.filter(p => 
    p.role === 'Fast Bowler' || p.role === 'Spin Bowler' || p.role === 'Bowler' || p.role === 'All-Rounder'
  );
  if (bowlingOptions.length < 5) {
    return {
      valid: false,
      error: `Playing XI needs at least 5 bowling options (currently only ${bowlingOptions.length})`
    };
  }

  // 2. Section Evaluations
  // Top Order: Positions 1 - 3
  const topOrder = players.slice(0, 3);
  const topOrderAvg = topOrder.reduce((sum, p) => sum + p.rating, 0) / 3;
  const topOrderScore = Math.min(100, Math.max(40, topOrderAvg));

  // Middle Order & Finishers: Positions 4 - 7
  const middleOrder = players.slice(3, 7);
  const middleOrderAvg = middleOrder.reduce((sum, p) => sum + p.rating, 0) / 4;
  const middleOrderScore = Math.min(100, Math.max(40, middleOrderAvg));

  // Lower Order & Tail: Positions 8 - 11
  const lowerOrder = players.slice(7, 11);
  const lowerOrderAvg = lowerOrder.reduce((sum, p) => sum + p.rating, 0) / 4;
  const lowerOrderScore = Math.min(100, Math.max(30, lowerOrderAvg));

  // Bowling Attack & Death Overs Quality
  const pacers = bowlingOptions.filter(p => p.role === 'Fast Bowler' || p.role === 'Bowler');
  const spinners = bowlingOptions.filter(p => p.role === 'Spin Bowler' || p.role === 'Spinner');
  const allRounders = bowlingOptions.filter(p => p.role === 'All-Rounder');

  const avgBowlQuality = bowlingOptions.reduce((sum, p) => sum + p.rating, 0) / bowlingOptions.length;
  let varietyBonus = 0;
  if (pacers.length >= 2 && spinners.length >= 1) varietyBonus += 8;
  if (allRounders.length >= 1) varietyBonus += 5;
  const bowlingScore = Math.min(100, Math.max(40, avgBowlQuality * 0.9 + varietyBonus));

  // Balance & Captaincy Synergy
  const captain = players.find(p => p.isCaptain) || players[0];
  const captainRating = captain.rating || 80;
  const balanceScore = Math.min(100, 
    (bowlingOptions.length >= 6 ? 95 : 85) + 
    (allRounders.length >= 2 ? 5 : 0)
  );

  // Overall Composite Playing XI Score (0 - 100)
  const composite100 = parseFloat((
    (topOrderScore * 0.25) +
    (middleOrderScore * 0.25) +
    (bowlingScore * 0.30) +
    (lowerOrderScore * 0.10) +
    (balanceScore * 0.10)
  ).toFixed(1));

  const composite10 = parseFloat((composite100 / 10).toFixed(1));

  return {
    valid: true,
    compositeScore: composite100,
    rating10: composite10,
    overseasCount,
    maxOverseas,
    breakdown: {
      topOrderScore: parseFloat(topOrderScore.toFixed(1)),
      middleOrderScore: parseFloat(middleOrderScore.toFixed(1)),
      lowerOrderScore: parseFloat(lowerOrderScore.toFixed(1)),
      bowlingScore: parseFloat(bowlingScore.toFixed(1)),
      balanceScore: parseFloat(balanceScore.toFixed(1)),
      captain: captain.name,
      captainRating: parseFloat((captainRating / 10).toFixed(1))
    },
    counts: {
      pacers: pacers.length,
      spinners: spinners.length,
      allRounders: allRounders.length,
      bowlingOptions: bowlingOptions.length
    },
    analysis: generateXIAnalysis(composite100, topOrderScore, bowlingScore, overseasCount)
  };
}

function generateXIAnalysis(overall, top, bowl, overseas) {
  let notes = [];
  if (overall >= 92) notes.push("Championship-caliber Playing XI with exceptional depth.");
  else if (overall >= 85) notes.push("Strong competitive XI capable of reaching playoffs.");
  else notes.push("Decent lineup with potential vulnerabilities under playoff pressure.");

  if (top >= 90) notes.push("Deadly top-order with explosive powerplay capability.");
  if (bowl >= 90) notes.push("Formidable bowling attack with lethal death overs execution.");
  if (overseas === 4) notes.push("Maximized overseas quota (4/4) with premium international stars.");

  return notes.join(" ");
}
