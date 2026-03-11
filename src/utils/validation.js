import { z } from 'zod';
import { formatError } from './response.js';

export const validate = (schema) => (req, res, next) => {
    try {
        const validatedData = schema.parse(req.body);
        req.body = validatedData;
        next();
    } catch (error) {
        let errors = [];
        if (error instanceof z.ZodError) {
            errors = error.issues.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
        } else {
            errors = [{ field: 'unknown', message: error.message || 'Internal validation error' }];
        }

        return formatError(res, 400, {
            type: 'https://api.cicil.com/errors/validation-error',
            title: 'Validation Error',
            detail: 'Invalid request parameters',
            instance: req.originalUrl,
            errors
        });
    }
};

export const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be at most 15 digits'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

export const loginSchema = z.object({
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    password: z.string().min(1, 'Password is required')
});

export const walletTransactionSchema = z.object({
    amount: z.number()
        .min(10000, 'Minimum amount is 10,000')
        .max(1000000000, 'Maximum amount is 1,000,000,000')
});

export const invoiceCreationSchema = z.object({
    carId: z.string().uuid('Invalid car ID format'),
    leasingId: z.string().uuid('Invalid leasing ID format'),
    downPayment: z.number().nonnegative('Down payment cannot be negative')
});

export const invoicePaymentSchema = z.object({
    amount: z.number()
        .positive('Amount must be greater than zero')
        .max(1000000000, 'Maximum payment amount is 1,000,000,000')
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});
