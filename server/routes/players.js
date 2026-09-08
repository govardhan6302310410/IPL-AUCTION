import { Router } from 'express';
import Player from '../models/Player.js';
import PlayerSeasonStats from '../models/PlayerSeasonStats.js';

const router = Router();

// GET /api/players - List all players with search/filter/pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 20, search, role, country, 
      overseas, capped, battingStyle, bowlingStyle,
      minPrice, maxPrice, minRating, maxRating,
      sortBy = 'rating.overall', sortOrder = 'desc'
    } = req.query;
    
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (country) filter.country = country;
    if (overseas !== undefined) filter.isOverseas = overseas === 'true';
    if (capped !== undefined) filter.isCapped = capped === 'true';
    if (battingStyle) filter.battingStyle = battingStyle;
    if (bowlingStyle) filter.bowlingStyle = bowlingStyle;
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
    }
    if (minRating || maxRating) {
      filter['rating.overall'] = {};
      if (minRating) filter['rating.overall'].$gte = parseFloat(minRating);
      if (maxRating) filter['rating.overall'].$lte = parseFloat(maxRating);
    }
    
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [players, total] = await Promise.all([
      Player.find(filter).sort(sort).skip(skip).limit(parseInt(limit)),
      Player.countDocuments(filter)
    ]);
    
    res.json({
      players,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching players', error: error.message });
  }
});

// GET /api/players/stats - Get aggregate stats for filters
router.get('/stats', async (req, res) => {
  try {
    const [totalPlayers, roles, countries, samplePlayer] = await Promise.all([
      Player.countDocuments(),
      Player.distinct('role'),
      Player.distinct('country'),
      Player.findOne({}, 'dataSource')
    ]);
    
    const roleCounts = await Player.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    res.json({ totalPlayers, roles, countries, roleCounts, dataSource: samplePlayer?.dataSource || 'cricsheet' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching player stats', error: error.message });
  }
});

// GET /api/players/:id - Get single player with season stats
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    const seasonStats = await PlayerSeasonStats.find({ player: player._id }).sort({ season: 1 });
    
    res.json({ player, seasonStats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching player', error: error.message });
  }
});

// POST /api/players/compare - Compare multiple players
router.post('/compare', async (req, res) => {
  try {
    const { playerIds } = req.body;
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length < 2 || playerIds.length > 5) {
      return res.status(400).json({ message: 'Provide 2-5 player IDs for comparison' });
    }
    
    const players = await Player.find({ _id: { $in: playerIds } });
    const playerMap = new Map(players.map(p => [p._id.toString(), p]));
    const orderedPlayers = playerIds.map(id => playerMap.get(id.toString())).filter(Boolean);
    const seasonStats = await PlayerSeasonStats.find({ player: { $in: playerIds } }).sort({ season: 1 });
    
    // Group season stats by player
    const statsByPlayer = {};
    playerIds.forEach(id => { statsByPlayer[id] = []; });
    seasonStats.forEach(s => { 
      const pid = s.player.toString();
      if (statsByPlayer[pid]) statsByPlayer[pid].push(s);
    });
    
    res.json({ players: orderedPlayers, seasonStats: statsByPlayer });
  } catch (error) {
    res.status(500).json({ message: 'Error comparing players', error: error.message });
  }
});

export default router;
