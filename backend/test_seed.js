const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function seedTestData() {
    const db = await open({
        filename: path.join(__dirname, 'pos.db'),
        driver: sqlite3.Database
    });

    const today = new Date().toISOString();

    console.log('Inserting test sales...');

    // 1. Sale with Card
    await db.run(`
        INSERT INTO sales (total_amount, discount, cash_paid, card_paid, online_paid, payment_method, date) 
        VALUES (8500, 0, 0, 8500, 0, 'Card', ?)
    `, [today]);
    const sale1Id = (await db.get('SELECT last_insert_rowid() as id')).id;

    // 2. Sale with Online
    await db.run(`
        INSERT INTO sales (total_amount, discount, cash_paid, card_paid, online_paid, payment_method, date) 
        VALUES (1730, 0, 0, 0, 1730, 'Online', ?)
    `, [today]);
    const sale2Id = (await db.get('SELECT last_insert_rowid() as id')).id;

    // 3. Sale with Cash
    await db.run(`
        INSERT INTO sales (total_amount, discount, cash_paid, card_paid, online_paid, payment_method, date) 
        VALUES (15200, 0, 15200, 0, 0, 'Cash', ?)
    `, [today]);
    const sale3Id = (await db.get('SELECT last_insert_rowid() as id')).id;

    // Link items to Fortune Rice (assuming ID 1 or name 'Fortune Rice')
    const fortuneRice = await db.get("SELECT id FROM products WHERE name LIKE '%Fortune Rice%'");
    if (fortuneRice) {
        await db.run(`INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, 25, 400, 10000)`, [sale3Id, fortuneRice.id]);
    }

    console.log('Seed successful! Refresh your POS summary.');
    await db.close();
}

seedTestData().catch(console.error);
