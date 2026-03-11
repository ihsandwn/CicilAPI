import * as walletService from '../services/wallet.service.js';
import { User, Transaction } from '../models/index.js';
import { formatResponse, formatError } from '../utils/response.js';

export const deposit = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { amount } = req.body;

        const result = await walletService.deposit(userId, amount);

        return formatResponse(res, 200, {
            type: 'transaction',
            id: result.transaction.id,
            attributes: {
                type: 'deposit',
                amount: Number(result.transaction.amount),
                balanceAfter: Number(result.transaction.balance_after),
                createdAt: result.transaction.created_at
            },
            relationships: {
                user: { data: { type: 'user', id: userId } }
            }
        });
    } catch (error) {
        if (error.message === 'User not found') {
            return formatError(res, 404, {
                type: 'https://api.cicil.com/errors/not-found',
                title: 'Not Found',
                detail: 'User not found',
                instance: req.originalUrl
            });
        }
        console.error('Deposit error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error during deposit',
            instance: req.originalUrl
        });
    }
};

export const withdraw = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { amount } = req.body;

        const result = await walletService.withdraw(userId, amount);

        return formatResponse(res, 200, {
            type: 'transaction',
            id: result.transaction.id,
            attributes: {
                type: 'withdraw',
                amount: Number(result.transaction.amount),
                balanceAfter: Number(result.transaction.balance_after),
                createdAt: result.transaction.created_at
            },
            relationships: {
                user: { data: { type: 'user', id: userId } }
            }
        });
    } catch (error) {
        if (error.code === 'INSUFFICIENT_BALANCE') {
            return formatError(res, 400, {
                type: 'https://api.cicil.com/errors/insufficient-balance',
                title: 'Insufficient Balance',
                detail: error.message,
                instance: req.originalUrl
            });
        }
        if (error.message === 'User not found') {
            return formatError(res, 404, {
                type: 'https://api.cicil.com/errors/not-found',
                title: 'Not Found',
                detail: 'User not found',
                instance: req.originalUrl
            });
        }
        console.error('Withdraw error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error during withdrawal',
            instance: req.originalUrl
        });
    }
};

export const getBalance = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const user = await User.findByPk(userId);

        if (!user) {
            return formatError(res, 404, {
                type: 'https://api.cicil.com/errors/not-found',
                title: 'Not Found',
                detail: 'User not found',
                instance: req.originalUrl
            });
        }

        return formatResponse(res, 200, {
            type: 'wallet',
            id: userId,
            attributes: {
                balance: Number(user.balance),
                currency: 'IDR'
            }
        });
    } catch (error) {
        console.error('Get balance error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error getting balance',
            instance: req.originalUrl
        });
    }
};

export const getTransactions = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        const { count: total, rows } = await Transaction.findAndCountAll({
            where: { user_id: userId },
            limit,
            offset,
            order: [['created_at', 'DESC']]
        });

        const totalPages = Math.ceil(total / limit);

        const data = rows.map(t => ({
            type: 'transaction',
            id: t.id,
            attributes: {
                type: t.type,
                amount: Number(t.amount),
                balanceAfter: Number(t.balance_after),
                referenceType: t.reference_type,
                referenceId: t.reference_id,
                createdAt: t.created_at
            }
        }));

        return formatResponse(res, 200, data, {
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error getting transactions',
            instance: req.originalUrl
        });
    }
};
