import express from 'express';
import { deposit, withdraw, getBalance, getTransactions } from '../controllers/wallet.controller.js';
import { validate, walletTransactionSchema } from '../utils/validation.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /wallet/balance:
 *   get:
 *     summary: Get current wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current wallet balance
 *       401:
 *         description: Unauthorized
 */
router.get('/balance', verifyToken, getBalance);

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated transaction history
 *       401:
 *         description: Unauthorized
 */
router.get('/transactions', verifyToken, getTransactions);

/**
 * @swagger
 * /wallet/deposit:
 *   post:
 *     summary: Deposit funds into user wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 10000
 *                 maximum: 1000000000
 *                 example: 10000000
 *     responses:
 *       200:
 *         description: Deposit successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/deposit', verifyToken, validate(walletTransactionSchema), deposit);

/**
 * @swagger
 * /wallet/withdraw:
 *   post:
 *     summary: Withdraw funds from user wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 10000
 *                 maximum: 1000000000
 *                 example: 5000000
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *       400:
 *         description: Insufficient funds or validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/withdraw', verifyToken, validate(walletTransactionSchema), withdraw);

export default router;
