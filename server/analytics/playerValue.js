export function extractPlayerRating(player) {
  if (!player) return 50;
  const r = player.rating;
  if (typeof r === 'number') {
    return r > 10 ? r : r * 10;
  }
  if (r && typeof r === 'object') {
    const ov = r.overall ?? r.batting ?? r.bowling ?? 50;
    return ov > 10 ? ov : ov * 10;
  }
  return 50;
}

export function calculatePlayerExpectedValue(player) {
  const rating = extractPlayerRating(player);
  const basePrice = player?.basePrice || 0.2;
  return basePrice * (1 + (rating - 50) / 25);
}

export function classifyPlayerValue(player, finalPrice) {
  const EV = calculatePlayerExpectedValue(player);
  const rating = extractPlayerRating(player);
  const basePrice = player?.basePrice || 0.2;
  const PP = (finalPrice - basePrice) / basePrice;
  const VFM = rating / finalPrice;

  let classification = 'OVERPAID';
  
  if (finalPrice <= player.basePrice * 1.2 && (rating >= 75 || VFM > 50)) {
    classification = 'STEAL';
  } else if (VFM > 35 && finalPrice <= EV) {
    classification = 'GREAT VALUE';
  } else if (finalPrice <= EV * 1.25) {
    classification = 'FAIR VALUE';
  }

  return {
    classification,
    expectedValue: EV,
    pricePremium: PP,
    valueForMoney: VFM
  };
}
