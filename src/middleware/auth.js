import jwt from 'jsonwebtoken';
import { formatError } from '../utils/response.js';

export const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user.id, phone: user.phone },
        process.env.JWT_SECRET || 'secret-key-for-dev',
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-for-dev',
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

export const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return formatError(res, 401, {
            type: 'https://api.cicil.com/errors/unauthorized',
            title: 'Unauthorized',
            detail: 'Access token is required',
            instance: req.originalUrl
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret-key-for-dev', (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return formatError(res, 401, {
                    type: 'https://api.cicil.com/errors/token-expired',
                    title: 'Token Expired',
                    detail: 'Access token has expired',
                    instance: req.originalUrl
                });
            }
            return formatError(res, 403, {
                type: 'https://api.cicil.com/errors/forbidden',
                title: 'Forbidden',
                detail: 'Invalid access token',
                instance: req.originalUrl
            });
        }

        req.user = user;
        next();
    });
};
