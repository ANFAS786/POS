const { initDb } = require('./database');

async function migrate() {
    console.log('Running migrations...');
    await initDb();
    console.log('Migrations complete.');
    process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
