import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

class Payment extends Model { }

Payment.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    invoice_id: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    payment_type: {
        type: DataTypes.STRING(20),
        defaultValue: 'installment',
        allowNull: false,
    },
    processed_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    }
}, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
});

export default Payment;
