import express from 'express';
import Room from '../models/Room.js';
import Bid from '../models/Bid.js';
import Player from '../models/Player.js';
import AuctionEvent from '../models/AuctionEvent.js';

const router = express.Router();

// GET /api/history/room/:roomId
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId).populate('teams.players').lean();
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const bids = await Bid.find({ roomId }).sort({ timestamp: 1 }).lean();
    const events = await AuctionEvent.find({ roomId }).sort({ timestamp: 1 }).lean();
    
    // Optionally fetch players specific to this room if your schema stores room status on players
    
    res.json({
      roomDetails: {
        name: room.name,
        status: room.status,
        completedAt: room.updatedAt
      },
      bids,
      events,
      teams: room.teams
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ message: 'Error fetching room history' });
  }
});

// GET /api/history/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const completedRooms = await Room.find({ status: 'completed' }).populate('teams.players').lean();
    
    let highestRatedTeams = [];
    let allPurchases = [];
    
    completedRooms.forEach(room => {
      room.teams.forEach(team => {
        let teamValue = 0;
        let rating = 0;
        team.players.forEach(p => {
          teamValue += p.soldPrice || 0;
          rating += (p.soldPrice || p.basePrice || 1); // Mock rating
          
          if (p.soldPrice) {
            allPurchases.push({
              playerName: p.name,
              soldPrice: p.soldPrice,
              basePrice: p.basePrice,
              teamName: team.teamName,
              roomName: room.name
            });
          }
        });
        highestRatedTeams.push({
          teamName: team.teamName,
          roomName: room.name,
          rating,
          teamValue
        });
      });
    });
    
    highestRatedTeams.sort((a, b) => b.rating - a.rating);
    allPurchases.sort((a, b) => b.soldPrice - a.soldPrice);
    
    const mostExpensive = allPurchases.slice(0, 10);
    
    // Best bargains: lowest price/basePrice ratio? or lowest price for top players
    // Simplified logic: High base price bought at base price
    const bestBargains = allPurchases
      .map(p => ({ ...p, vfm: p.basePrice ? p.basePrice / p.soldPrice : 0 }))
      .sort((a, b) => b.vfm - a.vfm)
      .slice(0, 10);

    res.json({
      highestRatedTeams: highestRatedTeams.slice(0, 10),
      mostExpensive,
      bestBargains,
      totalCompletedAuctions: completedRooms.length
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

export default router;
