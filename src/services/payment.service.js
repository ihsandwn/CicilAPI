import Decimal from 'decimal.js';
import { User, Invoice, Payment, Transaction, sequelize } from '../models/index.js';

// Processes installment payment with underpayment penalty (2% on shortfall)
export const processPayment = async (userId, invoiceId, amount) => {
    return await sequelize.transaction(async (t) => {
        const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!user) throw new Error('User not found');

        const invoice = await Invoice.findOne({
            where: { id: invoiceId, user_id: userId },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!invoice) throw new Error('Invoice not found');
        if (invoice.status !== 'active') throw new Error('Invoice is not active');

        const dBalance = new Decimal(user.balance);
        const dPaymentAmount = new Decimal(amount);

        if (dBalance.lessThan(dPaymentAmount)) {
            const err = new Error('Insufficient wallet balance');
            err.code = 'INSUFFICIENT_BALANCE';
            throw err;
        }

        const newBalance = dBalance.minus(dPaymentAmount);
        user.balance = newBalance.toNumber();
        await user.save({ transaction: t });

        await Transaction.create({
            user_id: user.id,
            type: 'payment',
            amount: dPaymentAmount.toNumber(),
            reference_type: 'invoice',
            reference_id: invoice.id,
            balance_after: newBalance.toNumber()
        }, { transaction: t });

        const payment = await Payment.create({
            invoice_id: invoice.id,
            amount: dPaymentAmount.toNumber(),
            payment_type: 'installment',
            processed_at: new Date()
        }, { transaction: t });

        const dNextDue = new Decimal(invoice.next_payment_amount);
        const dStandardMonthly = new Decimal(invoice.monthly_payment);
        const dTotalPaid = new Decimal(invoice.total_paid).plus(dPaymentAmount);

        let newNextPayment = dStandardMonthly;
        let missedAmount = new Decimal(0);

        if (dPaymentAmount.lessThan(dNextDue)) {
            missedAmount = dNextDue.minus(dPaymentAmount);
            const penalty = missedAmount.times(0.02);
            newNextPayment = dStandardMonthly.plus(missedAmount).plus(penalty);
        }

        const newTermRemaining = invoice.term_remaining - 1;

        invoice.total_paid = dTotalPaid.toNumber();
        invoice.term_remaining = Math.max(0, newTermRemaining);
        invoice.missed_amount = missedAmount.toNumber();
        invoice.next_payment_amount = newNextPayment.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

        const nextDate = new Date(invoice.next_payment_due);
        nextDate.setMonth(nextDate.getMonth() + 1);
        invoice.next_payment_due = nextDate;

        if (invoice.term_remaining === 0 || dTotalPaid.greaterThanOrEqualTo(new Decimal(invoice.loan_total))) {
            invoice.status = 'paid_off';
            invoice.next_payment_amount = 0;
            invoice.missed_amount = 0;
        }

        await invoice.save({ transaction: t });

        return { invoice, user, payment, missedAmount: missedAmount.toNumber() };
    });
};
