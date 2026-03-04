require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve Static Files from Frontend Build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

let db;

// Initialize Database and Start Server
initDb().then(database => {
    db = database;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
});

// --- API ROUTES ---

// 1. Products Routes
app.get('/api/products', async (req, res) => {
    try {
        const products = await db.all('SELECT * FROM products');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { name, category, barcode, uom, cost_price, selling_price, stock_quantity, min_stock_level } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO products (name, category, barcode, uom, cost_price, selling_price, stock_quantity, min_stock_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, category, barcode, uom, cost_price, selling_price, stock_quantity, min_stock_level]
        );
        res.json({ id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { name, category, barcode, uom, cost_price, selling_price, stock_quantity, min_stock_level } = req.body;
    const { id } = req.params;
    try {
        await db.run(
            `UPDATE products SET 
                name = ?, category = ?, barcode = ?, uom = ?, 
                cost_price = ?, selling_price = ?, stock_quantity = ?, min_stock_level = ?
             WHERE id = ?`,
            [name, category, barcode, uom, cost_price, selling_price, stock_quantity, min_stock_level, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Sales Routes (POS Module)
app.post('/api/sales', async (req, res) => {
    const { items, total_amount, discount, cash_paid, card_paid, online_paid, credit_paid, payment_method, session_id } = req.body;

    try {
        await db.run('BEGIN TRANSACTION');

        const saleResult = await db.run(
            'INSERT INTO sales (total_amount, discount, cash_paid, card_paid, online_paid, credit_paid, payment_method, customer_id, session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [total_amount, discount, cash_paid || 0, card_paid || 0, online_paid || 0, credit_paid || 0, payment_method, req.body.customer_id || null, session_id || null]
        );
        const saleId = saleResult.lastID;

        for (const item of items) {
            // Check stock before processing
            const product = await db.get('SELECT stock_quantity, name FROM products WHERE id = ?', [item.product_id]);
            if (!product || product.stock_quantity < item.quantity) {
                throw new Error(`Insufficient stock for ${product ? product.name : 'Unknown Product'}`);
            }

            await db.run(
                'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
                [saleId, item.product_id, item.quantity, item.unit_price, item.subtotal]
            );

            await db.run(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        await db.run('COMMIT');
        res.json({ success: true, saleId });
    } catch (err) {
        if (db) await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// 4. Reports Routes
app.get('/api/reports/daily', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Summary Stats
        const stats = await db.get(`
            SELECT 
                COUNT(id) as total_bills,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(discount), 0) as total_discounts,
                COALESCE(SUM(cash_paid), 0) as total_cash,
                COALESCE(SUM(card_paid), 0) as total_card,
                COALESCE(SUM(online_paid), 0) as total_online,
                COALESCE(SUM(credit_paid), 0) as total_credit
            FROM sales 
            WHERE date LIKE ?`, [`${today}%`]);

        // Profit Calculation (Revenue - Cost of Sold Items)
        const profit = await db.get(`
            SELECT COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) as total_profit
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE s.date LIKE ?`, [`${today}%`]);

        // Top Selling Item
        const topItem = await db.get(`
            SELECT p.name, p.category, SUM(si.quantity) as total_qty
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE s.date LIKE ?
            GROUP BY p.id
            ORDER BY total_qty DESC
            LIMIT 1`, [`${today}%`]);

        res.json({
            ...(stats || { total_bills: 0, total_revenue: 0, total_discounts: 0, total_cash: 0, total_card: 0, total_online: 0 }),
            total_profit: profit ? profit.total_profit : 0,
            top_item: topItem || null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Purchase Routes
app.get('/api/purchases', async (req, res) => {
    try {
        const purchases = await db.all('SELECT * FROM purchases ORDER BY date DESC');
        res.json(purchases);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/purchases/:id', async (req, res) => {
    try {
        const items = await db.all(`
            SELECT pi.*, p.name 
            FROM purchase_items pi
            JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = ?
        `, [req.params.id]);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/purchases', async (req, res) => {
    const { supplier_name, invoice_number, items, total_amount } = req.body;

    try {
        await db.run('BEGIN TRANSACTION');

        const purchaseResult = await db.run(
            'INSERT INTO purchases (supplier_name, invoice_number, total_amount) VALUES (?, ?, ?)',
            [supplier_name, invoice_number, total_amount]
        );
        const purchaseId = purchaseResult.lastID;

        for (const item of items) {
            await db.run(
                'INSERT INTO purchase_items (purchase_id, product_id, quantity, cost_price, subtotal) VALUES (?, ?, ?, ?, ?)',
                [purchaseId, item.product_id, item.quantity, item.cost_price, item.subtotal]
            );

            // Calculate Weighted Average Cost
            const product = await db.get('SELECT stock_quantity, cost_price FROM products WHERE id = ?', [item.product_id]);
            const currentStock = Number(product?.stock_quantity || 0);
            const currentCost = Number(product?.cost_price || 0);

            let newAverageCost = item.cost_price; // Default if new or negative stock
            const newTotalStock = currentStock + item.quantity;

            if (currentStock > 0 && newTotalStock > 0) {
                const totalCurrentValue = currentStock * currentCost;
                const totalNewValue = item.quantity * item.cost_price;
                newAverageCost = (totalCurrentValue + totalNewValue) / newTotalStock;
            }

            // Increase Stock and Sync Cost Price
            await db.run(
                'UPDATE products SET stock_quantity = ?, cost_price = ? WHERE id = ?',
                [newTotalStock, newAverageCost.toFixed(2), item.product_id]
            );

            // Add to Batch (for grocery tracking)
            if (item.expiry_date) {
                await db.run(
                    'INSERT INTO batches (product_id, quantity, expiry_date) VALUES (?, ?, ?)',
                    [item.product_id, item.quantity, item.expiry_date]
                );
            }
        }

        await db.run('COMMIT');
        res.json({ success: true, purchaseId });
    } catch (err) {
        if (db) await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// 6. Day Sessions Routes
app.get('/api/sessions/status', async (req, res) => {
    try {
        const session = await db.get('SELECT * FROM day_sessions WHERE status = "OPEN" ORDER BY id DESC LIMIT 1');
        if (session) {
            const stats = await db.get('SELECT COALESCE(SUM(cash_paid), 0) as total_cash FROM sales WHERE session_id = ?', [session.id]);
            const expenses = await db.get('SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE session_id = ?', [session.id]);
            session.current_cash = Number(session.opening_amount) + Number(stats.total_cash) - Number(expenses.total_expenses);
            session.total_expenses = Number(expenses.total_expenses);
        }
        res.json(session || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sessions/open', async (req, res) => {
    const { opening_amount } = req.body;
    try {
        const existing = await db.get('SELECT id FROM day_sessions WHERE status = "OPEN"');
        if (existing) return res.status(400).json({ error: 'A session is already open' });

        const result = await db.run(
            'INSERT INTO day_sessions (opening_amount, status) VALUES (?, "OPEN")',
            [opening_amount]
        );
        res.json({ id: result.lastID, status: 'OPEN' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sessions/close', async (req, res) => {
    try {
        const session = await db.get('SELECT * FROM day_sessions WHERE status = "OPEN" ORDER BY id DESC LIMIT 1');
        if (!session) return res.status(400).json({ error: 'No open session found' });

        // Calculate expected closing amount (Opening + Total Sales)
        const stats = await db.get('SELECT COALESCE(SUM(total_amount), 0) as total_sales FROM sales WHERE session_id = ?', [session.id]);
        const closing_amount_expected = Number(session.opening_amount) + Number(stats.total_sales);

        await db.run(
            'UPDATE day_sessions SET status = "CLOSED", closing_time = CURRENT_TIMESTAMP, closing_amount_expected = ? WHERE id = ?',
            [closing_amount_expected, session.id]
        );

        res.json({ success: true, sessionId: session.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sessions/report/:id', async (req, res) => {
    const sessionId = Number(req.params.id);
    try {
        const session = await db.get('SELECT * FROM day_sessions WHERE id = ?', [sessionId]);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const stats = await db.get(`
            SELECT 
                COUNT(id) as total_bills,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(discount), 0) as total_discounts,
                COALESCE(SUM(cash_paid), 0) as total_cash,
                COALESCE(SUM(card_paid), 0) as total_card,
                COALESCE(SUM(online_paid), 0) as total_online,
                COALESCE(SUM(credit_paid), 0) as total_credit
            FROM sales 
            WHERE session_id = ?`, [sessionId]);

        const expenses = await db.get('SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE session_id = ?', [sessionId]);

        const profit = await db.get(`
            SELECT COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) as total_profit
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE s.session_id = ?`, [sessionId]);

        const topItem = await db.get(`
            SELECT p.name, p.category, SUM(si.quantity) as total_qty
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE s.session_id = ?
            GROUP BY p.id
            ORDER BY total_qty DESC
            LIMIT 1`, [sessionId]);

        res.json({
            ...session,
            ...stats,
            total_expenses: expenses ? expenses.total_expenses : 0,
            total_profit: profit ? profit.total_profit : 0,
            top_item: topItem || null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Customer Routes
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await db.all('SELECT * FROM customers ORDER BY name ASC');
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/customers', async (req, res) => {
    const { name, phone, email, address } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
            [name, phone, email, address]
        );
        res.json({ id: result.lastID, name, phone });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Expenses Routes
app.post('/api/expenses', async (req, res) => {
    const { session_id, amount, description } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO expenses (session_id, amount, description) VALUES (?, ?, ?)',
            [session_id, amount, description]
        );
        res.json({ id: result.lastID, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/expenses/session/:id', async (req, res) => {
    try {
        const expenses = await db.all('SELECT * FROM expenses WHERE session_id = ? ORDER BY date DESC', [req.params.id]);
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. System Settings Routes
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await db.get('SELECT * FROM settings WHERE id = 1');
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', async (req, res) => {
    const { shop_name, shop_logo, shop_address, shop_phone } = req.body;
    try {
        await db.run(
            `UPDATE settings SET 
             shop_name = ?, 
             shop_logo = ?, 
             shop_address = ?, 
             shop_phone = ? 
             WHERE id = 1`,
            [shop_name, shop_logo, shop_address, shop_phone]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Catch-all route to serve the frontend (for Client-Side Routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});
