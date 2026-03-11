import sequelize from '../config/database.js';
import User from './User.js';
import Car from './Car.js';
import Leasing from './Leasing.js';
import Invoice from './Invoice.js';
import Payment from './Payment.js';
import Transaction from './Transaction.js';

User.hasMany(Invoice, { foreignKey: 'user_id' });
Invoice.belongsTo(User, { foreignKey: 'user_id' });

Car.hasMany(Invoice, { foreignKey: 'car_id' });
Invoice.belongsTo(Car, { foreignKey: 'car_id' });

Leasing.hasMany(Invoice, { foreignKey: 'leasing_id' });
Invoice.belongsTo(Leasing, { foreignKey: 'leasing_id' });

Invoice.hasMany(Payment, { foreignKey: 'invoice_id' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id' });

User.hasMany(Transaction, { foreignKey: 'user_id' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

export {
    sequelize,
    User,
    Car,
    Leasing,
    Invoice,
    Payment,
    Transaction
};
