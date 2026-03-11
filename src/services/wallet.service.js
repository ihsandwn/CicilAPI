import Decimal from 'decimal.js';
import { User, Transaction, sequelize } from '../models/index.js';

export const deposit = async (userId, amount) => {
    return await sequelize.transaction(async (t) => {
        const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!user) {
            throw new Error('User not found');
        }

        const currentBalance = new Decimal(user.balance);
        const depositAmount = new Decimal(amount);
        const newBalance = currentBalance.plus(depositAmount);

        user.balance = newBalance.toNumber();
        await user.save({ transaction: t });

        const transaction = await Transaction.create({
            user_id: userId,
            type: 'deposit',
            amount: depositAmount.toNumber(),
            reference_type: 'wallet',
            balance_after: newBalance.toNumber()
        }, { transaction: t });

        return { user, transaction };
    });
};

export const withdraw = async (userId, amount) => {
    return await sequelize.transaction(async (t) => {
        const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!user) {
            throw new Error('User not found');
        }

        const currentBalance = new Decimal(user.balance);
        const withdrawAmount = new Decimal(amount);

        if (currentBalance.lessThan(withdrawAmount)) {
            const error = new Error('Insufficient balance');
            error.code = 'INSUFFICIENT_BALANCE';
            throw error;
        }

        const newBalance = currentBalance.minus(withdrawAmount);

        user.balance = newBalance.toNumber();
        await user.save({ transaction: t });

        const transaction = await Transaction.create({
            user_id: userId,
            type: 'withdraw',
            amount: withdrawAmount.toNumber(),
            reference_type: 'wallet',
            balance_after: newBalance.toNumber()
        }, { transaction: t });

        return { user, transaction };
    });
};
