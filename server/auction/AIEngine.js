import { calculatePlayerExpectedValue, extractPlayerRating } from '../analytics/playerValue.js';
import { calculateMaxLegalBid } from './PurseManager.js';

export function aiBidDecision({ room, team, player, currentBid, nextBid }) {
  const personality = team.aiPersonality || 'Difficult';
  const settings = room.settings || {};
  const remainingPurse = team.purse?.remaining || 0;
  
  // 1. Max legal bid calculation enforcing squad completion reserve
  const maxLegalBid = calculateMaxLegalBid(team, settings);
  if (nextBid > maxLegalBid || nextBid > remainingPurse) {
    return { shouldBid: false, bidAmount: 0, delayMs: 0 };
  }
  
  // 2. Squad size cap
  const maxSquad = settings.squadSize || 25;
  const currentSquadCount = team.squad?.length || 0;
  if (currentSquadCount >= maxSquad) {
    return { shouldBid: false, bidAmount: 0, delayMs: 0 };
  }
  
  // 3. Overseas player cap (max 8)
  const overseasLimit = settings.overseasLimit || 8;
  const currentOverseas = team.overseas || 0;
  if (player.isOverseas && currentOverseas >= overseasLimit) {
    return { shouldBid: false, bidAmount: 0, delayMs: 0 };
  }
  
  // 4. Calculate Expected Value (EV)
  const EV = calculatePlayerExpectedValue(player);
  const rating = extractPlayerRating(player);
  
  // Base valuation multiplier (Difficult mode is disciplined but aggressive on stars)
  let valuationMultiplier = 1.0;
  
  // 5. Squad Role Composition Need Assessment
  // Target roles: Wicketkeeper (min 1, target 2), Batter (target 5-7), Bowler (target 6-8), All-Rounder (target 4-6)
  let roleCount = 0;
  let overseasRoleCount = 0;
  if (team.squadDetails && team.squadDetails.length > 0) {
    team.squadDetails.forEach(s => {
      const p = s.player;
      if (p) {
        if (p.role === player.role) roleCount++;
        if (player.isOverseas && p.isOverseas) overseasRoleCount++;
      }
    });
  }
  
  if (player.role === 'Wicketkeeper') {
    if (roleCount === 0) {
      valuationMultiplier *= 1.45; // Critical need: MUST get a wicketkeeper
    } else if (roleCount === 1) {
      valuationMultiplier *= 1.05; // Backup wicketkeeper
    } else {
      valuationMultiplier *= 0.40; // Don't overstock WKs
    }
  } else if (player.role === 'Batter') {
    if (roleCount < 4) {
      valuationMultiplier *= 1.25;
    } else if (roleCount >= 7) {
      valuationMultiplier *= 0.60;
    }
  } else if (player.role === 'Bowler') {
    if (roleCount < 5) {
      valuationMultiplier *= 1.25;
    } else if (roleCount >= 8) {
      valuationMultiplier *= 0.55;
    }
  } else if (player.role === 'All-Rounder') {
    if (roleCount < 3) {
      valuationMultiplier *= 1.30; // High utility in T20
    } else if (roleCount >= 6) {
      valuationMultiplier *= 0.65;
    }
  }
  
  // If player is overseas and overseas slots are filling up, be more selective
  if (player.isOverseas) {
    if (currentOverseas >= 6) {
      valuationMultiplier *= 0.75; // Save remaining 2 slots for genuine stars
    }
  }
  
  // 6. Star premium / Tier assessment (Difficult AI values marquee match-winners)
  if (rating >= 88) {
    valuationMultiplier *= 1.40; // Elite match-winner: bid aggressively
  } else if (rating >= 82) {
    valuationMultiplier *= 1.20; // High quality starter
  } else if (rating < 65) {
    valuationMultiplier *= 0.85; // Low-rated utility player: maintain strict budget cap
  }
  
  // 7. Personality modifiers for Difficult sub-flavors if present
  if (personality === 'Aggressive') {
    valuationMultiplier *= 1.15;
  } else if (personality === 'Conservative') {
    valuationMultiplier *= 0.90;
  }
  
  // 8. Purse Conservation Scaling
  // If team has fewer than 12 players and less than 35% purse left, tighten up
  const initialPurse = team.purse?.initial || settings.purse || 120;
  const purseRemainingRatio = remainingPurse / initialPurse;
  if (currentSquadCount < 14 && purseRemainingRatio < 0.30) {
    valuationMultiplier *= 0.80; // Conserve purse to ensure min squad of 18
  }
  
  const maxWillingBid = Math.min(maxLegalBid, EV * valuationMultiplier);
  
  // Check if next bid is within willingness
  if (nextBid <= maxWillingBid) {
    // Variable human-like delay:
    // Fast reaction (1.0s - 1.6s) if it's an opening bid or high-urgency star
    // Thoughtful reaction (1.8s - 2.8s) if price is climbing close to willingness
    const priceRatio = nextBid / maxWillingBid;
    let delayMs;
    if (priceRatio < 0.5) {
      delayMs = Math.floor(Math.random() * (1600 - 1000 + 1) + 1000);
    } else if (priceRatio < 0.8) {
      delayMs = Math.floor(Math.random() * (2200 - 1400 + 1) + 1400);
    } else {
      delayMs = Math.floor(Math.random() * (2900 - 2000 + 1) + 2000);
    }
    
    return { shouldBid: true, bidAmount: nextBid, delayMs, maxWillingBid };
  }
  
  return { shouldBid: false, bidAmount: 0, delayMs: 0, maxWillingBid };
}
