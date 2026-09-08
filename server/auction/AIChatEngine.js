/**
 * AIChatEngine.js
 * Generates natural, contextual, human-like chat messages for AI-controlled teams
 * and the AI Auctioneer during an IPL auction.
 */

import { extractPlayerRating } from '../analytics/playerValue.js';

// Helper to pick a random item from an array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class AIChatEngine {
  constructor() {
    // Keep track of recent messages per room to prevent repetitive lines
    this.recentLines = new Map(); // roomId -> Set of recent strings
  }

  getRecentSet(roomId) {
    if (!this.recentLines.has(roomId)) {
      this.recentLines.set(roomId, new Set());
    }
    const s = this.recentLines.get(roomId);
    if (s.size > 25) {
      s.clear();
    }
    return s;
  }

  selectNonRepeating(roomId, options) {
    const recent = this.getRecentSet(roomId);
    const available = options.filter(msg => !recent.has(msg));
    const chosen = available.length > 0 ? pick(available) : pick(options);
    recent.add(chosen);
    return chosen;
  }

  /**
   * Generates a message when an AI team places a bid.
   */
  generateBidMessage(roomId, team, player, amount, context = {}) {
    const role = player.role || 'Player';
    const name = player.name;
    const remainingPurse = team.purse?.remaining || 0;
    const rating = extractPlayerRating(player);
    const isStar = rating >= 85;

    const options = [];

    // Role-specific commentary
    if (role === 'Wicketkeeper') {
      options.push(
        `Need a reliable wicketkeeper behind the stumps. Going in for ${name}.`,
        `Can't compromise on a WK. ₹${amount.toFixed(2)} Cr on ${name}.`,
        `Gotta lock in our keeper today.`
      );
    } else if (role === 'Batter' || role.includes('Bat')) {
      options.push(
        `Looking to fortify our top order. ₹${amount.toFixed(2)} Cr for ${name}.`,
        `Need solid firepower in the batting lineup.`,
        `He fits our batting template nicely. Bidding ₹${amount.toFixed(2)} Cr.`
      );
    } else if (role.includes('Bowler') || role.includes('Pace') || role.includes('Spin')) {
      options.push(
        `Need more wicket-taking options. In for ${name}.`,
        `Bowling depth wins championships. ₹${amount.toFixed(2)} Cr.`,
        `We really need someone to bowl in the tough overs.`
      );
    } else if (role.includes('All-Rounder')) {
      options.push(
        `Vital all-round balance for our XI. ₹${amount.toFixed(2)} Cr.`,
        `Great utility player, fits right into our balance.`,
        `We love the flexibility ${name} brings to the table.`
      );
    }

    // Star player hype
    if (isStar) {
      options.push(
        `Absolute match-winner. Putting ₹${amount.toFixed(2)} Cr on ${name}!`,
        `Not letting a star like ${name} slip away easily.`,
        `Worth every crore. Bidding ₹${amount.toFixed(2)} Cr.`,
        `Game-changer right here. I'm pushing this up.`
      );
    }

    // General competitive lines
    options.push(
      `Going for it, need a strong ${role.toLowerCase()}.`,
      `I'll push this one up to ₹${amount.toFixed(2)} Cr.`,
      `Raising the stakes for ${name}.`,
      `Count us in for ${name} at ₹${amount.toFixed(2)} Cr.`,
      `Still within our valuation. ₹${amount.toFixed(2)} Cr.`
    );

    // Budget awareness
    if (remainingPurse < 30) {
      options.push(
        `Purse is tightening up, but ${name} is worth pushing for.`,
        `Gotta be strategic with our remaining purse, but we want ${name}.`
      );
    }

    return this.selectNonRepeating(roomId, options);
  }

  /**
   * Generates a message when an AI team decides to let a player go / stop bidding (outbid).
   */
  generateOutbidMessage(roomId, team, player, currentBid, maxWilling) {
    const name = player.name;
    const options = [
      `Alright, let it go. Getting too steep for our sheet.`,
      `Not worth overpaying past ₹${currentBid.toFixed(2)} Cr. Out.`,
      `Price is climbing too high, we'll look for value elsewhere.`,
      `All yours! Good bid, but that crosses our valuation ceiling.`,
      `Too rich for our blood right now. Stepping back.`,
      `Gotta protect our purse for later sets. Passing on ${name}.`,
      `Fair play, that's beyond what we budgeted for ${name}.`,
      `We'll save the remaining purse for the next round.`
    ];

    if (team.purse?.remaining < 25) {
      options.push(
        `Running low on purse, gotta be disciplined now.`,
        `Purse won't allow a bidding war here. Letting ${name} pass.`
      );
    }

    return this.selectNonRepeating(roomId, options);
  }

  /**
   * Generates a victory message when an AI team successfully wins/buys a player.
   */
  generateWinMessage(roomId, team, player, finalPrice) {
    const name = player.name;
    const isSteal = finalPrice <= (player.basePrice || 0.2) * 1.5;
    const options = [];

    if (isSteal) {
      options.push(
        `Absolute steal at ₹${finalPrice.toFixed(2)} Cr! Super happy with this.`,
        `Great value buy for our franchise! Welcome ${name}.`,
        `Can't believe we got ${name} at that price. Huge win!`
      );
    } else {
      options.push(
        `Got him! Perfect fit for our squad.`,
        `Welcome to ${team.name}, ${name}! Huge addition for us.`,
        `Had to fight hard for ${name}, but thrilled to have him on board.`,
        `Core piece secured! That strengthens our Playing XI big time.`,
        `Delighted with this signing at ₹${finalPrice.toFixed(2)} Cr.`
      );
    }

    return this.selectNonRepeating(roomId, options);
  }

  /**
   * Generates a spectator observation from an uninvolved AI team during intense bidding.
   */
  generateSpectatorComment(roomId, team, player, currentBid) {
    const name = player.name;
    const options = [
      `Tough race for ${name}! Let's see how high this goes.`,
      `Intense bidding war right here. ₹${currentBid.toFixed(2)} Cr already!`,
      `Both teams really want this one. Popcorn time.`,
      `Price escalating quickly for ${name}.`,
      `Huge commitment for ${name}! Exciting battle.`
    ];

    return this.selectNonRepeating(roomId, options);
  }

  /**
   * Generates a natural broadcast intro by the AI Auctioneer when nominating a player.
   */
  generateAuctioneerNomination(roomId, player) {
    const name = player.name;
    const role = player.role;
    const base = player.basePrice?.toFixed(2) || '0.20';
    const isOverseas = player.isOverseas;
    const rating = extractPlayerRating(player);
    const isStar = rating >= 85;

    const options = [
      `🎙️ Next up on the podium: ${name} (${role})! Base price ₹${base} Cr. Let's see your opening bids!`,
      `🎙️ Bidding opens for ${name}! Quality ${role.toLowerCase()}${isOverseas ? ' from overseas' : ''}. Who wants to start at ₹${base} Cr?`,
      `🎙️ Calling ${name} to the floor. Base set at ₹${base} Cr. Table is open, franchises!`,
    ];

    if (isStar) {
      options.push(
        `🎙️ ⭐ MARQUEE ALERT: ${name}! A proven match-winner at base ₹${base} Cr. Opening the floor now!`,
        `🎙️ Big name up now: ${name}! Expecting fireworks across the tables for this one.`
      );
    }

    return this.selectNonRepeating(roomId, options);
  }

  /**
   * Generates a gavel conclusion message by the AI Auctioneer when a player is sold.
   */
  generateAuctioneerSold(roomId, player, team, finalPrice) {
    const name = player.name;
    const teamName = team.name;
    const price = finalPrice.toFixed(2);

    const options = [
      `🔨 Going once... twice... SOLD! ${name} goes to ${teamName} for ₹${price} Cr!`,
      `🔨 Gavel down! ${name} is officially acquired by ${teamName} at ₹${price} Cr. Congratulations!`,
      `🔨 SOLD to ${teamName}! Fantastic acquisition of ${name} for ₹${price} Cr.`
    ];

    return this.selectNonRepeating(roomId, options);
  }

  /**
   * Generates a gavel conclusion message by the AI Auctioneer when a player goes unsold.
   */
  generateAuctioneerUnsold(roomId, player) {
    const name = player.name;
    const base = player.basePrice?.toFixed(2) || '0.20';

    const options = [
      `❌ No bids registered at base price ₹${base} Cr. ${name} remains unsold for this set. Moving on!`,
      `❌ Going once, twice... pass. ${name} is unsold. Let's look to the next lot.`,
      `❌ Unsold at ₹${base} Cr. ${name} will return in the accelerated rounds if requested.`
    ];

    return this.selectNonRepeating(roomId, options);
  }

  /**
   * Broadcasts an AI Auctioneer nomination intro message for the nominated player.
   */
  onPlayerNominated(roomId, player, broadcastFn) {
    if (!player) return;
    try {
      const nomMessage = this.generateAuctioneerNomination(roomId, player);
      if (typeof broadcastFn === 'function') {
        broadcastFn(roomId, {
          _id: `${Date.now()}_nom_${player._id || player.id || 'p'}`,
          user: 'Auctioneer (AI)',
          senderName: 'Auctioneer (AI)',
          message: nomMessage,
          text: nomMessage,
          timestamp: new Date().toISOString(),
          isSystem: true,
          type: 'NOMINATION',
          player: {
            _id: player._id || player.id,
            name: player.name,
            role: player.role
          }
        });
      }
    } catch (err) {
      console.error('Error generating AI nomination chat message:', err);
    }
  }
}

const aiChatEngine = new AIChatEngine();
export default aiChatEngine;
