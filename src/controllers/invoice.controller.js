import * as invoiceService from '../services/invoice.service.js';
import * as paymentService from '../services/payment.service.js';
import { formatResponse, formatError } from '../utils/response.js';

const formatInvoiceData = (invoice) => ({
    type: 'invoice',
    id: invoice.id,
    attributes: {
        loanPrincipal: Number(invoice.loan_principal),
        loanTotal: Number(invoice.loan_total),
        monthlyPayment: Number(invoice.monthly_payment),
        termRemaining: invoice.term_remaining,
        nextPaymentAmount: Number(invoice.next_payment_amount),
        nextPaymentDue: invoice.next_payment_due,
        totalPaid: Number(invoice.total_paid),
        missedAmount: Number(invoice.missed_amount || 0),
        status: invoice.status,
        createdAt: invoice.createdAt
    },
    relationships: {
        customer: {
            data: {
                type: 'user',
                id: invoice.User.id,
                attributes: { name: invoice.User.name, phone: invoice.User.phone }
            }
        },
        car: {
            data: {
                type: 'car',
                id: invoice.Car.id,
                attributes: {
                    brandName: invoice.Car.brand_name,
                    groupModelName: invoice.Car.group_model_name,
                    modelName: invoice.Car.model_name,
                    year: invoice.Car.year,
                    price: Number(invoice.Car.price)
                }
            }
        },
        leasing: {
            data: {
                type: 'leasing',
                id: invoice.Leasing.id,
                attributes: {
                    name: invoice.Leasing.name,
                    interestRate: Number(invoice.Leasing.interest_rate)
                }
            }
        }
    }
});

const attachPayments = (data, payments) => {
    if (payments) {
        data.relationships.payments = {
            data: payments.map(p => ({
                type: 'payment',
                id: p.id,
                attributes: {
                    amount: Number(p.amount),
                    paymentType: p.payment_type,
                    processedAt: p.processed_at
                }
            }))
        };
    }
};

export const createInvoice = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const invoice = await invoiceService.createInvoice(userId, req.body);
        return formatResponse(res, 201, formatInvoiceData(invoice));
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('Invalid references') || error.message.includes('Down payment')) {
            return formatError(res, 400, {
                type: 'https://api.cicil.com/errors/bad-request',
                title: 'Bad Request',
                detail: error.message,
                instance: req.originalUrl
            });
        }
        console.error('Create invoice error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error creating invoice',
            instance: req.originalUrl
        });
    }
};

export const getInvoice = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { id: invoiceId } = req.params;

        const invoice = await invoiceService.getInvoiceById(userId, invoiceId);
        const data = formatInvoiceData(invoice);
        attachPayments(data, invoice.Payments);

        return formatResponse(res, 200, data);
    } catch (error) {
        if (error.message === 'Invoice not found') {
            return formatError(res, 404, {
                type: 'https://api.cicil.com/errors/not-found',
                title: 'Not Found',
                detail: 'Invoice not found',
                instance: req.originalUrl
            });
        }
        console.error('Get invoice error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error getting invoice',
            instance: req.originalUrl
        });
    }
};

export const payInvoice = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { id: invoiceId } = req.params;
        const { amount } = req.body;

        await paymentService.processPayment(userId, invoiceId, amount);

        const fullInvoice = await invoiceService.getInvoiceById(userId, invoiceId);
        const data = formatInvoiceData(fullInvoice);
        attachPayments(data, fullInvoice.Payments);

        return formatResponse(res, 200, data);
    } catch (error) {
        if (error.code === 'INSUFFICIENT_BALANCE') {
            return formatError(res, 400, {
                type: 'https://api.cicil.com/errors/insufficient-balance',
                title: 'Insufficient Balance',
                detail: error.message,
                instance: req.originalUrl
            });
        }
        if (error.message === 'Invoice not found' || error.message === 'User not found') {
            return formatError(res, 404, {
                type: 'https://api.cicil.com/errors/not-found',
                title: 'Not Found',
                detail: error.message,
                instance: req.originalUrl
            });
        }
        if (error.message === 'Invoice is not active') {
            return formatError(res, 400, {
                type: 'https://api.cicil.com/errors/bad-request',
                title: 'Bad Request',
                detail: error.message,
                instance: req.originalUrl
            });
        }
        console.error('Pay invoice error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error during payment processing',
            instance: req.originalUrl
        });
    }
};

export const listInvoices = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const status = req.query.status || undefined;

        const { count: total, rows } = await invoiceService.getAllInvoices({
            userId,
            status,
            page,
            limit
        });

        const totalPages = Math.ceil(total / limit);
        const data = rows.map(invoice => formatInvoiceData(invoice));

        return formatResponse(res, 200, data, {
            pagination: { page, limit, total, totalPages }
        });
    } catch (error) {
        console.error('List invoices error:', error);
        return formatError(res, 500, {
            title: 'Internal Server Error',
            detail: 'Internal server error listing invoices',
            instance: req.originalUrl
        });
    }
};
