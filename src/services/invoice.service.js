import Decimal from 'decimal.js';
import { User, Car, Leasing, Invoice, sequelize, Payment } from '../models/index.js';

// Simple interest: (1 + rate*years) * principal / months
const calculateMonthlyPayment = (principal, annualRate, months) => {
    const dPrincipal = new Decimal(principal);
    const dRate = new Decimal(annualRate).dividedBy(100);
    const years = new Decimal(months).dividedBy(12);
    const factor = new Decimal(1).plus(dRate.times(years));

    return factor.times(dPrincipal).dividedBy(new Decimal(months)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
};

export const createInvoice = async (userId, data) => {
    return await sequelize.transaction(async (t) => {
        const { carId, leasingId, downPayment } = data;

        const [user, car, leasing] = await Promise.all([
            User.findByPk(userId, { transaction: t }),
            Car.findByPk(carId, { transaction: t }),
            Leasing.findByPk(leasingId, { transaction: t })
        ]);

        if (!user || !car || !leasing) {
            throw new Error('Invalid references: User, Car, or Leasing not found');
        }

        const dCarPrice = new Decimal(car.price);
        const dDownPayment = new Decimal(downPayment);
        if (dDownPayment.greaterThanOrEqualTo(dCarPrice)) {
            throw new Error('Down payment must be less than car price');
        }

        const loanPrincipal = dCarPrice.minus(dDownPayment);
        const monthlyPayment = calculateMonthlyPayment(loanPrincipal, leasing.interest_rate, leasing.term_months);
        const loanTotal = monthlyPayment.times(leasing.term_months);

        const [[{ nextval }]] = await sequelize.query(
            `SELECT nextval('invoice_id_seq')`,
            { transaction: t }
        );
        const invoiceId = `INV${String(nextval).padStart(3, '0')}`;

        const nextPaymentDue = new Date();
        nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);

        const invoice = await Invoice.create({
            id: invoiceId,
            user_id: user.id,
            car_id: car.id,
            leasing_id: leasing.id,
            loan_principal: loanPrincipal.toNumber(),
            loan_total: loanTotal.toNumber(),
            term_remaining: leasing.term_months,
            monthly_payment: monthlyPayment.toNumber(),
            next_payment_amount: monthlyPayment.toNumber(),
            next_payment_due: nextPaymentDue,
            total_paid: 0,
            missed_amount: 0,
            status: 'active'
        }, { transaction: t });

        invoice.User = user;
        invoice.Car = car;
        invoice.Leasing = leasing;

        return invoice;
    });
};

export const getInvoiceById = async (userId, invoiceId) => {
    const invoice = await Invoice.findOne({
        where: { id: invoiceId, user_id: userId },
        include: [User, Car, Leasing, Payment]
    });

    if (!invoice) throw new Error('Invoice not found');
    return invoice;
};

export const getAllInvoices = async ({ userId, status, page = 1, limit = 10 } = {}) => {
    const where = {};
    if (userId) where.user_id = userId;
    if (status) where.status = status;

    return await Invoice.findAndCountAll({
        where,
        include: [User, Car, Leasing],
        order: [['created_at', 'DESC']],
        limit,
        offset: (page - 1) * limit
    });
};
