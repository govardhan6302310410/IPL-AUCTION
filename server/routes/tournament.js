import express from 'express';
import Room from '../models/Room.js';
import { simulateTournament } from '../services/tournamentSimulator.js';

const router = express.Router();

// POST /api/tournament/simulate/:roomId
router.post('/simulate/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId).populate('teams.players');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    if (room.status !== 'completed') {
      return res.status(400).json({ message: 'Auction must be completed to simulate tournament' });
    }

    // Run simulation
    const simulationResult = simulateTournament(room);
    
    // Store simulation on room if needed, for now just returning it
    room.tournamentSimulation = simulationResult;
    await room.save();

    res.json(simulationResult);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ message: 'Error simulating tournament', error: error.message });
  }
});

// GET /api/tournament/:roomId
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.tournamentSimulation) {
      return res.status(404).json({ message: 'Tournament simulation not found for this room' });
    }

    res.json(room.tournamentSimulation);
  } catch (error) {
    console.error('Error fetching simulation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
