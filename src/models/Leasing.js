import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

class Leasing extends Model { }

Leasing.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    interest_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
    },
    term_months: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
    }
}, {
    sequelize,
    modelName: 'Leasing',
    tableName: 'leasings',
    timestamps: true,
    paranoid: true,
    underscored: true
});

export default Leasing;
