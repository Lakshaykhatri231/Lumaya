import express from 'express';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware.js';
import { ChatService } from '../services/chatService.js';
import { MemoryService } from '../services/memoryService.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

// Everyone currently locked out by the SOS 24h block
router.get('/blocked-users', async (req, res) => {
  const result = await ChatService.getBlockedUsersDetails();
  res.status(result.success ? 200 : 500).json(result);
});

router.get('/blocked-users/stats', async (req, res) => {
  res.status(200).json(await MemoryService.getBlockedUserStats());
});

router.get('/users/:userId/block-status', async (req, res) => {
  res.status(200).json(await ChatService.checkUserBlockStatus(req.params.userId));
});

// Lift a lockout early
router.post('/users/:userId/unblock', async (req, res) => {
  const result = await ChatService.adminUnblockUser(req.params.userId, req.user.id);
  res.status(result.success ? 200 : 404).json(result);
});

export default router;
