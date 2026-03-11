import { sequelize, User, Car, Leasing, Invoice, Payment, Transaction } from '../models/index.js';

const generateInvoiceId = async () => {
    const [[{ nextval }]] = await sequelize.query(
        `SELECT nextval('invoice_id_seq')`
    );
    return `INV${String(nextval).padStart(3, '0')}`;
};

const seed = async () => {
    try {
        console.log('--- Starting Seeding Process ---');
        await sequelize.authenticate();

        const leasingsData = [
            { name: 'BCA Finance', interest_rate: 11.50, term_months: 60 },
            { name: 'Adira Finance', interest_rate: 12.00, term_months: 48 },
            { name: 'Mandiri Tunas Finance', interest_rate: 11.00, term_months: 60 },
            { name: 'Maybank Finance', interest_rate: 11.25, term_months: 48 },
            { name: 'Clipan Finance', interest_rate: 11, term_months: 48 },
        ];

        for (const item of leasingsData) {
            await Leasing.findOrCreate({ where: { name: item.name }, defaults: item });
        }
        const seededLeasings = await Leasing.findAll();
        console.log(`${seededLeasings.length} leasings available.`);

        const carsData = [
            { brand_name: 'Toyota', group_model_name: 'Avanza', model_name: '1.5 G CVT', year: 2023, price: 272500000 },
            { brand_name: 'Honda', group_model_name: 'HR-V', model_name: '1.5 SE CVT', year: 2024, price: 416100000 },
            { brand_name: 'Mitsubishi', group_model_name: 'Xpander', model_name: 'Ultimate CVT', year: 2023, price: 312900000 },
            { brand_name: 'Hyundai', group_model_name: 'Stargazer', model_name: 'Prime IVT', year: 2023, price: 311800000 },
            { brand_name: 'Wuling', group_model_name: 'Air EV', model_name: 'Long Range', year: 2023, price: 299500000 },
            { brand_name: 'Honda', group_model_name: 'CR-V', model_name: '1.5 Turbo Prestige', year: 2020, price: 300000000 }
        ];

        for (const item of carsData) {
            await Car.findOrCreate({
                where: { brand_name: item.brand_name, model_name: item.model_name, year: item.year },
                defaults: item
            });
        }
        const seededCars = await Car.findAll();
        console.log(`${seededCars.length} cars available.`);

        const [testUser] = await User.findOrCreate({
            where: { phone: '08123456789' },
            defaults: {
                name: 'Test Administrator',
                phone: '08123456789',
                password_hash: 'password123',
                balance: 100000000
            }
        });
        console.log('Test user ready.');

        const existingInvoices = await Invoice.count({ where: { user_id: testUser.id } });
        if (existingInvoices === 0) {
            const car = seededCars[0];
            const leasing = seededLeasings[0];

            const downPayment = car.price * 0.2;
            const principal = car.price - downPayment;
            const interest = (principal * (leasing.interest_rate / 100) * (leasing.term_months / 12));
            const totalLoan = principal + interest;
            const monthly = totalLoan / leasing.term_months;

            const invoiceId = await generateInvoiceId();
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + 1);

            await Invoice.create({
                id: invoiceId,
                user_id: testUser.id,
                car_id: car.id,
                leasing_id: leasing.id,
                loan_principal: principal,
                loan_total: totalLoan,
                term_remaining: leasing.term_months,
                monthly_payment: monthly,
                next_payment_amount: monthly,
                next_payment_due: dueDate,
                missed_amount: 0,
                status: 'active'
            });
            console.log(`Invoice ${invoiceId} created.`);

            await Transaction.create({
                user_id: testUser.id,
                type: 'deposit',
                amount: 100000000,
                reference_type: 'wallet',
                reference_id: 'INITIAL_DEPOSIT',
                balance_after: 100000000
            });

            await Payment.create({
                invoice_id: invoiceId,
                amount: monthly,
                payment_type: 'installment',
                processed_at: new Date()
            });

            const inv = await Invoice.findByPk(invoiceId);
            inv.total_paid = monthly;
            inv.term_remaining -= 1;
            dueDate.setMonth(dueDate.getMonth() + 1);
            inv.next_payment_due = dueDate;
            await inv.save();

            const newBalance = 100000000 - monthly;
            await Transaction.create({
                user_id: testUser.id,
                type: 'payment',
                amount: monthly,
                reference_type: 'invoice',
                reference_id: invoiceId,
                balance_after: newBalance
            });

            console.log('Transactions and initial payment seeded.');
        } else {
            console.log('Invoices already exist, skipping sample transactions.');
        }

        console.log('--- Seeding Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('--- Seeding Failed ---');
        console.error(error);
        process.exit(1);
    }
};

seed();
