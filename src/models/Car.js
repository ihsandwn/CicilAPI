import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

class Car extends Model { }

Car.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    brand_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    group_model_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    model_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1901 },
    },
    price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0.01 },
    }
}, {
    sequelize,
    modelName: 'Car',
    tableName: 'cars',
    timestamps: true,
    paranoid: true,
    underscored: true
});

export default Car;
