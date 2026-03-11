import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
    await queryInterface.createTable('users', {
        id: { type: DataTypes.UUID, primaryKey: true },
        name: { type: DataTypes.STRING(100), allowNull: false },
        phone: { type: DataTypes.STRING(20), allowNull: false },
        password_hash: { type: DataTypes.STRING(255), allowNull: false },
        balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        refresh_token_hash: { type: DataTypes.STRING(255), allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
        deleted_at: { type: DataTypes.DATE }
    });

    await queryInterface.createTable('cars', {
        id: { type: DataTypes.UUID, primaryKey: true },
        brand_name: { type: DataTypes.STRING(50), allowNull: false },
        group_model_name: { type: DataTypes.STRING(50), allowNull: false },
        model_name: { type: DataTypes.STRING(100), allowNull: false },
        year: { type: DataTypes.INTEGER, allowNull: false },
        price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
        deleted_at: { type: DataTypes.DATE }
    });

    await queryInterface.createTable('leasings', {
        id: { type: DataTypes.UUID, primaryKey: true },
        name: { type: DataTypes.STRING(100), allowNull: false },
        interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        term_months: { type: DataTypes.INTEGER, allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
        deleted_at: { type: DataTypes.DATE }
    });

    await queryInterface.createTable('invoices', {
        id: { type: DataTypes.STRING(20), primaryKey: true },
        user_id: { type: DataTypes.UUID, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        car_id: { type: DataTypes.UUID, references: { model: 'cars', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        leasing_id: { type: DataTypes.UUID, references: { model: 'leasings', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        loan_principal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        loan_total: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        term_remaining: { type: DataTypes.INTEGER, allowNull: false },
        monthly_payment: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        next_payment_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        next_payment_due: { type: DataTypes.DATE, allowNull: false },
        total_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        missed_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, allowNull: false },
        status: { type: DataTypes.ENUM('active', 'paid_off', 'defaulted'), defaultValue: 'active' },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
        deleted_at: { type: DataTypes.DATE }
    });

    await queryInterface.createTable('payments', {
        id: { type: DataTypes.UUID, primaryKey: true },
        invoice_id: { type: DataTypes.STRING(20), references: { model: 'invoices', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        payment_type: { type: DataTypes.STRING(20), defaultValue: 'installment', allowNull: false },
        processed_at: { type: DataTypes.DATE, allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.createTable('transactions', {
        id: { type: DataTypes.UUID, primaryKey: true },
        user_id: { type: DataTypes.UUID, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        type: { type: DataTypes.ENUM('deposit', 'withdraw', 'payment'), allowNull: false },
        amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
        reference_type: { type: DataTypes.STRING(20), allowNull: true },
        reference_id: { type: DataTypes.STRING(50) },
        balance_after: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        created_at: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.sequelize.query(`ALTER TABLE cars ADD CONSTRAINT chk_cars_year CHECK (year > 1900)`);
    await queryInterface.sequelize.query(`ALTER TABLE cars ADD CONSTRAINT chk_cars_price CHECK (price > 0)`);
    await queryInterface.sequelize.query(`ALTER TABLE leasings ADD CONSTRAINT chk_leasings_term_months CHECK (term_months > 0)`);

    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_invoices_user_id ON invoices(user_id) WHERE deleted_at IS NULL`);
    await queryInterface.sequelize.query(`CREATE INDEX idx_invoices_status ON invoices(status) WHERE deleted_at IS NULL`);
    await queryInterface.addIndex('payments', ['invoice_id'], { name: 'idx_payments_invoice_id' });
    await queryInterface.addIndex('transactions', ['user_id'], { name: 'idx_transactions_user_id' });

    // Invoice ID sequence for concurrent-safe ID generation
    await queryInterface.sequelize.query(
        `CREATE SEQUENCE IF NOT EXISTS invoice_id_seq START WITH 1 INCREMENT BY 1`
    );
};

export const down = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(`DROP SEQUENCE IF EXISTS invoice_id_seq`);
    await queryInterface.dropTable('transactions');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('invoices');
    await queryInterface.dropTable('leasings');
    await queryInterface.dropTable('cars');
    await queryInterface.dropTable('users');
};
