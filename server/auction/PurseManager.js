/**
 * Calculates max legal bid for a team enforcing squad completion reserve.
 * Max Legal Bid = Remaining Purse - (Remaining Slots - 1) * Min Reserve Price
 */
export const calculateMaxLegalBid = (team, settings) => {
  const currentSquadCount = team.squad?.length || 0;
  const targetMinSquad = settings.minSquad || 18;
  const minReserve = settings.minReservePerPlayer || 0.2;
  const remainingPurse = team.purse.remaining;

  const neededSlots = Math.max(0, targetMinSquad - currentSquadCount);
  if (neededSlots <= 1) {
    // Can spend all remaining purse on this player
    return parseFloat(Math.max(0, remainingPurse).toFixed(2));
  }

  const reserveForOtherSlots = (neededSlots - 1) * minReserve;
  const maxBid = remainingPurse - reserveForOtherSlots;

  return parseFloat(Math.max(0, maxBid).toFixed(2));
};

export const checkTeamCanLegallyBid = (team, player, nextBidAmount, settings) => {
  // Check if squad is full
  const maxSquad = settings.squadSize || 25;
  if ((team.squad?.length || 0) >= maxSquad) {
    return { canBid: false, reason: 'Squad is full (max limit reached)' };
  }

  // Check overseas limit if player is overseas
  if (player.isOverseas) {
    const maxOverseas = settings.overseasLimit || 8;
    if ((team.overseas || 0) >= maxOverseas) {
      return { canBid: false, reason: 'Overseas limit reached for squad' };
    }
  }

  // Check if max legal bid is >= nextBidAmount
  const maxBid = calculateMaxLegalBid(team, settings);
  if (nextBidAmount > maxBid) {
    return {
      canBid: false,
      reason: `Bid ₹${nextBidAmount} Cr exceeds maximum legal bid ₹${maxBid} Cr (squad reserve required)`
    };
  }

  return { canBid: true, maxBid };
};
