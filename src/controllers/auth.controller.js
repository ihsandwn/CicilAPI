import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { generateTokens } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/response.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const signup = async (req, res) => {
    try {
        const { name, phone, password } = req.body;

        const existingUser = await User.findOne({ where: { phone } });
        if (existingUser) {
            return formatError(res, 409, {
                type: 'https://api.cicil.com/errors/user-exists',
                title: 'Conflict',
                detail: 'Phone number already registered.',
                instance: req.originalUrl
            });
        }

        const newUser = await User.create({
            name,
            phone,
            password_hash: password
        });

        return formatResponse(res, 201, {
            type: 'user',
            id: newUser.id,
            attributes: {
                name: newUser.name,
                phone: newUser.phone,
                balance: 0,
                createdAt: newUser.createdAt
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error during signup',
            instance: req.originalUrl
        });
    }
};

export const login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        const user = await User.findOne({ where: { phone } });
        if (!user) {
            return formatError(res, 401, {
                type: 'https://api.cicil.com/errors/auth-failed',
                title: 'Authentication Failed',
                detail: 'Invalid phone number or password',
                instance: req.originalUrl
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return formatError(res, 401, {
                type: 'https://api.cicil.com/errors/auth-failed',
                title: 'Authentication Failed',
                detail: 'Invalid phone number or password',
                instance: req.originalUrl
            });
        }

        const tokens = generateTokens(user);
        user.refresh_token_hash = hashToken(tokens.refreshToken);
        await user.save();

        return formatResponse(res, 200, {
            type: 'auth',
            id: user.id,
            attributes: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: 900
            },
            relationships: {
                user: {
                    data: { type: 'user', id: user.id }
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error during login',
            instance: req.originalUrl
        });
    }
};

export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-for-dev');
        } catch {
            return formatError(res, 401, {
                type: 'https://api.cicil.com/errors/invalid-token',
                title: 'Invalid Token',
                detail: 'Refresh token is invalid or expired',
                instance: req.originalUrl
            });
        }

        const user = await User.findByPk(decoded.id);
        if (!user || !user.refresh_token_hash) {
            return formatError(res, 401, {
                type: 'https://api.cicil.com/errors/invalid-token',
                title: 'Invalid Token',
                detail: 'Refresh token has been revoked',
                instance: req.originalUrl
            });
        }

        const tokenHash = hashToken(refreshToken);
        if (tokenHash !== user.refresh_token_hash) {
            return formatError(res, 401, {
                type: 'https://api.cicil.com/errors/invalid-token',
                title: 'Invalid Token',
                detail: 'Refresh token does not match',
                instance: req.originalUrl
            });
        }

        const tokens = generateTokens(user);
        user.refresh_token_hash = hashToken(tokens.refreshToken);
        await user.save();

        return formatResponse(res, 200, {
            type: 'auth',
            id: user.id,
            attributes: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: 900
            },
            relationships: {
                user: {
                    data: { type: 'user', id: user.id }
                }
            }
        });
    } catch (error) {
        console.error('Refresh error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error during token refresh',
            instance: req.originalUrl
        });
    }
};

export const logout = async (req, res) => {
    try {
        const { id: userId } = req.user;

        const user = await User.findByPk(userId);
        if (user) {
            user.refresh_token_hash = null;
            await user.save();
            return formatResponse(res, 200, {
                type: 'message',
                id: userId,
                attributes: {
                    message: `Thankyou ${user.name}, see you next time`
                }
            });
        }

        return formatError(res, 404, {
            type: 'https://api.cicil.com/errors/not-found',
            title: 'Not Found',
            detail: 'User not found',
            instance: req.originalUrl
        });
    } catch (error) {
        console.error('Logout error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error during logout',
            instance: req.originalUrl
        });
    }
};
