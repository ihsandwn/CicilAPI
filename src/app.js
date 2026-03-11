import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sequelize } from './models/index.js';

import authRouter from './routes/auth.js';
import walletRouter from './routes/wallet.js';
import invoiceRouter from './routes/invoice.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { type: 'https://api.cicil.com/errors/rate-limit', title: 'Too Many Requests', status: 429, detail: 'Rate limit exceeded. Try again later.' }
});
app.use(limiter);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/swagger.json', (req, res) => res.json(swaggerSpec));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/invoices', invoiceRouter);

app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ meta: { timestamp: new Date().toISOString() }, data: { type: 'health', attributes: { status: 'Database connected' } } });
    } catch (error) {
        res.status(500).json({ type: 'https://api.cicil.com/errors/db-error', title: 'Database Error', status: 500, detail: 'Database connection failed' });
    }
});

app.use((err, req, res, _next) => {
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        type: 'https://api.cicil.com/errors/internal-error',
        title: 'Internal Server Error',
        status: statusCode,
        detail: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
        instance: req.originalUrl
    });
});

export default app;
