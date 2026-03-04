const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
    const db = await open({
        filename: path.join(__dirname, 'pos.db'),
        driver: sqlite3.Database
    });

    console.log('--- Table: sales ---');
    const cols = await db.all("PRAGMA table_info(sales)");
    console.log(JSON.stringify(cols, null, 2));

    console.log('\n--- Recent Sales ---');
    const sales = await db.all("SELECT id, total_amount, session_id FROM sales ORDER BY id DESC LIMIT 10");
    sales.forEach(s => console.log(`Sale ID: ${s.id}, Amount: ${s.total_amount}, SessionID: ${s.session_id}`));

    console.log('\n--- Open Sessions ---');
    const sessions = await db.all("SELECT id, status FROM day_sessions WHERE status = 'OPEN'");
    sessions.forEach(s => console.log(`Session ID: ${s.id}, Status: ${s.status}`));
}

check();
