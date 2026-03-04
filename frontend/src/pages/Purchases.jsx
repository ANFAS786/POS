import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Truck, Plus, Trash2, Save, Search, Calendar, FileText, User, ShoppingCart, Info, Clock, Printer } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const Purchases = ({ settings }) => {
    const [products, setProducts] = useState([]);
    const [purchaseItems, setPurchaseItems] = useState([]);
    const [supplier, setSupplier] = useState('');
    const [invoice, setInvoice] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [mobileView, setMobileView] = useState('catalog'); // 'catalog' or 'items'
    const [viewMode, setViewMode] = useState('create'); // 'create' or 'history'
    const [history, setHistory] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);

    useEffect(() => {
        fetchProducts();
        if (viewMode === 'history') fetchHistory();
    }, [viewMode]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_BASE}/products`);
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching products', err);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_BASE}/purchases`);
            setHistory(res.data);
        } catch (err) {
            console.error('Error fetching history', err);
        }
    };

    const fetchOrderDetails = async (order) => {
        try {
            const res = await axios.get(`${API_BASE}/purchases/${order.id}`);
            setOrderItems(res.data);
            setSelectedOrder(order);
        } catch (err) {
            console.error('Error fetching order details', err);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const addItem = (product) => {
        const existing = purchaseItems.find(item => item.product_id === product.id);
        if (!existing) {
            setPurchaseItems([...purchaseItems, {
                product_id: product.id,
                name: product.name,
                quantity: 1,
                cost_price: product.cost_price || 0,
                subtotal: product.cost_price || 0,
                expiry_date: ''
            }]);
        } else {
            // If exists, increment quantity
            updateItem(product.id, 'quantity', existing.quantity + 1);
        }
        setSearchTerm('');
    };

    const updateItem = (id, field, value) => {
        setPurchaseItems(purchaseItems.map(item => {
            if (item.product_id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'cost_price') {
                    updated.subtotal = updated.quantity * updated.cost_price;
                }
                return updated;
            }
            return item;
        }));
    };

    const removeItem = (id) => {
        setPurchaseItems(purchaseItems.filter(item => item.product_id !== id));
    };

    const totalAmount = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalQty = purchaseItems.reduce((sum, item) => sum + item.quantity, 0);

    const handleSavePurchase = async () => {
        if (!supplier || purchaseItems.length === 0) return alert('Please fill supplier and items');
        try {
            await axios.post(`${API_BASE}/purchases`, {
                supplier_name: supplier,
                invoice_number: invoice,
                items: purchaseItems,
                total_amount: totalAmount
            });
            alert('Purchase recorded successfully!');
            setPurchaseItems([]);
            setSupplier('');
            setInvoice('');
            fetchProducts();
        } catch (err) {
            alert('Failed to save purchase');
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="content-container-fluid flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex justify-between items-center premium-top-bar" style={{ background: 'transparent', padding: 0, height: 'auto', border: 'none', boxShadow: 'none' }}>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Truck size={36} className="text-primary" /> Purchases
                    </h2>
                    <p className="text-slate-500 font-bold text-sm tracking-wide uppercase">Inventory Procurement & Goods Receipt</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setViewMode(viewMode === 'create' ? 'history' : 'create')}
                        className="btn-util-premium"
                        style={{ padding: '0 1.5rem', height: '48px', borderRadius: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}
                    >
                        {viewMode === 'create' ? <Clock size={20} /> : <Plus size={20} />}
                        {viewMode === 'create' ? 'View History' : 'Create New GRN'}
                    </button>
                    {viewMode === 'create' && (
                        <button onClick={handleSavePurchase} className="btn-submit-grn">
                            <Save size={20} /> Submit Purchase
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'create' ? (
                <>
                    {/* Mobile View Toggle Tabs */}
                    <div className="md:hidden flex bg-white rounded-xl p-1 border border-slate-200">
                        <button
                            className={`flex-1 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-2 ${mobileView === 'catalog' ? 'bg-primary text-white' : 'text-slate-500'}`}
                            onClick={() => setMobileView('catalog')}
                        >
                            <Plus size={16} /> CATALOG
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-lg font-black text-xs flex items-center justify-center gap-2 ${mobileView === 'items' ? 'bg-primary text-white' : 'text-slate-500'}`}
                            onClick={() => setMobileView('items')}
                        >
                            <ShoppingCart size={16} /> ITEMS ({purchaseItems.length})
                        </button>
                    </div>

                    <div className="grn-professional-layout">
                        {/* Catalog Sidebar */}
                        <aside className={`grn-catalog-sidebar ${mobileView === 'catalog' ? 'flex-sidebar-active' : 'flex-sidebar-hidden'}`}>
                            <div className="grn-sidebar-header">
                                <h3>Product Catalog</h3>
                                <div className="grn-input-group-modern">
                                    <Search size={18} className="text-primary" />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {filteredProducts.map(p => (
                                    <div key={p.id} className="catalog-card-premium" onClick={() => addItem(p)}>
                                        <div className="p-name">{p.name}</div>
                                        <div className="p-meta">
                                            <span className="p-price">Rs.{Number(p.cost_price || 0).toFixed(2)}</span>
                                            <span>•</span>
                                            <span>Stock: {p.stock_quantity}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </aside>

                        <main className={`grn-main-canvas ${mobileView === 'items' ? 'flex-canvas-active' : 'flex-canvas-hidden'}`}>
                            <div className="grn-form-header">
                                <div className="grn-input-field">
                                    <label>Supplier Details</label>
                                    <div className="grn-input-group-modern">
                                        <User size={18} className="text-slate-400" />
                                        <input
                                            placeholder="Enter or select supplier..."
                                            value={supplier}
                                            onChange={e => setSupplier(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grn-input-field">
                                    <label>Invoice / Reference</label>
                                    <div className="grn-input-group-modern">
                                        <FileText size={18} className="text-slate-400" />
                                        <input
                                            placeholder="INV-2024-001"
                                            value={invoice}
                                            onChange={e => setInvoice(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grn-items-table-container custom-scrollbar">
                                <table className="grn-table-professional">
                                    <thead>
                                        <tr>
                                            <th className="w-[40%]">Product Name</th>
                                            <th className="w-[15%] text-center">Quantity</th>
                                            <th className="w-[20%] text-center">Unit Cost</th>
                                            <th className="w-[15%] text-right">Subtotal</th>
                                            <th className="w-[10%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchaseItems.map(item => (
                                            <tr key={item.product_id} className="grn-table-row">
                                                <td>
                                                    <div className="font-black text-slate-800">{item.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {item.product_id}</div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="input-minimal"
                                                        value={item.quantity}
                                                        onChange={e => updateItem(item.product_id, 'quantity', Number(e.target.value))}
                                                    />
                                                </td>
                                                <td>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rs.</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="input-minimal pl-6"
                                                            value={item.cost_price}
                                                            onChange={e => updateItem(item.product_id, 'cost_price', Number(e.target.value))}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="text-right font-black text-slate-900">
                                                    Rs.{item.subtotal.toFixed(2)}
                                                </td>
                                                <td>
                                                    <div className="flex justify-center">
                                                        <button onClick={() => removeItem(item.product_id)} className="btn-remove-item">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {purchaseItems.length === 0 && (
                                    <div className="grn-empty-state">
                                        <Info size={48} className="text-slate-200" />
                                        <p>Order list is currently empty</p>
                                        <span>Select products from the catalog to populate this list</span>
                                    </div>
                                )}
                            </div>

                            <div className="grn-summary-footer">
                                <div className="footer-stat">
                                    <span className="label">Items In Order</span>
                                    <span className="value">{purchaseItems.length} Products</span>
                                </div>
                                <div className="footer-stat">
                                    <span className="label">Total Quantity</span>
                                    <span className="value">{totalQty || 0}</span>
                                </div>
                                <div className="footer-stat">
                                    <span className="label">Grand Total Amount</span>
                                    <span className="value emerald">Rs.{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </main>
                    </div>
                </>
            ) : (
                <div className="grn-main-canvas animate-fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
                    <div className="grn-items-table-container custom-scrollbar">
                        <table className="grn-table-professional">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Supplier</th>
                                    <th>Invoice No.</th>
                                    <th className="text-right">Total Amount</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="font-bold text-slate-600">{new Date(order.date).toLocaleDateString()}</td>
                                        <td className="font-black text-slate-900">{order.supplier_name}</td>
                                        <td className="font-mono text-primary font-bold">{order.invoice_number || 'N/A'}</td>
                                        <td className="text-right font-black">Rs.{order.total_amount.toFixed(2)}</td>
                                        <td className="text-center">
                                            <button
                                                onClick={() => fetchOrderDetails(order)}
                                                className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all text-xs"
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {history.length === 0 && (
                            <div className="grn-empty-state">
                                <Clock size={48} className="text-slate-200" />
                                <p>No purchase history found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {selectedOrder && (
                <div className="modal-overlay">
                    <div className="modal-content animate-pop-in" style={{ maxWidth: '800px', width: '95%' }}>
                        <div className="modal-header">
                            <h2 className="flex items-center gap-3">
                                <ShoppingCart className="text-primary" />
                                Order: {selectedOrder.invoice_number || 'No Invoice'}
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={handlePrint} className="btn-print-util">
                                    <Printer size={18} /> Print Order
                                </button>
                                <button onClick={() => setSelectedOrder(null)} className="btn-close-modal" style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                            </div>
                        </div>
                        <div className="modal-body custom-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
                                <div>
                                    <span className="block text-[10px] font-black text-slate-400 uppercase">Supplier</span>
                                    <span className="font-bold text-slate-900">{selectedOrder.supplier_name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] font-black text-slate-400 uppercase">Date</span>
                                    <span className="font-bold text-slate-900">{new Date(selectedOrder.date).toLocaleString()}</span>
                                </div>
                            </div>

                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-slate-100">
                                        <th className="py-2 text-[11px] font-black text-slate-500 uppercase">Product</th>
                                        <th className="py-2 text-[11px] font-black text-slate-500 uppercase text-center">Qty</th>
                                        <th className="py-2 text-[11px] font-black text-slate-500 uppercase text-center">Cost</th>
                                        <th className="py-2 text-[11px] font-black text-slate-500 uppercase text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderItems.map(item => (
                                        <tr key={item.id} className="border-b border-slate-50">
                                            <td className="py-3 font-bold text-slate-800">{item.name}</td>
                                            <td className="py-3 text-center font-bold text-slate-600">{item.quantity}</td>
                                            <td className="py-3 text-center font-mono text-slate-600">Rs.{item.cost_price.toFixed(2)}</td>
                                            <td className="py-3 text-right font-black text-slate-900">Rs.{item.subtotal.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-900 text-white">
                                        <td colSpan="3" className="py-3 px-4 font-black">TOTAL AMOUNT</td>
                                        <td className="py-3 px-4 text-right font-black text-emerald-400 text-xl">Rs.{selectedOrder.total_amount.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {/* Hidden Print Template - Portaled to Body to avoid parent css hiding it */}
            {selectedOrder && createPortal(
                <div id="grn-print-template" className="hidden-print">
                    <div className="print-header">
                        <div className="company-info">
                            <h1 className="brand-name">{settings?.shop_name || 'PRECISION GROCERY'}</h1>
                            <p>Official Goods Receipt Note (GRN)</p>
                            <div className="text-[10px] font-bold text-slate-500 mt-1">
                                {settings?.shop_address} • {settings?.shop_phone}
                            </div>
                        </div>
                        <div className="order-summary">
                            <div className="summary-item"><strong>Date:</strong> {new Date(selectedOrder.date).toLocaleString()}</div>
                            <div className="summary-item"><strong>GRN No:</strong> {selectedOrder.id}</div>
                            <div className="summary-item"><strong>Invoice:</strong> {selectedOrder.invoice_number || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="print-partner-info">
                        <div className="info-block">
                            <h4>Supplier Details</h4>
                            <p className="partner-name">{selectedOrder.supplier_name}</p>
                        </div>
                    </div>

                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Description</th>
                                <th className="text-center">Qty</th>
                                <th className="text-right">Unit Cost (Rs.)</th>
                                <th className="text-right">Subtotal (Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderItems.map((item, idx) => (
                                <tr key={item.id}>
                                    <td>{idx + 1}</td>
                                    <td className="font-bold">{item.name}</td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td className="text-right">{item.cost_price.toFixed(2)}</td>
                                    <td className="text-right">{item.subtotal.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="4" className="text-right"><strong>GRAND TOTAL</strong></td>
                                <td className="text-right"><strong>Rs.{selectedOrder.total_amount.toFixed(2)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="print-sig-section">
                        <div className="sig-box">
                            <p>Prepared By</p>
                            <div className="sig-line"></div>
                        </div>
                        <div className="sig-box">
                            <p>Supplier Acknowledgement</p>
                            <div className="sig-line"></div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Purchases;
