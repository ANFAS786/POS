const { initDb } = require('./database');

async function seed() {
    const db = await initDb();

    const products = [
        { name: 'Fresh Milk 1L', category: 'Dairy', barcode: '10001', uom: 'Pack', cost_price: 1.2, selling_price: 1.8, stock_quantity: 50, min_stock_level: 10 },
        { name: 'Brown Bread', category: 'Bakery', barcode: '10002', uom: 'Pcs', cost_price: 0.8, selling_price: 1.2, stock_quantity: 30, min_stock_level: 5 },
        { name: 'Red Apples', category: 'Produce', barcode: '10003', uom: 'Kg', cost_price: 2.0, selling_price: 3.5, stock_quantity: 100, min_stock_level: 20 },
        { name: 'Basmati Rice 5kg', category: 'Grains', barcode: '10004', uom: 'Bag', cost_price: 5.0, selling_price: 7.5, stock_quantity: 40, min_stock_level: 10 },
        { name: 'Coca Cola 330ml', category: 'Beverages', barcode: '10005', uom: 'Can', cost_price: 0.4, selling_price: 0.7, stock_quantity: 200, min_stock_level: 24 }
    ];

    for (const p of products) {
        try {
            await db.run(
                'INSERT OR IGNORE INTO products (name, category, barcode, uom, cost_price, selling_price, stock_quantity, min_stock_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [p.name, p.category, p.barcode, p.uom, p.cost_price, p.selling_price, p.stock_quantity, p.min_stock_level]
            );
        } catch (err) {
            console.error('Error seeding product:', p.name, err);
        }
    }

    console.log('Database seeded successfully!');
    process.exit();
}

seed();
