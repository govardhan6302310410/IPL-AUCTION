import { calculateMaxLegalBid, checkTeamCanLegallyBid } from './PurseManager.js';

export const validateBid = ({ room, player, team, user, amount }) => {
  if (!room || room.status !== 'IN_PROGRESS') {
    return { valid: false, error: 'Auction is not live' };
  }

  if (room.auction.status !== 'BIDDING') {
    return { valid: false, error: 'Bidding is not active for this player' };
  }

  if (!player || !room.auction.currentPlayer || room.auction.currentPlayer.toString() !== player._id.toString()) {
    return { valid: false, error: 'Player mismatch' };
  }

  if (!team) {
    return { valid: false, error: 'Invalid team' };
  }

  if (team.status === 'SPECTATOR' || team.status === 'INACTIVE') {
    return { valid: false, error: `Team is ${team.status.toLowerCase()} and cannot bid` };
  }

  const userId = (user?._id || user?.id || user)?.toString();

  // Auctioneer is not permitted to bid (applies to human users, not AI team bots)
  if (!team.isAI) {
    const auctioneerId = (room.auctioneer?._id || room.auctioneer)?.toString();
    if (auctioneerId && auctioneerId === userId) {
      return { valid: false, error: 'The Auctioneer cannot place bids' };
    }
  }

  // Check if user owns team or is room admin
  const teamOwnerId = (team.owner?._id || team.owner)?.toString();
  const adminId = (room.admin?._id || room.admin)?.toString();

  if (!team.isAI) {
    const isParticipantOwner = room.participants?.some(p => {
      const pUid = (p.user?._id || p.user)?.toString();
      return pUid === userId && p.teamIndex >= 0 && room.teams[p.teamIndex]?._id?.toString() === team._id?.toString();
    });

    if (teamOwnerId !== userId && adminId !== userId && !isParticipantOwner) {
      return { valid: false, error: 'You do not control this team' };
    }
  } else {
    // Team is AI. Allow bid execution if triggered by system (admin or AI engine).
    // Do NOT clear isAI or reassign team.owner.
  }

  // Disallow consecutive bids by the same team
  if (room.auction.currentBidder && room.auction.currentBidder.toString() === team._id.toString()) {
    return { valid: false, error: 'You already hold the highest bid' };
  }

  // Check increment and amount
  const currentBid = room.auction.currentBid || 0;
  const basePrice = player.basePrice || 0.2;
  const increment = room.settings.bidIncrement || 0.25;

  let expectedNextBid;
  if (currentBid === 0) {
    expectedNextBid = basePrice;
  } else {
    expectedNextBid = parseFloat((currentBid + increment).toFixed(2));
  }

  if (amount < expectedNextBid - 0.001) {
    return { valid: false, error: `Bid amount must be at least ₹${expectedNextBid} Cr` };
  }

  // Legal purse check
  const legalCheck = checkTeamCanLegallyBid(team, player, amount, room.settings);
  if (!legalCheck.canBid) {
    return { valid: false, error: legalCheck.reason };
  }

  return { valid: true, expectedNextBid };
};
