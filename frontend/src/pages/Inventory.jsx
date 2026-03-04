import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Package, Plus, AlertTriangle, Edit, Trash2, Search, Filter, TrendingUp, BarChart, PieChart, Activity, Layers, ArrowRight, Sun, Moon, Barcode as BarcodeIcon, Printer, Banknote, RefreshCw, XCircle, Camera, Save } from 'lucide-react';
import Barcode from 'react-barcode';
import BarcodeScanner from '../components/BarcodeScanner';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const Inventory = ({ currentSession }) => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '', category: '', barcode: '', uom: 'Pcs', cost_price: 0, selling_price: 0, stock_quantity: 0, min_stock_level: 5, bulk_add_qty: 0
    });
    const [stats, setStats] = useState({ total_bills: 0, total_revenue: 0, total_profit: 0, total_cash: 0, total_card: 0, total_online: 0, total_expenses: 0, top_item: null });
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState({ amount: '', description: '' });
    const [showCameraScanner, setShowCameraScanner] = useState(false);
    const [showCatDropdown, setShowCatDropdown] = useState(false);
    const [printQty, setPrintQty] = useState(1);

    const barcodeInputRef = useRef(null);
    const nameInputRef = useRef(null);
    const sellingPriceInputRef = useRef(null);

    useEffect(() => {
        fetchProducts();
        fetchStats();
    }, []);

    useEffect(() => {
        if (!currentSession || currentSession.status !== 'OPEN') {
            setStats({ total_bills: 0, total_revenue: 0, total_profit: 0, total_cash: 0, total_card: 0, total_online: 0, total_expenses: 0, top_item: null });
        } else {
            fetchStats();
        }
    }, [currentSession]);

    const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

    useEffect(() => {
        if (showModal && barcodeInputRef.current) {
            setTimeout(() => barcodeInputRef.current.focus(), 100);
        }
    }, [showModal]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_BASE}/products`);
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching products', err);
        }
    };

    const fetchStats = async () => {
        if (!currentSession || currentSession.status !== 'OPEN') {
            setStats({ total_bills: 0, total_revenue: 0, total_profit: 0, total_cash: 0, total_card: 0, total_online: 0, total_expenses: 0, top_item: null });
            return;
        }
        try {
            const res = await axios.get(`${API_BASE}/sessions/report/${currentSession.id}`);
            setStats(res.data || { total_bills: 0, total_revenue: 0, total_profit: 0, total_cash: 0, total_card: 0, total_online: 0, total_expenses: 0, top_item: null });
        } catch (err) { console.error(err); }
    };

    const handleAddExpense = async () => {
        if (!newExpense.amount || Number(newExpense.amount) <= 0) return alert("Please enter a valid amount");
        try {
            await axios.post(`${API_BASE}/expenses`, {
                session_id: currentSession.id,
                amount: Number(newExpense.amount),
                description: newExpense.description || 'Miscellaneous Expense'
            });
            setShowExpenseModal(false);
            setNewExpense({ amount: '', description: '' });
            fetchStats();
        } catch (err) {
            console.error(err);
            alert("Error saving expense");
        }
    };

    const handleBarcodeAction = (code) => {
        const existing = products.find(p => p.barcode === code);
        if (existing) {
            setNewProduct({
                ...existing,
                // Ensure numeric values are handled correctly
                cost_price: existing.cost_price || 0,
                selling_price: existing.selling_price || 0,
                stock_quantity: existing.stock_quantity || 0,
                min_stock_level: existing.min_stock_level || 5,
                bulk_add_qty: 0
            });
            // Focus price/stock for update
            setTimeout(() => document.getElementById('bulkAddInput')?.focus() || sellingPriceInputRef.current?.focus(), 100);
        } else {
            setNewProduct(prev => ({ ...prev, barcode: code, bulk_add_qty: 0 }));
            // Focus name for new item
            setTimeout(() => nameInputRef.current?.focus(), 100);
        }
    };

    const handleCameraScan = (code) => {
        handleBarcodeAction(code);
        setShowCameraScanner(false);
    };

    const handleAddProduct = async (e) => {
        if (e) e.preventDefault();
        try {
            const finalProduct = { ...newProduct };
            if (finalProduct.bulk_add_qty && Number(finalProduct.bulk_add_qty) !== 0) {
                finalProduct.stock_quantity = Number(finalProduct.stock_quantity || 0) + Number(finalProduct.bulk_add_qty);
            }

            if (finalProduct.id) {
                await axios.put(`${API_BASE}/products/${finalProduct.id}`, finalProduct);
            } else {
                await axios.post(`${API_BASE}/products`, finalProduct);
            }
            setShowModal(false);
            setNewProduct({ name: '', category: '', barcode: '', uom: 'Pcs', cost_price: 0, selling_price: 0, stock_quantity: 0, min_stock_level: 5, bulk_add_qty: 0 });
            fetchProducts();
        } catch (err) {
            alert('Failed to save product');
            console.error(err);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await axios.delete(`${API_BASE}/products/${id}`);
            fetchProducts();
        } catch (err) {
            alert('Failed to delete product');
        }
    };

    const generateManualQR = () => {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const prefix = newProduct.category ? newProduct.category.slice(0, 3).toUpperCase() : 'ITM';
        const newCode = `${prefix}-${timestamp}${random}`;
        setNewProduct({ ...newProduct, barcode: newCode });
    };

    const handlePrintLabel = () => {
        window.print();
    };

    // Advanced Calculations for Dashboard
    const totalInventoryValue = products.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.stock_quantity || 0)), 0);
    const lowStockCount = products.filter(p => (p.stock_quantity || 0) <= (p.min_stock_level || 5) && (p.stock_quantity || 0) > 0).length;
    const outOfStockCount = products.filter(p => (p.stock_quantity || 0) <= 0).length;

    // Category breakdown for chart
    const categoryMetrics = products.reduce((acc, p) => {
        const cat = p.category || 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});
    const categories = Object.keys(categoryMetrics).map(name => ({ name, count: categoryMetrics[name] }));
    const maxCatCount = Math.max(...categories.map(c => c.count), 1);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const isDayOpen = currentSession && currentSession.status === 'OPEN';

    return (
        <div className="inventory-dashboard-wrapper">
            {/* 1. TOP STATS GRID */}
            <div className="dashboard-stats-grid grid-cols-5">
                <div className={`metric-card-premium ${isDayOpen ? 'emerald' : 'rose'}`}>
                    <div className="card-inner-split">
                        <div className="metric-details">
                            <span className="metric-label">Shift Status</span>
                            <span className="metric-value">{isDayOpen ? 'ACTIVE' : 'CLOSED'}</span>
                        </div>
                        <div className="metric-icon-box">
                            {isDayOpen ? <Sun size={24} /> : <Moon size={24} />}
                        </div>
                    </div>
                    <div className="metric-footer">
                        <span className={`metric-trend ${isDayOpen ? 'positive' : 'negative'}`}>
                            {isDayOpen ? `Cash: Rs.${Number(currentSession.current_cash || 0).toLocaleString()}` : 'Open day to start sales'}
                        </span>
                    </div>
                </div>

                <div className="metric-card-premium blue">
                    <div className="card-inner-split">
                        <div className="metric-details">
                            <span className="metric-label">Total Unique Items</span>
                            <span className="metric-value">{products.length}</span>
                        </div>
                        <div className="metric-icon-box">
                            <Package size={24} />
                        </div>
                    </div>
                    <div className="metric-footer">
                        <span className="metric-trend positive"><TrendingUp size={12} /> Live Inventory</span>
                    </div>
                </div>

                <div className="metric-card-premium emerald font-medium">
                    <div className="card-inner-split">
                        <div className="metric-details">
                            <span className="metric-label">Inventory Value</span>
                            <span className="metric-value">Rs.{Number(totalInventoryValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="metric-icon-box">
                            <Activity size={24} />
                        </div>
                    </div>
                    <div className="metric-footer">
                        <span className="metric-trend gray text-[10px]">Total Selling Price</span>
                    </div>
                </div>

                <div className="metric-card-premium amber">
                    <div className="card-inner-split">
                        <div className="metric-details">
                            <span className="metric-label">Low Stock Items</span>
                            <span className="metric-value">{lowStockCount}</span>
                        </div>
                        <div className="metric-icon-box">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                    <div className="metric-footer">
                        <span className="metric-trend urgent">Needs Reorder</span>
                    </div>
                </div>

                <div className="metric-card-premium rose">
                    <div className="card-inner-split">
                        <div className="metric-details">
                            <span className="metric-label">Out of Stock</span>
                            <span className="metric-value">{outOfStockCount}</span>
                        </div>
                        <div className="metric-icon-box">
                            <Layers size={24} />
                        </div>
                    </div>
                    <div className="metric-footer">
                        <span className="metric-trend negative">Critical Attention</span>
                    </div>
                </div>
            </div>

            {/* 2. ANALYTICS & QUICK ACTIONS */}
            <div className="dashboard-split-section">
                {/* Today's Summary (Relocated from POS) */}
                <div className="summary-panel">
                    <div className="summary-header-main">
                        <div className="summary-title-main">
                            <div className="summary-icon-triple">
                                <div className="icon-bar bar-red"></div>
                                <div className="icon-bar bar-yellow"></div>
                                <div className="icon-bar bar-green"></div>
                            </div>
                            Today's Summary {currentSession && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 ml-2">ID: #{currentSession.id}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="btn-refresh-clean" onClick={fetchStats}>
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>
                    </div>

                    <div className="summary-grid-split">
                        {/* LEFT SIDE: Sales, Bills, Payment Modes */}
                        <div className="summary-left-side">
                            <div className="summary-stat-row">
                                <div className="stat-box-precision teal">
                                    <div className="stat-label-head">Total Sales</div>
                                    <div className="stat-val-precision">Rs.{(stats.total_revenue || 0).toLocaleString()}</div>
                                </div>
                                <div className="stat-box-precision gray">
                                    <div className="stat-label-head">Bills</div>
                                    <div className="stat-val-precision">{stats.total_bills || 0}</div>
                                </div>
                            </div>

                            <div className="payment-modes-section">
                                <div className="section-label">
                                    <span style={{ color: '#fbbf24' }}>●</span> Payment Mode <span style={{ color: '#fbbf24' }}>●</span>
                                </div>
                                <div className="payment-row-precision">
                                    <div className="label-pill cash">Cash</div>
                                    <div className="bar-bg-wide">
                                        <div className="bar-fill-precision green" style={{ width: `${(stats.total_cash / (stats.total_revenue || 1)) * 100}%` }}></div>
                                    </div>
                                    <div className="p-val-precision">Rs.{(stats.total_cash || 0).toLocaleString()}</div>
                                </div>
                                <div className="payment-row-precision">
                                    <div className="label-pill card">Card</div>
                                    <div className="bar-bg-wide">
                                        <div className="bar-fill-precision blue" style={{ width: `${(stats.total_card / (stats.total_revenue || 1)) * 100}%` }}></div>
                                    </div>
                                    <div className="p-val-precision">Rs.{(stats.total_card || 0).toLocaleString()}</div>
                                </div>
                                <div className="payment-row-precision">
                                    <div className="label-pill online">Online</div>
                                    <div className="bar-bg-wide">
                                        <div className="bar-fill-precision orange" style={{ width: `${(stats.total_online / (stats.total_revenue || 1)) * 100}%` }}></div>
                                    </div>
                                    <div className="p-val-precision">Rs.{(stats.total_online || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Profit, Top Item */}
                        <div className="summary-right-side">
                            <div className="summary-stat-row">
                                <div className="stat-box-precision gold">
                                    <div className="stat-label-head">Profit</div>
                                    <div className="stat-val-precision">Rs.{(stats.total_profit || 0).toLocaleString()}</div>
                                </div>
                                <div className="stat-box-precision bg-rose-50 border-rose-100">
                                    <div className="stat-label-head text-rose-600">Expenses</div>
                                    <div className="stat-val-precision text-rose-700">Rs.{(stats.total_expenses || 0).toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="top-item-section">
                                <div className="section-label" style={{ justifyContent: 'center' }}>
                                    <div className="label-pill top">Top Item</div>
                                </div>
                                {stats.top_item ? (
                                    <div className="top-item-block-precision">
                                        <div className="top-item-img-large flex items-center justify-center text-3xl">
                                            {stats.top_item.category === 'Drinks' ? '🥤' :
                                                stats.top_item.category === 'Milk' ? '🥛' :
                                                    stats.top_item.category === 'Rice & Oil' ? '🍚' :
                                                        stats.top_item.category === 'Snacks' ? '🍪' :
                                                            stats.top_item.category === 'Pulses' ? '🫘' :
                                                                stats.top_item.category === 'Masala' ? '🌶️' : '📦'}
                                        </div>
                                        <div className="top-item-info-big">
                                            <div className="top-item-name-big">{stats.top_item.name}</div>
                                            <div className="top-item-qty-big">{stats.top_item.total_qty} pcs</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 font-bold py-4">No sales today</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="quick-actions-panel">
                    <div className="panel-header-simple">
                        <h3 className="section-title-dash">Inventory Management</h3>
                    </div>
                    <div className="actions-stack">
                        <button onClick={() => {
                            setNewProduct({ name: '', category: '', barcode: '', uom: 'Pcs', cost_price: 0, selling_price: 0, stock_quantity: 0, min_stock_level: 5 });
                            setShowModal(true);
                        }} className="action-btn-premium add">
                            <Plus size={20} strokeWidth={3} /> ADD NEW PRODUCT
                        </button>
                        <button className="action-btn-premium report">
                            <PieChart size={20} strokeWidth={3} /> GENERATE PROCUREMENT REPORT
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. PRODUCT TABLE SECTION */}
            <div className="inventory-table-container">
                <div className="table-header-dash">
                    <div className="search-wrap-premium">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Quick search products, categories, or barcodes..."
                            className="search-input-premium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="btn-filter-premium">
                            <Filter size={16} /> Filter
                        </button>
                    </div>
                </div>

                <div className="premium-scroll-box">
                    <table className="inventory-grid-premium">
                        <thead>
                            <tr>
                                <th>Product Details</th>
                                <th>Category</th>
                                <th className="text-right">Stock Level</th>
                                <th className="text-right">Selling Price</th>
                                <th className="text-center">Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(p => (
                                <tr key={p.id} className={p.stock_quantity <= 0 ? 'out-of-stock-row' : ''}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="product-icon-initials">
                                                {p.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="p-name-main">{p.name}</div>
                                                <div className="p-meta-sub">
                                                    <span className="barcode-badge">{p.barcode || 'NO BARCODE'}</span>
                                                    <span className="dot-sep">•</span>
                                                    <span>{p.uom}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="category-pill-premium">{p.category}</span>
                                    </td>
                                    <td className="text-right">
                                        <div className={`stock-val-premium ${p.stock_quantity <= p.min_stock_level ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {p.stock_quantity}
                                        </div>
                                        <div className="text-[9px] font-black text-slate-400 tracking-tighter uppercase">Min: {p.min_stock_level}</div>
                                    </td>
                                    <td className="text-right">
                                        <span className="price-tag-dash">Rs.{(p.selling_price || 0).toFixed(2)}</span>
                                    </td>
                                    <td className="text-center">
                                        {p.stock_quantity <= 0 ? (
                                            <span className="status-badge critical">Out of Stock</span>
                                        ) : p.stock_quantity <= p.min_stock_level ? (
                                            <span className="status-badge warning">Low Stock</span>
                                        ) : (
                                            <span className="status-badge healthy">Healthy</span>
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <div className="inventory-actions-wrapper">
                                            <button
                                                className="inventory-action-btn edit"
                                                title="Edit Product"
                                                onClick={() => {
                                                    setNewProduct({
                                                        ...p,
                                                        cost_price: p.cost_price || 0,
                                                        selling_price: p.selling_price || 0,
                                                        stock_quantity: p.stock_quantity || 0,
                                                        min_stock_level: p.min_stock_level || 5,
                                                        bulk_add_qty: 0
                                                    });
                                                    setShowModal(true);
                                                }}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="inventory-action-btn delete"
                                                title="Delete Product"
                                                onClick={() => handleDeleteProduct(p.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content-premium">
                        <div className="modal-accent-line"></div>
                        <div className="modal-header-section">
                            <h2 className="modal-title-main">Inventory Entry</h2>
                            <p className="modal-subtitle">Scan barcode or generate a manual QR for labeling items.</p>
                        </div>

                        <form onSubmit={handleAddProduct}>
                            <div className="form-grid-pos">
                                <div className="col-span-7 form-group-stack border-r border-slate-100 pr-10">
                                    {/* Section 1: Basic Info */}
                                    <div className="form-group-stack">
                                        <div>
                                            <label className="label-mini-bold">Product Name</label>
                                            <input
                                                ref={nameInputRef}
                                                required
                                                className="input-field-premium"
                                                placeholder="Enter product name..."
                                                value={newProduct.name}
                                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-row-2-col">
                                            <div className="relative">
                                                <label className="label-mini-bold">Category</label>
                                                <input
                                                    className="input-field-premium"
                                                    placeholder="Search or type..."
                                                    value={newProduct.category}
                                                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                                    onFocus={() => setShowCatDropdown(true)}
                                                    onBlur={() => setTimeout(() => setShowCatDropdown(false), 200)}
                                                />
                                                {showCatDropdown && (
                                                    <div className="custom-cat-dropdown animate-fade-in">
                                                        {allCategories
                                                            .filter(cat => cat.toLowerCase().includes(newProduct.category.toLowerCase()))
                                                            .map(cat => (
                                                                <div
                                                                    key={cat}
                                                                    className="cat-option"
                                                                    onMouseDown={() => {
                                                                        setNewProduct({ ...newProduct, category: cat });
                                                                        setShowCatDropdown(false);
                                                                    }}
                                                                >
                                                                    {cat}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="label-mini-bold">Unit of Measure</label>
                                                <select
                                                    className="input-field-premium"
                                                    value={newProduct.uom}
                                                    onChange={e => setNewProduct({ ...newProduct, uom: e.target.value })}
                                                >
                                                    <option>Pcs</option><option>Kg</option><option>Pack</option><option>Bag</option><option>Can</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Stock Tracking */}
                                    <div className="form-group-stack">
                                        <label className="label-mini-bold">Product Barcode</label>
                                        <div className="flex gap-2">
                                            <div className="input-with-icon-left flex-1" style={{ maxWidth: '300px' }}>
                                                <input
                                                    ref={barcodeInputRef}
                                                    className="input-field-premium with-icon font-mono"
                                                    placeholder="Scan or type barcode..."
                                                    value={newProduct.barcode}
                                                    onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleBarcodeAction(newProduct.barcode);
                                                        }
                                                    }}
                                                />
                                                <Package size={18} className="input-icon-left" />
                                            </div>
                                            <button type="button" onClick={() => setShowCameraScanner(true)} className="btn-util-blue w-12 h-12" title="Scan with Camera">
                                                <Camera size={20} />
                                            </button>
                                            <button type="button" onClick={generateManualQR} className="btn-util-blue px-6" title="Generate Barcode">
                                                <BarcodeIcon size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Section 3: Financials & Levels */}
                                    <div className="form-row-2-col">
                                        <div>
                                            <label className="label-mini-bold">Cost Price (Rs.)</label>
                                            <input
                                                type="number"
                                                className="input-field-premium"
                                                value={newProduct.cost_price}
                                                onChange={e => setNewProduct({ ...newProduct, cost_price: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="label-mini-bold">Selling Price (Rs.)</label>
                                            <input
                                                ref={sellingPriceInputRef}
                                                required
                                                type="number"
                                                className="input-field-premium text-primary"
                                                value={newProduct.selling_price}
                                                onChange={e => setNewProduct({ ...newProduct, selling_price: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row-2-col">
                                        <div className="flex gap-2">
                                            {newProduct.id ? (
                                                <>
                                                    <div className="flex-1">
                                                        <label className="label-mini-bold">Current Stock</label>
                                                        <div className="input-field-premium bg-slate-50 text-slate-400 font-bold">{newProduct.stock_quantity}</div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="label-mini-bold text-blue-600">Stock In (+)</label>
                                                        <input
                                                            type="number"
                                                            className="input-field-premium bg-blue-50 border-blue-200"
                                                            placeholder="+0"
                                                            value={newProduct.bulk_add_qty || ''}
                                                            onChange={e => setNewProduct({ ...newProduct, bulk_add_qty: e.target.value ? Number(e.target.value) : '' })}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex-1">
                                                    <label className="label-mini-bold">Initial Stock</label>
                                                    <input
                                                        type="number"
                                                        className="input-field-premium"
                                                        value={newProduct.stock_quantity || ''}
                                                        onChange={e => setNewProduct({ ...newProduct, stock_quantity: e.target.value ? Number(e.target.value) : '' })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label-mini-bold">Min Alert Qty</label>
                                            <input
                                                type="number"
                                                className="input-field-premium"
                                                value={newProduct.min_stock_level}
                                                onChange={e => setNewProduct({ ...newProduct, min_stock_level: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-5 flex flex-col gap-8 justify-center items-center h-full">
                                    <div className="qr-preview-card w-full">
                                        <div className="barcode-preview-holder py-4">
                                            {newProduct.barcode ? (
                                                <Barcode
                                                    value={newProduct.barcode}
                                                    width={1.5}
                                                    height={80}
                                                    fontSize={12}
                                                    background="transparent"
                                                />
                                            ) : (
                                                <div className="qr-placeholder-scan">
                                                    <BarcodeIcon size={64} strokeWidth={1} />
                                                    <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-300">Ready for scan</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <div className="font-black text-xs uppercase text-navy-900 tracking-widest">{newProduct.name || 'ITEM PREVIEW'}</div>
                                            <div className="font-mono text-xs font-bold text-blue-600 mt-2">{newProduct.barcode || '---'}</div>
                                        </div>
                                    </div>

                                    <div className="form-grid-pos" style={{ gap: '1.5rem', marginTop: '1.5rem' }}>
                                        <div className="col-span-4">
                                            <div className="form-group-stack">
                                                <label className="label-mini-bold">Print Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="20"
                                                    className="input-field-premium text-center"
                                                    value={printQty}
                                                    onChange={e => setPrintQty(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-8 flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => window.print()}
                                                className="btn-premium-action btn-primary-blue w-full h-14"
                                                style={{ fontSize: '1rem' }}
                                                disabled={!newProduct.barcode}
                                            >
                                                <Printer size={20} /> PRINT LABELS
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer-premium">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-premium-action btn-secondary-white">Cancel</button>
                                <button type="submit" className="btn-premium-action btn-primary-blue">
                                    {newProduct.id ? 'UPDATE PRODUCT' : 'SAVE PRODUCT'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {createPortal(
                <div className="print-only-portal" id="label-print-portal">
                    <div className="barcode-a4-grid">
                        {Array.from({ length: Math.max(1, Number(printQty) || 1) }).map((_, idx) => (
                            <div key={idx} className="label-content-a4">
                                <div className="label-header-a4">
                                    <h1 className="label-brand-a4">PRECISION POS</h1>
                                    <p className="label-pname-a4">{newProduct.name || 'Item Name'}</p>
                                </div>
                                <div className="label-body-a4">
                                    <Barcode
                                        value={newProduct.barcode || '000000000000'}
                                        width={1.2}
                                        height={50}
                                        fontSize={12}
                                        margin={0}
                                    />
                                    <div className="label-price-a4">
                                        Rs.{(Number(newProduct.selling_price) || 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>,
                document.body
            )}
            {showExpenseModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-pop-in" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">Record Daily Expense</h3>
                            <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-red-500"><XCircle size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-tighter">Enter amount and description for the expense</p>
                            <div className="input-group-precision mb-4">
                                <label>Amount (Rs.)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={newExpense.amount}
                                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="input-group-precision">
                                <label>Description / Reason</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Electricity, Snacks, Cleaning..."
                                    value={newExpense.description}
                                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                            <button className="btn-save" onClick={handleAddExpense}>Save Expense</button>
                        </div>
                    </div>
                </div>
            )}

            {showCameraScanner && (
                <BarcodeScanner
                    onScan={handleCameraScan}
                    onClose={() => setShowCameraScanner(false)}
                />
            )}
        </div>
    );
};

export default Inventory;
