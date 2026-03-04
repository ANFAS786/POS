import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Search, Plus, Minus, Trash2,
    ShoppingCart, DollarSign, CreditCard, PieChart,
    LayoutGrid, RefreshCw, Printer, XCircle, Tag, Globe, BarChart3, CheckCircle2,
    Calendar, Package, Calculator, Info, FileText, ChevronRight,
    Maximize, Minimize, Sun, AlertTriangle, Banknote, Save, Camera
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const PrecisionPOS = ({ currentSession, onSaleSuccess }) => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(0);
    const [amountReceived, setAmountReceived] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitAmounts, setSplitAmounts] = useState({ cash: '', card: '', online: '', credit: '' });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastSaleData, setLastSaleData] = useState(null);
    const [heldBills, setHeldBills] = useState([]);
    const [showHeldModal, setShowHeldModal] = useState(false);
    const [showDayReport, setShowDayReport] = useState(false);
    const [dayReportData, setDayReportData] = useState(null);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [showCameraScanner, setShowCameraScanner] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState({ amount: '', description: '' });
    const [activeCategory, setActiveCategory] = useState('All');
    const [mobileView, setMobileView] = useState('products'); // 'products' or 'cart'

    const formatPrice = (amount) => {
        return Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };


    const searchInputRef = useRef(null);

    useEffect(() => {
        if (currentSession?.triggerReport) {
            handlePrintDayReport(currentSession.id);
        }
    }, [currentSession]);

    const handlePrintDayReport = async (sessionId) => {
        try {
            const numericSessionId = Number(sessionId); // Ensure sessionId is a number
            const res = await axios.get(`${API_BASE}/api/sessions/report/${numericSessionId}`);
            setDayReportData(res.data);
            setShowDayReport(true);
            setTimeout(() => {
                window.print();
                setShowDayReport(false);
            }, 500);
        } catch (err) { console.error(err); }
    };

    const grossTotal = cart.reduce((sum, i) => sum + (Number(i.quantity) * i.unit_price), 0);
    const itemDiscounts = cart.reduce((sum, i) => sum + (Number(i.discount) || 0), 0);
    const totalItems = cart.reduce((sum, i) => sum + Number(i.quantity), 0);
    const finalTotal = Math.max(0, grossTotal - itemDiscounts - (Number(discount) || 0) + tax);
    const balance = Number(amountReceived) > 0 ? Number(amountReceived) - finalTotal : 0;

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        if (searchInputRef.current) searchInputRef.current.focus();
    }, []);

    // Auto-focus search input when modals are closed
    useEffect(() => {
        if (!showSuccessModal && !showHeldModal && !showAddCustomer && !showSplitModal && !showDayReport && !showWarningModal && !showCameraScanner && !showExpenseModal) {
            if (searchInputRef.current) searchInputRef.current.focus();
        }
    }, [showSuccessModal, showHeldModal, showAddCustomer, showSplitModal, showDayReport, showWarningModal, showCameraScanner, showExpenseModal]);

    const handleAddExpense = async () => {
        if (!newExpense.amount || Number(newExpense.amount) <= 0) return alert("Please enter a valid amount");
        try {
            await axios.post(`${API_BASE}/api/expenses`, {
                session_id: currentSession.id,
                amount: Number(newExpense.amount),
                description: newExpense.description || 'Miscellaneous Expense'
            });
            setShowExpenseModal(false);
            setNewExpense({ amount: '', description: '' });
            alert("Expense recorded successfully!");
        } catch (err) {
            console.error(err);
            alert("Error saving expense");
        }
    };

    useEffect(() => {
        // Hotkey listeners
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                if (!currentSession || currentSession.status !== 'OPEN') {
                    alert("Please OPEN DAY from navbar first!");
                    setSearchTerm('');
                    e.preventDefault(); // Prevent form submission or other default behavior
                    return;
                }
                // If Enter is pressed and currentSession exists, allow default behavior (e.g., search)
                // Or, if you want to trigger an action on Enter for search, add it here.
            }
            if (e.key === 'F1') { e.preventDefault(); setPaymentMethod('Cash'); }
            if (e.key === 'F2') { e.preventDefault(); setPaymentMethod('Card'); }
            if (e.key === 'F3') { e.preventDefault(); setPaymentMethod('Online'); }
            if (e.key === 'F4') { e.preventDefault(); setShowSplitModal(true); }
            if (e.key === 'F5') { e.preventDefault(); setPaymentMethod('Credit'); }
            if (e.key === 'F6') { e.preventDefault(); handleHoldBill(); }
            if (e.key === 'F8') { e.preventDefault(); handleCheckout(paymentMethod); }
            if (e.key === 'Escape') { e.preventDefault(); setShowSuccessModal(false); setShowHeldModal(false); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [paymentMethod, cart, finalTotal, discount, tax]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/products`);
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (err) { console.error(err); }
    };



    const fetchCustomers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/customers`);
            setCustomers(Array.isArray(res.data) ? res.data : []);
        } catch (err) { console.error(err); }
    };

    const handleCameraScan = (code) => {
        setSearchTerm(code);
        setShowCameraScanner(false);
        // Find product with this barcode
        const product = products.find(p => p.barcode === code);
        if (product) {
            addToCart(product);
            setSearchTerm(''); // Clear after adding
        } else {
            alert(`Product with barcode ${code} not found`);
        }
    };

    const handleAddCustomer = async () => {
        if (!newCustomer.name || !newCustomer.phone) {
            alert("Name and Phone are required");
            return;
        }
        try {
            const res = await axios.post(`${API_BASE}/api/customers`, newCustomer);
            setCustomers([...customers, res.data]);
            setSelectedCustomer(res.data);
            setShowAddCustomer(false);
            setNewCustomer({ name: '', phone: '', email: '', address: '' });
        } catch (err) {
            alert("Customer already exists or error saving");
            console.error(err);
        }
    };



    const addToCart = (product) => {
        if (!currentSession || currentSession.status !== 'OPEN') return alert("Please OPEN DAY from navbar first!");

        const existing = cart.find(item => item.product_id === product.id);
        const currentQtyInCart = existing ? existing.quantity : 0;

        if (product.stock_quantity <= 0) {
            alert(`"${product.name}" is OUT OF STOCK!`);
            return;
        }

        if (currentQtyInCart + 1 > product.stock_quantity) {
            alert(`Insufficient stock for "${product.name}"! Only ${product.stock_quantity} available.`);
            return;
        }

        if (existing) {
            setCart(cart.map(item =>
                item.product_id === product.id ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price } : item
            ));
        } else {
            setCart([...cart, {
                product_id: product.id,
                name: product.name,
                unit_price: product.selling_price,
                quantity: 1,
                discount: 0,
                subtotal: product.selling_price,
            }]);
        }
        setSearchTerm('');
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    const updateQuantity = (id, delta) => {
        const product = products.find(p => p.id === id);
        setCart(cart.map(item => {
            if (item.product_id === id) {
                const newQty = item.quantity + delta;
                if (newQty < 1) return item;
                if (product && newQty > product.stock_quantity) {
                    alert(`Insufficient stock! Only ${product.stock_quantity} available.`);
                    return item;
                }
                return { ...item, quantity: newQty, subtotal: (newQty * item.unit_price) - (item.discount || 0) };
            }
            return item;
        }));
    };

    const setQuantity = (id, val) => {
        const product = products.find(p => p.id === id);
        setCart(cart.map(item => {
            if (item.product_id === id) {
                if (val === '') return { ...item, quantity: '', subtotal: 0 };
                const requestedQty = Math.max(0, Number(val));
                if (product && requestedQty > product.stock_quantity) {
                    alert(`Insufficient stock! Only ${product.stock_quantity} available.`);
                    return item;
                }
                return { ...item, quantity: requestedQty, subtotal: (requestedQty * item.unit_price) - (item.discount || 0) };
            }
            return item;
        }));
    };

    const updateItemDiscount = (id, amount) => {
        setCart(cart.map(item => {
            if (item.product_id === id) {
                const val = amount;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    return { ...item, discount: val, subtotal: (item.quantity * item.unit_price) - (val === '' ? 0 : Number(val)) };
                }
            }
            return item;
        }));
    };

    const removeFromCart = (id) => setCart(cart.filter(i => i.product_id !== id));

    const handleCheckout = async (method, splitData = null) => {
        if (cart.length === 0) return;

        if (paymentMethod === 'Cash' && (!amountReceived || Number(amountReceived) <= 0)) {
            setWarningMessage("Please enter the Amount Received! (Cash Mode)");
            setShowWarningModal(true);
            return;
        }
        try {
            const response = await axios.post(`${API_BASE}/api/sales`, {
                items: cart,
                total_amount: finalTotal,
                discount,
                tax,
                cash_paid: paymentMethod === 'Cash' ? finalTotal : (paymentMethod === 'Split' ? Number(splitAmounts.cash || 0) : 0),
                card_paid: paymentMethod === 'Card' ? finalTotal : (paymentMethod === 'Split' ? Number(splitAmounts.card || 0) : 0),
                online_paid: paymentMethod === 'Online' ? finalTotal : (paymentMethod === 'Split' ? Number(splitAmounts.online || 0) : 0),
                credit_paid: paymentMethod === 'Credit' ? finalTotal : (paymentMethod === 'Split' ? Number(splitAmounts.credit || 0) : 0),
                payment_method: paymentMethod,
                customer_id: selectedCustomer?.id,
                session_id: currentSession?.id
            });

            // Set data for receipt and success modal
            setLastSaleData({
                ...response.data,
                saleId: response.data.saleId,
                total_amount: finalTotal,
                items: [...cart], // CRITICAL: Include items from current cart
                discount: discount || 0,
                date: new Date().toLocaleString(),
                balance: balance,
                amountReceived: amountReceived,
                totalItems: totalItems,
                customerName: selectedCustomer ? selectedCustomer.name : 'Counter Customer',
                payment_method: paymentMethod
            });

            // Trigger Automatic Printing
            setTimeout(() => {
                window.print();
            }, 500);

            // Show Success Modal
            setShowSuccessModal(true);

            // Reset POS State
            setCart([]);
            setDiscount(0);
            setAmountReceived(0);
            setSplitAmounts({ cash: '', card: '', online: '', credit: '' });
            setShowSplitModal(false);
            fetchProducts();
            if (onSaleSuccess) onSaleSuccess();
        } catch (err) { alert(err.message); }
    };

    const handleHoldBill = () => {
        if (cart.length === 0) return;
        const newHold = {
            id: Date.now(),
            cart,
            discount,
            selectedCustomer,
            amountReceived,
            totalItems,
            finalTotal,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setHeldBills([...heldBills, newHold]);
        setCart([]);
        setDiscount(0);
        setSelectedCustomer(null);
        setAmountReceived(0);
        alert('Bill put on Hold!');
    };

    const restoreHeldBill = (bill) => {
        if (cart.length > 0) {
            if (!window.confirm("Restore will replace current cart. Continue?")) return;
        }
        setCart(bill.cart);
        setDiscount(bill.discount);
        setSelectedCustomer(bill.selectedCustomer);
        setAmountReceived(bill.amountReceived);
        setHeldBills(heldBills.filter(b => b.id !== bill.id));
        setShowHeldModal(false);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm));
        const matchesCat = activeCategory === 'All' || p.category === activeCategory;
        return matchesSearch && matchesCat;
    });

    const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

    return (
        <div className="pos-layout relative">
            {(!currentSession || currentSession.status !== 'OPEN') && !showDayReport && (
                <div className="pos-locked-overlay">
                    <div className="locked-content">
                        <div className="locked-icon-box">
                            <Sun size={48} className="text-amber-500 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">System Locked</h2>
                        <p className="text-slate-500 font-bold mb-6">Please open the day from navigation bar to start sales.</p>
                    </div>
                </div>
            )}

            {/* Mobile View Toggle Tabs */}
            <div className="mobile-pos-tabs md:hidden">
                <button
                    className={`mobile-tab ${mobileView === 'products' ? 'active' : ''}`}
                    onClick={() => setMobileView('products')}
                >
                    <Package size={20} />
                    <span>Products</span>
                </button>
                <button
                    className={`mobile-tab ${mobileView === 'cart' ? 'active' : ''}`}
                    onClick={() => setMobileView('cart')}
                >
                    <ShoppingCart size={20} />
                    <span>Cart ({cart.length})</span>
                    {cart.length > 0 && <span className="cart-badge-pulse">{cart.length}</span>}
                </button>
            </div>

            {/* LEFT: CHECKOUT COLUMN (Cart & Payments) */}
            <div className={`checkout-column ${mobileView === 'cart' ? 'mobile-visible' : 'mobile-hidden'}`}>
                {/* Barcode Strip */}
                <div className="panel" style={{ borderRadius: '8px 8px 0 0' }}>
                    <div className="barcode-strip">
                        <div className="barcode-input-container">
                            <span className="input-label-tag">Barcode / Item Code 🏷️</span>
                            <input
                                ref={searchInputRef}
                                className="barcode-input"
                                placeholder="🔍 Scan Barcode or Search Item..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button
                                className="p-2 text-slate-400 hover:text-primary transition-colors"
                                onClick={() => setShowCameraScanner(true)}
                                title="Open Camera Scanner"
                            >
                                <Camera size={18} />
                            </button>
                        </div>
                        <button className="btn-add-item">
                            <Plus size={20} /> Add Item (F3)
                        </button>
                    </div>
                </div>

                {/* Camera Scanner Modal */}
                {showCameraScanner && (
                    <BarcodeScanner
                        onScan={handleCameraScan}
                        onClose={() => setShowCameraScanner(false)}
                    />
                )}
                {/* Cart Item Panel */}
                <div className="panel flex-1" style={{ borderRadius: '0' }}>
                    <div className="panel-header" style={{ background: '#fff', gap: '0.75rem' }}>
                        <span className="flex items-center gap-2 font-black text-slate-800"><ShoppingCart size={16} /> Cart Items</span>

                        <div className="flex gap-1 ml-auto">
                            <button className="btn-held-list" onClick={() => setShowHeldModal(true)} title="View Held Bills">
                                <RefreshCw size={14} /> Held ({heldBills.length})
                            </button>
                            <button className="btn-hold" onClick={handleHoldBill} title="Hold Transaction (F6)"><Calculator size={14} /> Hold</button>
                            <button className="btn-clear" onClick={() => setCart([])} title="Clear Cart"><XCircle size={14} /> Clear</button>
                        </div>
                    </div>
                    <div className="cart-table-wrapper">
                        <table className="cart-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '160px' }}>Item Name</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Discount</th>
                                    <th className="text-right">Total</th>
                                    <th style={{ width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map(item => (
                                    <tr key={item.product_id}>
                                        <td>
                                            <div className="item-name-block">
                                                <span className="font-black text-slate-700 text-[10px] leading-tight block">{item.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="qty-control">
                                                <button className="qty-btn" onClick={() => updateQuantity(item.product_id, -1)}><Minus size={10} /></button>
                                                <input
                                                    type="number"
                                                    className="qty-input font-black text-[11px] w-8 text-center bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={item.quantity}
                                                    onChange={(e) => setQuantity(item.product_id, e.target.value)}
                                                />
                                                <button className="qty-btn" onClick={() => updateQuantity(item.product_id, 1)}><Plus size={10} /></button>
                                            </div>
                                        </td>
                                        <td className="text-right font-bold text-xs">Rs.{formatPrice(item.unit_price)}</td>
                                        <td className="text-right">
                                            <input
                                                type="number"
                                                className="item-discount-input"
                                                value={item.discount}
                                                onChange={(e) => updateItemDiscount(item.product_id, e.target.value)}
                                            />
                                        </td>
                                        <td className="text-right font-black text-emerald text-sm">Rs.{formatPrice(item.subtotal)}</td>
                                        <td>
                                            <button className="cart-remove-btn" onClick={() => removeFromCart(item.product_id)}><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>


                <div className="totals-strip">
                    <div className="total-field">
                        <span className="total-label uppercase">Gross Total</span>
                        <span className="total-value">Rs.{formatPrice(grossTotal)}</span>
                    </div>
                    <div className="total-field">
                        <span className="total-label uppercase">Discount (Rs.)</span>
                        <div className="flex justify-center items-center">
                            <input
                                type="text"
                                inputMode="decimal"
                                className="w-16 bg-transparent border-b border-amber text-center font-black outline-none"
                                value={discount}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        setDiscount(val);
                                    }
                                }}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div className="total-field">
                        <span className="total-label uppercase">Total Items</span>
                        <span className="total-value">{totalItems}</span>
                    </div>
                    <div className="total-field">
                        <span className="total-label uppercase" style={{ color: '#15803d' }}>Grand Total</span>
                        <span className="total-value grand">Rs.{formatPrice(finalTotal)}</span>
                    </div>
                </div>

            </div>

            {/* RIGHT: INVENTORY COLUMN (Products & Summary) */}
            <div className={`inventory-column ${mobileView === 'products' ? 'mobile-visible' : 'mobile-hidden'}`}>
                {/* Header & Categories */}
                <div className="panel" style={{ borderBottom: 'none', borderRadius: '8px 8px 0 0' }}>
                    <div className="panel-header">
                        <span className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-widest"><Package size={16} /> Product List</span>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    ref={searchInputRef}
                                    className="product-search-input"
                                    placeholder="Search Product..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchTerm) {
                                            // Check for exact barcode match first
                                            const exactMatch = products.find(p => p.barcode === searchTerm);
                                            if (exactMatch) {
                                                addToCart(exactMatch);
                                                setSearchTerm('');
                                            } else if (filteredProducts.length === 1) {
                                                addToCart(filteredProducts[0]);
                                                setSearchTerm('');
                                            }
                                        }
                                    }}
                                />
                            </div>
                            <select
                                className="category-select"
                                value={activeCategory}
                                onChange={(e) => setActiveCategory(e.target.value)}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="category-strip noscroll">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid Panel */}
                <div className="panel flex-1" style={{ borderRadius: '0', minHeight: '0' }}>
                    <div className="product-grid-scroll noscroll">
                        <div className="grid-4-cols">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`precision-product-card ${product.stock_quantity <= 0 ? 'out-of-stock' : ''}`}
                                    onClick={() => addToCart(product)}
                                >
                                    <div className="card-header-main">
                                        <div className="card-name-bold">{product.name}</div>
                                        {product.stock_quantity <= 0 && <span className="oos-badge">OUT OF STOCK</span>}
                                    </div>
                                    <div className="card-body-split">
                                        <div className="card-thumb-image">
                                            {product.category === 'Drinks' ? '🥤' :
                                                product.category === 'Milk' ? '🥛' :
                                                    product.category === 'Rice & Oil' ? '🍚' :
                                                        product.category === 'Snacks' ? '🍪' :
                                                            product.category === 'Pulses' ? '🫘' :
                                                                product.category === 'Masala' ? '🌶️' : '📦'}
                                        </div>
                                        <div className="card-details-right">
                                            <div className={`card-stock-tag ${product.stock_quantity <= 0 ? 'text-red-600' : ''}`}>
                                                Stock: {product.stock_quantity ?? 0}
                                            </div>
                                            <div className="card-price-tag">Rs.{product.selling_price?.toLocaleString() ?? '0'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Payment Buttons Panel moved here */}
                <div className="panel" style={{ borderRadius: '0 0 8px 8px', marginTop: 'auto' }}>
                    <div className="panel-header" style={{ padding: '0.6rem 1rem', gap: '1rem' }}>
                        <div className="flex items-center gap-2">
                            <CreditCard size={18} />
                            <span className="font-black text-navy-800 uppercase tracking-wide">Payment</span>
                        </div>

                        {/* Customer Selection in Payment Header */}
                        <div className="flex items-center gap-2 flex-1 max-w-[500px]">
                            {selectedCustomer ? (
                                <div className="customer-pill-premium">
                                    <CheckCircle2 size={16} />
                                    <span className="name">{selectedCustomer.name}</span>
                                    <button
                                        onClick={() => setSelectedCustomer(null)}
                                        className="remove-btn"
                                        title="Remove Customer"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <select
                                        className="category-select flex-1"
                                        style={{ textTransform: 'none', height: '36px', fontSize: '12px', background: '#f8fafc', maxWidth: '220px', borderRadius: '0.5rem' }}
                                        value=""
                                        onChange={(e) => {
                                            const cust = customers.find(c => c.id === Number(e.target.value));
                                            setSelectedCustomer(cust || null);
                                        }}
                                    >
                                        <option value="">Select Customer (Optional)</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                                        ))}
                                    </select>
                                    <button
                                        className="w-9 h-9 flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary-dark transition-all flex-shrink-0 shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                                        onClick={() => setShowAddCustomer(true)}
                                        title="Add New Customer"
                                    >
                                        <Plus size={16} strokeWidth={3} />
                                    </button>
                                </>
                            )}
                            <button
                                className="btn-expense-premium"
                                onClick={() => setShowExpenseModal(true)}
                                disabled={!currentSession || currentSession.status !== 'OPEN'}
                                title="Record Expense"
                            >
                                <Banknote size={16} /> <span className="hidden sm:inline">Expense</span>
                            </button>
                        </div>
                    </div>
                    <div className="payment-section-layout">
                        {/* Horizontal Payment Modes */}
                        <div className="payment-modes-row">
                            <button className={`payment-btn-wide cash ${paymentMethod === 'Cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('Cash')}>
                                <FileText size={18} /> Cash (F1)
                            </button>
                            <button className={`payment-btn-wide card ${paymentMethod === 'Card' ? 'active' : ''}`} onClick={() => setPaymentMethod('Card')}>
                                <CreditCard size={18} /> Card (F2)
                            </button>
                            <button className={`payment-btn-wide online ${paymentMethod === 'Online' ? 'active' : ''}`} onClick={() => setPaymentMethod('Online')}>
                                <Globe size={18} /> Online (F3)
                            </button>
                            <button className={`payment-btn-wide credit ${paymentMethod === 'Credit' ? 'active' : ''}`} onClick={() => setPaymentMethod('Credit')}>
                                <FileText size={18} /> Credit (F5)
                            </button>
                            <button className="payment-btn-wide split" onClick={() => setShowSplitModal(true)}>
                                <PieChart size={18} /> Split (F4)
                            </button>
                        </div>

                        <div className="settlement-control-grid">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-black text-navy-800 uppercase">Amount Received</span>
                                <div className="amount-input-box">
                                    <span className="currency-symbol-large">Rs.</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="amount-received-input"
                                        value={amountReceived}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                setAmountReceived(val);
                                            }
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="balance-dashboard-pill">
                                <div className="balance-label-wide">
                                    Balance <ChevronRight size={20} />
                                </div>
                                <div className="balance-value-large">
                                    Rs.{formatPrice(balance)}
                                </div>
                            </div>
                        </div>

                        <div className="action-buttons-grid">
                            <button
                                className="btn-checkout-premium"
                                onClick={() => handleCheckout(paymentMethod)}
                                disabled={cart.length === 0 || (!currentSession || currentSession.status !== 'OPEN')}
                            >
                                <DollarSign size={28} /> {paymentMethod} Checkout (F8)
                            </button>
                            <button className="btn-cancel-wide">
                                <XCircle size={20} /> Cancel Sale
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {
                showAddCustomer && (
                    <div className="modal-overlay">
                        <div className="modal-content animate-pop-in">
                            <div className="modal-header">
                                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                                    Quick Add Customer
                                </h3>
                                <button onClick={() => setShowAddCustomer(false)} className="text-slate-400 hover:text-red-500">
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="input-group-precision">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. John Doe"
                                        value={newCustomer.name}
                                        onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                    />
                                </div>
                                <div className="input-group-precision">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 9876543210"
                                        value={newCustomer.phone}
                                        onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                    />
                                </div>
                                <div className="input-group-precision">
                                    <label>Address (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="City, Area"
                                        value={newCustomer.address}
                                        onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setShowAddCustomer(false)}>Cancel</button>
                                <button className="btn-save" onClick={handleAddCustomer}>Register & Select</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {showSplitModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-pop-in" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <span className="font-black text-slate-800 flex items-center gap-2">
                                <PieChart size={18} className="text-primary" /> Split Payment
                            </span>
                            <button onClick={() => setShowSplitModal(false)} className="text-slate-400 hover:text-red-500">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Total Amount</span>
                                <span className="text-lg font-black text-primary">Rs.{finalTotal.toLocaleString()}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="input-group-precision">
                                    <label>Cash Amount</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={splitAmounts.cash}
                                        onChange={e => setSplitAmounts({ ...splitAmounts, cash: e.target.value })}
                                    />
                                </div>
                                <div className="input-group-precision">
                                    <label>Card Amount</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={splitAmounts.card}
                                        onChange={e => setSplitAmounts({ ...splitAmounts, card: e.target.value })}
                                    />
                                </div>
                                <div className="input-group-precision">
                                    <label>Online Amount</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={splitAmounts.online}
                                        onChange={e => setSplitAmounts({ ...splitAmounts, online: e.target.value })}
                                    />
                                </div>
                                <div className="input-group-precision">
                                    <label>Credit Amount</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={splitAmounts.credit}
                                        onChange={e => setSplitAmounts({ ...splitAmounts, credit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={`mt-4 p-3 rounded-lg flex justify-between items-center ${Math.abs((Number(splitAmounts.cash) + Number(splitAmounts.card) + Number(splitAmounts.online) + Number(splitAmounts.credit)) - finalTotal) < 0.01
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                                }`}>
                                <span className="text-sm font-bold">Remaining:</span>
                                <span className="text-xl font-black">
                                    Rs.{Math.max(0, finalTotal - (Number(splitAmounts.cash) + Number(splitAmounts.card) + Number(splitAmounts.online) + Number(splitAmounts.credit))).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowSplitModal(false)}>Close</button>
                            <button
                                className="btn-save"
                                disabled={Math.abs((Number(splitAmounts.cash) + Number(splitAmounts.card) + Number(splitAmounts.online) + Number(splitAmounts.credit)) - finalTotal) > 0.01}
                                onClick={() => handleCheckout('Split', splitAmounts)}
                            >
                                Confirm Split Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Sale Modal with Cash Drawer Animation */}
            {showSuccessModal && (
                <div className="success-modal-overlay no-print">
                    <div className="success-modal-card">
                        <div className="success-header">
                            <div className="success-icon-circle">
                                <CheckCircle2 size={48} />
                            </div>
                            <h2 className="text-2xl font-black">SALE COMPLETED!</h2>
                        </div>
                        <div className="success-body">
                            <div className="bill-amount-display">
                                <p className="bill-amount-label">Bill Amount</p>
                                <h1 className="bill-amount-value">Rs.{formatPrice(lastSaleData?.total_amount)}</h1>
                            </div>

                            <div className="cash-drawer-container">
                                <div className="drawer-slider">
                                    <ShoppingCart className="money-icon" size={32} />
                                    <span className="text-[10px] font-black text-slate-300 mt-1 uppercase">Drawer Open</span>
                                </div>
                                <div className="drawer-base"></div>
                            </div>

                            <p className="text-slate-500 font-bold mt-8">Cash drawer opened & Receipt printed.</p>

                            <button className="btn-done-modal" onClick={() => setShowSuccessModal(false)}>
                                NEXT CUSTOMER (ESC)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Thermal Receipt (Only appears during printing) */}
            {lastSaleData && !showDayReport && (
                <div className="thermal-receipt">
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <h2 style={{ margin: 0 }}>POS SYSTEM</h2>
                        <p style={{ margin: 0 }}>Retail Grocery Store</p>
                        <p style={{ margin: 0 }}>Tel: +94 123 456 789</p>
                    </div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></div>
                    <div style={{ fontSize: '11px' }}>
                        <p style={{ margin: 0 }}>Bill ID: #{lastSaleData.saleId}</p>
                        <p style={{ margin: 0 }}>Date: {lastSaleData.date}</p>
                        <p style={{ margin: 0 }}>CUSTOMER: {lastSaleData.customerName}</p>
                        <p style={{ margin: 0 }}>CASHIER: ADMIN</p>
                    </div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></div>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Item</th>
                                <th style={{ textAlign: 'center' }}>Qty</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lastSaleData.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.name}</td>
                                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>{formatPrice(item.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></div>
                    <div style={{ fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Total Items:</span>
                            <span>{lastSaleData.totalItems}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Total Discount:</span>
                            <span>Rs.{formatPrice(lastSaleData.discount)}</span>
                        </div>
                    </div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>NET TOTAL:</span>
                            <span>Rs.{formatPrice(lastSaleData.total_amount)}</span>
                        </div>
                    </div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></div>
                    <div style={{ fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>CASH GIVEN:</span>
                            <span>Rs.{formatPrice(lastSaleData.amountReceived)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>BALANCE PAID:</span>
                            <span>Rs.{formatPrice(lastSaleData.balance || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '4px' }}>
                            <span>PAYMENT:</span>
                            <span style={{ textTransform: 'uppercase' }}>{lastSaleData.payment_method}</span>
                        </div>
                    </div>
                    <div style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></div>
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                        <p style={{ margin: 0 }}>THANK YOU!</p>
                        <p style={{ margin: 0 }}>COME AGAIN</p>
                    </div>
                </div>
            )}

            {/* Held Bills Modal */}
            {showHeldModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-pop-in" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <span className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                                <Calculator size={18} className="text-amber" /> Held Transactions
                            </span>
                            <button onClick={() => setShowHeldModal(false)} className="text-slate-400 hover:text-red-500">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="modal-body noscroll" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {heldBills.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 font-bold">No held bills at the moment.</div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {heldBills.map(bill => (
                                        <div key={bill.id} className="held-bill-card">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-black text-slate-400">{bill.timestamp}</span>
                                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Held</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <div className="font-black text-slate-800">{bill.selectedCustomer?.name || 'Counter Customer'}</div>
                                                    <div className="text-xs text-slate-500 font-bold">{bill.totalItems} Items</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-slate-400">Total</div>
                                                    <div className="font-black text-lg text-primary">Rs.{formatPrice(bill.finalTotal)}</div>
                                                </div>
                                            </div>
                                            <button className="btn-restore-held" onClick={() => restoreHeldBill(bill)}>
                                                Restore Bill <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel w-full" onClick={() => setShowHeldModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Day Report Printing Component */}
            {showDayReport && dayReportData && (
                <div className="thermal-receipt absolute inset-0 z-[60] flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm no-print-background">
                    <div className="receipt-card-preview bg-white p-6 shadow-2xl border-2 border-dashed border-slate-300 max-w-sm w-full font-mono text-black">
                        <div className="text-center mb-4 border-b-2 border-dashed border-black pb-2">
                            <h2 className="font-black text-xl uppercase">DAY END REPORT</h2>
                            <div className="text-xs font-bold">GroceryPro POS System</div>
                            <div className="text-[10px]">Session ID: #{dayReportData.id}</div>
                        </div>

                        <div className="receipt-details mb-4 text-xs">
                            <div className="flex justify-between"><span>Open Time:</span><span>{new Date(dayReportData.opening_time).toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Close Time:</span><span>{new Date(dayReportData.closing_time).toLocaleString()}</span></div>
                            <div className="flex justify-between font-black border-t border-black mt-2 pt-1 uppercase"><span>Status:</span><span>{dayReportData.status}</span></div>
                        </div>

                        <div className="border-y border-dashed border-black py-2 my-2">
                            <div className="flex justify-between font-black text-sm">
                                <span>OPENING CASH:</span>
                                <span>Rs.{formatPrice(dayReportData.opening_amount)}</span>
                            </div>
                        </div>

                        <div className="receipt-details space-y-1 my-4 text-xs font-bold">
                            <div className="flex justify-between"><span>Total Bills:</span><span>{dayReportData.total_bills}</span></div>
                            <div className="flex justify-between"><span>Cash Sales:</span><span>Rs.{formatPrice(dayReportData.total_cash)}</span></div>
                            <div className="flex justify-between"><span>Card Sales:</span><span>Rs.{formatPrice(dayReportData.total_card)}</span></div>
                            <div className="flex justify-between text-rose-600 font-black border-t border-rose-100 pt-1">
                                <span>TOTAL EXPENSES:</span>
                                <span>Rs.{formatPrice(dayReportData.total_expenses)}</span>
                            </div>
                            <div className="flex justify-between font-black border-t border-black pt-1">
                                <span>GROSS REVENUE:</span>
                                <span>Rs.{formatPrice(dayReportData.total_revenue)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-700 font-black">
                                <span>TOTAL PROFIT:</span>
                                <span>Rs.{formatPrice(dayReportData.total_profit)}</span>
                            </div>
                        </div>

                        <div className="border-t-2 border-black pt-2 mt-4">
                            <div className="flex justify-between font-black text-lg">
                                <span>DRAWER CASH:</span>
                                <span>Rs.{formatPrice(Number(dayReportData.opening_amount) + Number(dayReportData.total_cash) - Number(dayReportData.total_expenses))}</span>
                            </div>
                            <p className="text-[10px] text-center mt-4 font-bold italic">
                                Report Generated on {new Date().toLocaleString()}
                            </p>
                        </div>
                        <button
                            className="btn-done-modal mt-6 no-print"
                            style={{ maxWidth: '300px' }}
                            onClick={() => setShowDayReport(false)}
                        >
                            CLOSE REPORT (ESC)
                        </button>
                    </div>
                </div>
            )}
            {/* Warning Modal */}
            {showWarningModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-pop-in !max-w-[400px]">
                        <div className="flex flex-col items-center py-6 text-center">
                            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-wide">Attention Required</h3>
                            <p className="text-slate-500 font-bold mb-6 px-4">{warningMessage}</p>
                            <button
                                className="btn-save w-full !bg-amber-500 hover:!bg-amber-600 shadow-amber-500/20"
                                onClick={() => setShowWarningModal(false)}
                            >
                                UNDERSTOOD
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Modal */}
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

        </div >
    );
};

export default PrecisionPOS;
