import express from 'express';
import { createInvoice, getInvoice, payInvoice, listInvoices } from '../controllers/invoice.controller.js';
import { validate, invoiceCreationSchema, invoicePaymentSchema } from '../utils/validation.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List user invoices
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, paid_off, defaulted]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of user invoices
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyToken, listInvoices);

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Create new credit invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [carId, leasingId, downPayment]
 *             properties:
 *               carId:
 *                 type: string
 *                 format: uuid
 *               leasingId:
 *                 type: string
 *                 format: uuid
 *               downPayment:
 *                 type: number
 *                 example: 100000000
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Validation error or invalid references
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyToken, validate(invoiceCreationSchema), createInvoice);

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get invoice details with payment history
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: INV001
 *     responses:
 *       200:
 *         description: Invoice details with payments
 *       404:
 *         description: Invoice not found
 */
router.get('/:id', verifyToken, getInvoice);

/**
 * @swagger
 * /invoices/{id}/pay:
 *   post:
 *     summary: Process payment for an invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: INV001
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
 *                 example: 6000000
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Insufficient balance or invoice not active
 *       404:
 *         description: Invoice not found
 */
router.post('/:id/pay', verifyToken, validate(invoicePaymentSchema), payInvoice);

export default router;
