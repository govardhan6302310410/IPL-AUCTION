import Player from '../models/Player.js';

/**
 * Standard Fisher-Yates shuffle algorithm
 */
export const shuffleArray = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Builds IPL Mega Auction player pool organized by official auction SETS:
 * 
 * Set 1: Marquee Set (M1) - Premier anchors: Rohit Sharma, Virat Kohli, MS Dhoni first, followed by top superstars
 * Set 2: Specialist Bowlers (Bowlers 1) - Top fast bowlers & spinners
 * Set 3: Specialist All-Rounders (All-Rounders 1) - ALL all-rounders in league
 * Set 4: Specialist Wicketkeepers (Wicketkeepers 1) - ALL wicketkeepers in league
 * Set 5: Specialist Batters (Batters 1) - Top specialist batters
 * Set 6: Remaining Bowlers & Batters (Accelerated Sets)
 * 
 * Guarantees:
 * 1. EVERY All-Rounder and EVERY Wicketkeeper in the database is included (no truncation of entire categories).
 * 2. Deduplication across all sets.
 * 3. Official set order.
 */
export const buildSetBasedPlayerPool = async (maxSize = 800) => {
  try {
    const poolSet = new Set();
    const orderedPool = [];

    const addPlayer = (p) => {
      if (!p) return;
      const idStr = p._id.toString();
      if (!poolSet.has(idStr)) {
        poolSet.add(idStr);
        orderedPool.push(p);
      }
    };

    // 1. Set 1: Marquee Players (M)
    // Anchors: Rohit Sharma, Virat Kohli, MS Dhoni always start the auction
    const premierNames = ['Rohit Sharma', 'Virat Kohli', 'MS Dhoni'];
    const premierMarquee = await Player.find({ name: { $in: premierNames } });
    premierMarquee.sort((a, b) => premierNames.indexOf(a.name) - premierNames.indexOf(b.name));
    premierMarquee.forEach(addPlayer);

    // Next tier marquee superstars (rating >= 92, up to 10 players)
    const additionalMarquee = await Player.find({
      name: { $nin: premierNames },
      'rating.overall': { $gte: 92 }
    }).sort({ 'rating.overall': -1 }).limit(10);
    additionalMarquee.forEach(addPlayer);

    // 2. Set 2: Top Specialist Bowlers (Top 25 Pacers & Spinners)
    const topBowlers = await Player.find({
      _id: { $nin: Array.from(poolSet) },
      role: { $in: ['Fast Bowler', 'Spin Bowler', 'Bowler'] }
    }).sort({ 'rating.overall': -1 }).limit(25);
    topBowlers.forEach(addPlayer);

    // 3. Set 3: ALL Specialist All-Rounders (EVERY All-Rounder in the league!)
    const allRounders = await Player.find({
      _id: { $nin: Array.from(poolSet) },
      role: 'All-Rounder'
    }).sort({ 'rating.overall': -1 });
    allRounders.forEach(addPlayer);

    // 4. Set 4: ALL Specialist Wicketkeepers (EVERY Wicketkeeper in the league!)
    const wicketkeepers = await Player.find({
      _id: { $nin: Array.from(poolSet) },
      $or: [{ role: 'Wicketkeeper' }, { isWicketkeeper: true }]
    }).sort({ 'rating.overall': -1 });
    wicketkeepers.forEach(addPlayer);

    // 5. Set 5: Top Specialist Batters (Top 35 Batters)
    const topBatters = await Player.find({
      _id: { $nin: Array.from(poolSet) },
      role: 'Batter'
    }).sort({ 'rating.overall': -1 }).limit(35);
    topBatters.forEach(addPlayer);

    // 6. Set 6: Remaining Bowlers (All remaining fast & spin bowlers)
    const remainingBowlers = await Player.find({
      _id: { $nin: Array.from(poolSet) },
      role: { $in: ['Fast Bowler', 'Spin Bowler', 'Bowler'] }
    }).sort({ 'rating.overall': -1 });
    remainingBowlers.forEach(addPlayer);

    // 7. Set 7: Remaining Batters & Accelerated Players
    const remainingBatters = await Player.find({
      _id: { $nin: Array.from(poolSet) }
    }).sort({ 'rating.overall': -1 });
    remainingBatters.forEach(addPlayer);

    console.log(`[poolBuilder] Successfully built auction pool of ${orderedPool.length} players with ALL roles represented:`);
    console.log(`  Set 1 (Marquee): ${premierMarquee.length + additionalMarquee.length} players (First: ${premierMarquee.map(p => p.name).join(', ')})`);
    console.log(`  Set 2 (Top Bowlers): ${topBowlers.length} players`);
    console.log(`  Set 3 (All-Rounders): ${allRounders.length} players`);
    console.log(`  Set 4 (Wicketkeepers): ${wicketkeepers.length} players`);
    console.log(`  Set 5 (Top Batters): ${topBatters.length} players`);
    console.log(`  Set 6 (Remaining Bowlers): ${remainingBowlers.length} players`);
    console.log(`  Set 7 (Remaining Batters/Others): ${remainingBatters.length} players`);

    // Ensure all players are included without truncating All-Rounders or Wicketkeepers
    const finalSize = Math.max(maxSize, orderedPool.length);
    return orderedPool.slice(0, finalSize);
  } catch (err) {
    console.error('Error building set-based player pool:', err);
    const all = await Player.find().sort({ 'rating.overall': -1 });
    return all;
  }
};

export default { buildSetBasedPlayerPool, shuffleArray };
