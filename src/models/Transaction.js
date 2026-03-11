import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

class Transaction extends Model { }

Transaction.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('deposit', 'withdraw', 'payment'),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    reference_type: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    reference_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    balance_after: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    }
}, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
});

export default Transaction;
