import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

class Invoice extends Model { }

Invoice.init({
    id: {
        type: DataTypes.STRING(20),
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    car_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    leasing_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    loan_principal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    loan_total: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    term_remaining: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    monthly_payment: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    next_payment_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    next_payment_due: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    total_paid: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
    },
    missed_amount: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
    },
    status: {
        type: DataTypes.ENUM('active', 'paid_off', 'defaulted'),
        defaultValue: 'active',
    }
}, {
    sequelize,
    modelName: 'Invoice',
    tableName: 'invoices',
    timestamps: true,
    paranoid: true,
    underscored: true
});

export default Invoice;
