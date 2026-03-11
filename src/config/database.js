import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'cicil',
    process.env.DB_USER || 'cicil_user',
    process.env.DB_PASSWORD || 'secure_password',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'production' ? false : console.log,
        pool: {
            max: Number.parseInt(process.env.DB_POOL_MAX) || 20,
            min: Number.parseInt(process.env.DB_POOL_MIN) || 2,
            acquire: 30000,
            idle: 10000,
        },
    }
);

export default sequelize;
