import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import * as roomController from '../controllers/roomController.js';

const router = Router();

router.post('/create', protect, roomController.createRoom);
router.post('/join/:roomId', protect, roomController.joinRoom);
router.get('/my-rooms', protect, roomController.getMyRooms);
router.get('/public', roomController.getPublicRooms);
router.get('/:roomId', protect, roomController.getRoomState);
router.post('/:roomId/select-team', protect, roomController.selectTeam);
router.post('/:roomId/ready', protect, roomController.setReady);
router.post('/:roomId/auctioneer', protect, roomController.setAuctioneer);
router.put('/:roomId/settings', protect, roomController.updateRoomSettings);
router.post('/:roomId/end', protect, roomController.endAuction);
router.get('/:roomId/results', protect, roomController.getAuctionResults);
router.post('/:roomId/playing-xi', protect, roomController.submitPlayingXI);
router.delete('/:roomId', protect, roomController.deleteRoom);

export default router;

