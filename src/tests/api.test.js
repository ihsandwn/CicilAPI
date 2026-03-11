import request from 'supertest';
import app from '../app.js';
import { sequelize, User, Car, Leasing, Invoice, Payment, Transaction } from '../models/index.js';

describe('Cicil API — Full Scenario Test', () => {
    const testUser = {
        name: 'Bob',
        phone: '08161133214',
        password: 'SecurePass123'
    };
    let accessToken;
    let refreshToken;
    let carId;
    let leasingId;
    let invoiceId;

    beforeAll(async () => {
        await Payment.destroy({ where: {}, force: true });
        await Transaction.destroy({ where: {}, force: true });
        await Invoice.destroy({ where: {}, force: true });
        const user = await User.findOne({ where: { phone: testUser.phone } });
        if (user) await user.destroy({ force: true });

        const [car] = await Car.findOrCreate({
            where: { brand_name: 'Honda', model_name: '1.5 Turbo Prestige', year: 2020 },
            defaults: {
                brand_name: 'Honda',
                group_model_name: 'CR-V',
                model_name: '1.5 Turbo Prestige',
                year: 2020,
                price: 300000000
            }
        });
        carId = car.id;

        const [leasing] = await Leasing.findOrCreate({
            where: { name: 'Clipan Finance' },
            defaults: {
                name: 'Clipan Finance',
                interest_rate: 11,
                term_months: 48
            }
        });
        leasingId = leasing.id;
    });

    afterAll(async () => {
        await Payment.destroy({ where: {}, force: true });
        await Transaction.destroy({ where: {}, force: true });
        await Invoice.destroy({ where: {}, force: true });
        const user = await User.findOne({ where: { phone: testUser.phone } });
        if (user) await user.destroy({ force: true });
        await sequelize.close();
    });

    // ─── Step 1: Sign Up ─────────────────────────────────────────────
    describe('Step 1: Sign Up — Buat user baru', () => {
        it('should register Bob successfully', async () => {
            const res = await request(app).post('/api/v1/auth/signup').send(testUser);
            expect(res.statusCode).toBe(201);
            expect(res.body.data.type).toBe('user');
            expect(res.body.data.attributes.name).toBe('Bob');
            expect(res.body.data.attributes.phone).toBe('08161133214');
            expect(res.body.data.attributes.balance).toBe(0);
            expect(res.body.meta).toHaveProperty('requestId');
            expect(res.body.meta).toHaveProperty('timestamp');
        });

        it('should reject duplicate phone number', async () => {
            const res = await request(app).post('/api/v1/auth/signup').send(testUser);
            expect(res.statusCode).toBe(409);
            expect(res.body).toHaveProperty('status', 409);
        });

        it('should reject invalid input (short phone)', async () => {
            const res = await request(app).post('/api/v1/auth/signup').send({
                name: 'X',
                phone: '0811',
                password: '123'
            });
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('errors');
        });
    });

    // ─── Step 2: Login ───────────────────────────────────────────────
    describe('Step 2: Login — Login user dan mengembalikan token authentication', () => {
        it('should login Bob and return tokens', async () => {
            const res = await request(app).post('/api/v1/auth/login').send({
                phone: testUser.phone,
                password: testUser.password
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.data.type).toBe('auth');
            expect(res.body.data.attributes).toHaveProperty('accessToken');
            expect(res.body.data.attributes).toHaveProperty('refreshToken');
            expect(res.body.data.attributes.expiresIn).toBe(900);
            accessToken = res.body.data.attributes.accessToken;
            refreshToken = res.body.data.attributes.refreshToken;
        });

        it('should reject wrong password', async () => {
            const res = await request(app).post('/api/v1/auth/login').send({
                phone: testUser.phone,
                password: 'wrongpassword'
            });
            expect(res.statusCode).toBe(401);
        });

        it('should reject non-existent phone', async () => {
            const res = await request(app).post('/api/v1/auth/login').send({
                phone: '0899999999',
                password: 'whatever123'
            });
            expect(res.statusCode).toBe(401);
        });

        it('should refresh tokens successfully', async () => {
            const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
            expect(res.statusCode).toBe(200);
            expect(res.body.data.attributes).toHaveProperty('accessToken');
            expect(res.body.data.attributes).toHaveProperty('refreshToken');
            accessToken = res.body.data.attributes.accessToken;
            refreshToken = res.body.data.attributes.refreshToken;
        });

        it('should reject old refresh token after rotation', async () => {
            const res = await request(app).post('/api/v1/auth/refresh').send({
                refreshToken: 'old-invalid-token'
            });
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Step 3: Deposit ─────────────────────────────────────────────
    describe('Step 3: Deposit — User yang sudah login dapat melakukan deposit', () => {
        it('should reject request without auth token', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/deposit')
                .send({ amount: 10000000 });
            expect(res.statusCode).toBe(401);
        });

        it('should reject deposit below minimum (10,000)', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/deposit')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 5000 });
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('errors');
        });

        it('should deposit 10,000,000 — balance becomes 10,000,000', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/deposit')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 10000000 });
            expect(res.statusCode).toBe(200);
            expect(res.body.data.type).toBe('transaction');
            expect(res.body.data.attributes.type).toBe('deposit');
            expect(res.body.data.attributes.amount).toBe(10000000);
            expect(res.body.data.attributes.balanceAfter).toBe(10000000);
        });

        it('should verify balance is 10,000,000', async () => {
            const res = await request(app)
                .get('/api/v1/wallet/balance')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.data.type).toBe('wallet');
            expect(res.body.data.attributes.balance).toBe(10000000);
            expect(res.body.data.attributes.currency).toBe('IDR');
        });
    });

    // ─── Step 4: Withdraw ────────────────────────────────────────────
    describe('Step 4: Withdraw — User yang sudah login dan deposit dapat melakukan withdraw', () => {
        it('should reject withdrawal exceeding balance', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/withdraw')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 999999999 });
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('status', 400);
        });

        it('should withdraw 1,000,000 — balance becomes 9,000,000', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/withdraw')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 1000000 });
            expect(res.statusCode).toBe(200);
            expect(res.body.data.attributes.type).toBe('withdraw');
            expect(res.body.data.attributes.amount).toBe(1000000);
            expect(res.body.data.attributes.balanceAfter).toBe(9000000);
        });

        it('should verify balance is 9,000,000', async () => {
            const res = await request(app)
                .get('/api/v1/wallet/balance')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.body.data.attributes.balance).toBe(9000000);
        });

        it('should show transaction history (deposit + withdraw)', async () => {
            const res = await request(app)
                .get('/api/v1/wallet/transactions?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.meta).toHaveProperty('pagination');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(2);
        });
    });

    // ─── Step 5: Create Invoice ──────────────────────────────────────
    describe('Step 5: Create Invoice — Buat invoice untuk digunakan oleh customer', () => {
        it('should reject invalid carId/leasingId', async () => {
            const res = await request(app)
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    carId: '00000000-0000-0000-0000-000000000000',
                    leasingId: '00000000-0000-0000-0000-000000000000',
                    downPayment: 100000000
                });
            expect(res.statusCode).toBe(400);
        });

        it('should create invoice — Honda CR-V + Clipan Finance, DP 100,000,000', async () => {
            const res = await request(app)
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    carId,
                    leasingId,
                    downPayment: 100000000
                });
            expect(res.statusCode).toBe(201);
            expect(res.body.data.type).toBe('invoice');

            const attrs = res.body.data.attributes;
            const rels = res.body.data.relationships;

            invoiceId = res.body.data.id;

            // loanPrincipal = 300M - 100M DP = 200M
            expect(attrs.loanPrincipal).toBe(200000000);
            // loanTotal = (1 + 0.11 * 4) * 200M = 288M
            expect(attrs.loanTotal).toBe(288000000);
            // monthly = 288M / 48 = 6M
            expect(attrs.monthlyPayment).toBe(6000000);
            expect(attrs.nextPaymentAmount).toBe(6000000);
            expect(attrs.termRemaining).toBe(48);
            expect(attrs.totalPaid).toBe(0);
            expect(attrs.missedAmount).toBe(0);
            expect(attrs.status).toBe('active');
            expect(attrs).toHaveProperty('nextPaymentDue');

            // Customer relationship
            expect(rels.customer.data.attributes.name).toBe('Bob');
            expect(rels.customer.data.attributes.phone).toBe('08161133214');
            // Car relationship
            expect(rels.car.data.attributes.brandName).toBe('Honda');
            expect(rels.car.data.attributes.groupModelName).toBe('CR-V');
            expect(rels.car.data.attributes.modelName).toBe('1.5 Turbo Prestige');
            expect(rels.car.data.attributes.year).toBe(2020);
            expect(rels.car.data.attributes.price).toBe(300000000);
            // Leasing relationship
            expect(rels.leasing.data.attributes.name).toBe('Clipan Finance');
            expect(rels.leasing.data.attributes.interestRate).toBe(11);
        });
    });

    // ─── Step 6: Get Invoice ─────────────────────────────────────────
    describe('Step 6: Get Invoice — Mengembalikan detail invoice (sebelum transfer)', () => {
        it('should return 404 for non-existent invoice', async () => {
            const res = await request(app)
                .get('/api/v1/invoices/INV999')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(404);
        });

        it('should return invoice detail with empty payments', async () => {
            const res = await request(app)
                .get(`/api/v1/invoices/${invoiceId}`)
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.data.type).toBe('invoice');
            expect(res.body.data.id).toBe(invoiceId);
            expect(res.body.data.attributes.loanPrincipal).toBe(200000000);
            expect(res.body.data.attributes.loanTotal).toBe(288000000);
            expect(res.body.data.attributes.termRemaining).toBe(48);
            expect(res.body.data.attributes.totalPaid).toBe(0);
            expect(res.body.data.relationships).toHaveProperty('payments');
            expect(res.body.data.relationships.payments.data).toHaveLength(0);
        });

        it('should list invoices with pagination', async () => {
            const res = await request(app)
                .get('/api/v1/invoices?status=active&page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.meta).toHaveProperty('pagination');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ─── Step 7: Transfer (Underpayment — bunga penalti) ─────────────
    describe('Step 7: Transfer — Underpayment 5M dari 6M cicilan (bunga penalti 2%)', () => {
        it('should reject payment with insufficient wallet balance', async () => {
            const res = await request(app)
                .post(`/api/v1/invoices/${invoiceId}/pay`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 999999999 });
            expect(res.statusCode).toBe(400);
        });

        it('should pay 5,000,000 — underpayment triggers penalty', async () => {
            const res = await request(app)
                .post(`/api/v1/invoices/${invoiceId}/pay`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 5000000 });
            expect(res.statusCode).toBe(200);

            const attrs = res.body.data.attributes;

            // Term: 48 → 47
            expect(attrs.termRemaining).toBe(47);
            // Total paid: 0 + 5M = 5M
            expect(attrs.totalPaid).toBe(5000000);
            // Missed: 6M - 5M = 1M
            expect(attrs.missedAmount).toBe(1000000);
            // Next = monthly(6M) + missed(1M) + penalty(1M × 2% = 20K) = 7,020,000
            expect(attrs.nextPaymentAmount).toBe(7020000);
            expect(attrs.status).toBe('active');

            // Payment history: 1 entry
            const payments = res.body.data.relationships.payments.data;
            expect(payments).toHaveLength(1);
            expect(payments[0].attributes.amount).toBe(5000000);
            expect(payments[0].attributes.paymentType).toBe('installment');

            // Relationships intact
            expect(res.body.data.relationships.customer.data.attributes.name).toBe('Bob');
            expect(res.body.data.relationships.leasing.data.attributes.name).toBe('Clipan Finance');
            expect(res.body.data.relationships.car.data.attributes.brandName).toBe('Honda');
        });

        it('should deduct wallet: 9M - 5M = 4M', async () => {
            const res = await request(app)
                .get('/api/v1/wallet/balance')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.body.data.attributes.balance).toBe(4000000);
        });

        it('should record payment transaction in history', async () => {
            const res = await request(app)
                .get('/api/v1/wallet/transactions?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(200);
            const paymentTx = res.body.data.find(t => t.attributes.type === 'payment');
            expect(paymentTx).toBeDefined();
            expect(paymentTx.attributes.amount).toBe(5000000);
            expect(paymentTx.attributes.referenceType).toBe('invoice');
        });
    });

    // ─── Step 7b: Get Invoice after underpayment ─────────────────────
    describe('Step 7b: Get Invoice — Verifikasi setelah underpayment', () => {
        it('should reflect updated state after underpayment', async () => {
            const res = await request(app)
                .get(`/api/v1/invoices/${invoiceId}`)
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(200);

            const attrs = res.body.data.attributes;
            expect(attrs.loanPrincipal).toBe(200000000);
            expect(attrs.loanTotal).toBe(288000000);
            expect(attrs.termRemaining).toBe(47);
            expect(attrs.totalPaid).toBe(5000000);
            expect(attrs.missedAmount).toBe(1000000);
            expect(attrs.nextPaymentAmount).toBe(7020000);
            expect(attrs.status).toBe('active');

            const payments = res.body.data.relationships.payments.data;
            expect(payments).toHaveLength(1);
            expect(payments[0].attributes.amount).toBe(5000000);
        });
    });

    // ─── Step 7c: Transfer (Full payment — clears penalty) ───────────
    describe('Step 7c: Transfer — Full payment 7,020,000 (clears penalty)', () => {
        it('should deposit more funds for next payment', async () => {
            const res = await request(app)
                .post('/api/v1/wallet/deposit')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 10000000 });
            expect(res.statusCode).toBe(200);
            expect(res.body.data.attributes.balanceAfter).toBe(14000000);
        });

        it('should pay exact 7,020,000 — full payment resets penalty', async () => {
            const res = await request(app)
                .post(`/api/v1/invoices/${invoiceId}/pay`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 7020000 });
            expect(res.statusCode).toBe(200);

            const attrs = res.body.data.attributes;
            // Term: 47 → 46
            expect(attrs.termRemaining).toBe(46);
            // Total paid: 5M + 7.02M = 12,020,000
            expect(attrs.totalPaid).toBe(12020000);
            // Full payment → no missed, next = standard 6M
            expect(attrs.missedAmount).toBe(0);
            expect(attrs.nextPaymentAmount).toBe(6000000);

            // 2 payments total
            expect(res.body.data.relationships.payments.data).toHaveLength(2);
        });

        it('should verify wallet: 14M - 7.02M = 6,980,000', async () => {
            const res = await request(app)
                .get('/api/v1/wallet/balance')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.body.data.attributes.balance).toBe(6980000);
        });
    });

    // ─── Step 8: Logout ──────────────────────────────────────────────
    describe('Step 8: Logout — Logout user yang sudah login', () => {
        it('should reject logout without token', async () => {
            const res = await request(app).post('/api/v1/auth/logout');
            expect(res.statusCode).toBe(401);
        });

        it('should logout Bob successfully', async () => {
            const res = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.data.attributes.message).toBe('Thankyou Bob, see you next time');
        });

        it('should reject refresh after logout (token invalidated)', async () => {
            const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
            expect(res.statusCode).toBe(401);
        });
    });
});
