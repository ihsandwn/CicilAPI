import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from './src/config/database.js';

export const migrator = new Umzug({
    migrations: {
        glob: ['src/migrations/*.js', { cwd: process.cwd() }],
        resolve: ({ name, path, context }) => {
            return {
                name,
                up: async () => {
                    const migration = await import(`file://${path}`);
                    return migration.up({ context: sequelize.getQueryInterface(), Sequelize: sequelize.Sequelize });
                },
                down: async () => {
                    const migration = await import(`file://${path}`);
                    return migration.down({ context: sequelize.getQueryInterface(), Sequelize: sequelize.Sequelize });
                },
            };
        },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
});

if (process.argv.includes('up')) {
    migrator.up().then(() => {
        console.log('Migrations up successful');
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
} else if (process.argv.includes('down')) {
    migrator.down().then(() => {
        console.log('Migrations down successful');
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
