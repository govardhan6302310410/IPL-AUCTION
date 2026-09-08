import express from 'express';
import Room from '../models/Room.js';

const router = express.Router();

router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId }).populate('teams.squadDetails.player teams.squad');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    if (room.status !== 'COMPLETED' || !room.auction.results) {
        return res.status(400).json({ message: 'Auction not completed or results not available' });
    }

    res.status(200).json(room.auction.results);
  } catch (error) {
    console.error('Analytics route error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
