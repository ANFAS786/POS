import React, { useState } from 'react';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Settings from './pages/Settings';
import { ShoppingCart, LayoutDashboard, Database, Truck, Settings as SettingsIcon, User, Clock, Maximize, Minimize, Sun, Moon, Wallet, Menu, Calculator as CalculatorIcon, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import './index.css';
import Calculator from './components/Calculator';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function App() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [showDayOpenModal, setShowDayOpenModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [settings, setSettings] = useState({
    shop_name: 'Precision Grocery',
    shop_logo: ''
  });

  React.useEffect(() => {
    fetchSessionStatus();
    fetchSettings();

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const fetchSessionStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sessions/status`);
      setCurrentSession(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/settings`);
      setSettings(res.data);
    } catch (err) { console.error(err); }
  };

  const handleDayOpen = async () => {
    if (!openingAmount) return alert("Enter opening cash");
    try {
      const res = await axios.post(`${API_BASE}/api/sessions/open`, { opening_amount: Number(openingAmount) });
      setCurrentSession(res.data);
      setShowDayOpenModal(false);
      setOpeningAmount('');
      alert("Day Opened Successfully!");
    } catch (err) { alert(err.response?.data?.error || err.message); }
  };

  const handleDayClose = async () => {
    if (!window.confirm("If you close the day, all data will be restored and a day report will be generated. Continue?")) return;
    try {
      const res = await axios.post(`${API_BASE}/api/sessions/close`);
      const sessionId = res.data.sessionId;

      // Trigger Report Printing
      setCurrentSession({ ...currentSession, status: 'CLOSED', id: sessionId, triggerReport: true });

      alert("Day Closed Successfully! Printing Report...");
      fetchSessionStatus();
    } catch (err) { alert(err.response?.data?.error || err.message); }
  };

  const toggleFullscreen = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const now = Date.now();
    if (window.lastFullscreenToggle && (now - window.lastFullscreenToggle < 1000)) {
      return;
    }
    window.lastFullscreenToggle = now;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className={`app-layout-root ${activeTab === 'pos' ? 'sidebar-hidden' : ''} ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
      {/* Sidebar Navigation */}
      {activeTab !== 'pos' && (
        <aside className={`sidebar-premium animate-slide-in-left ${mobileSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="flex flex-col items-center gap-4 py-6 border-b border-white/5 mb-8">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl relative group transition-all hover:border-primary/50">
                <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {settings.shop_logo ? (
                  <img src={settings.shop_logo} alt="Logo" className="w-10 h-10 object-contain relative z-10" />
                ) : (
                  <ShoppingCart size={24} className="text-primary relative z-10" />
                )}
              </div>
              <div className="text-center">
                <div className="text-lg font-black tracking-tighter text-white leading-none mb-1">{settings.shop_name}</div>
                <div className="text-[8px] font-normal tracking-[0.3em] uppercase" style={{ color: '#f59e0b' }}>BY NOVA TECHNO</div>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav-list">
            <button
              onClick={() => { setActiveTab('pos'); fetchSessionStatus(); setMobileSidebarOpen(false); }}
              className={`sidebar-link ${activeTab === 'pos' ? 'active' : ''}`}
            >
              <LayoutDashboard size={20} />
              <span>Point of Sale</span>
              {activeTab === 'pos' && <div className="active-glow" />}
            </button>

            <button
              onClick={() => { setActiveTab('inventory'); setMobileSidebarOpen(false); }}
              className={`sidebar-link ${activeTab === 'inventory' ? 'active' : ''}`}
            >
              <Database size={20} />
              <span>Inventory</span>
              {activeTab === 'inventory' && <div className="active-glow" />}
            </button>

            <button
              onClick={() => { setActiveTab('purchases'); setMobileSidebarOpen(false); }}
              className={`sidebar-link ${activeTab === 'purchases' ? 'active' : ''}`}
            >
              <Truck size={20} />
              <span>Purchases</span>
              {activeTab === 'purchases' && <div className="active-glow" />}
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setMobileSidebarOpen(false); }}
              className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <SettingsIcon size={20} />
              <span>System Settings</span>
              {activeTab === 'settings' && <div className="active-glow" />}
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="p-4 pt-0">
              <div className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <ShieldCheck size={10} className="text-primary" /> System Partner
                </div>
                <div className="text-xs font-black text-white leading-tight">
                  NOVA TECHNO
                </div>
                <div className="text-[9px] font-bold text-slate-500">
                  powered by Flashy Mart
                </div>
              </div>
            </div>

            <div className="user-profile-mini mt-0">
              <div className="user-avatar-shine">AK</div>
              <div className="user-info-stack">
                <span className="user-name">Admin User</span>
                <span className="user-role">System Manager</span>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setMobileSidebarOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <div className="main-viewport">
        <header className="premium-top-bar">
          <div className="top-bar-left">
            <div className="flex items-center gap-4">
              {activeTab !== 'pos' && (
                <button
                  className="mobile-menu-toggle"
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                >
                  <Menu size={24} />
                </button>
              )}
              {activeTab === 'pos' && (
                <button
                  className="btn-exit-pos"
                  onClick={() => setActiveTab('inventory')}
                  title="Back to Dashboard"
                >
                  <LayoutDashboard size={18} /> BACK
                </button>
              )}
              <div>
                <h1 className="viewport-title">
                  {activeTab === 'pos' && "Point of Sale Terminal"}
                  {activeTab === 'inventory' && "Inventory Intelligence"}
                  {activeTab === 'purchases' && "Supply Chain Tracking"}
                  {activeTab === 'settings' && "System Configuration"}
                </h1>
                <div className="top-bar-breadcrumb">
                  Main System / <span>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="top-bar-right">
            {currentSession && currentSession.status === 'OPEN' && (
              <div className="cash-status-badge premium">
                <div className="badge-icon-box shine">
                  <Wallet size={16} />
                </div>
                <div className="badge-details">
                  <span className="badge-label">DRAWER CASH</span>
                  <span className="badge-amount">
                    Rs.{Number(currentSession.current_cash || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="top-bar-actions">
              <div className="time-display-box font-mono">
                <Clock size={14} className="text-blue-500" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>

              <div className="v-divider"></div>

              {(!currentSession || currentSession.status !== 'OPEN') ? (
                <button className="btn-day-open-premium" onClick={() => setShowDayOpenModal(true)}>
                  <Sun size={14} strokeWidth={3} /> OPEN DAY
                </button>
              ) : (
                <button className="btn-day-close-premium" onClick={handleDayClose}>
                  <Moon size={14} strokeWidth={3} /> CLOSE DAY
                </button>
              )}

              <button className="btn-util-circle" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>

              <div className="v-divider"></div>

              <button
                className={`btn-calc-toggle ${showCalculator ? 'active' : ''}`}
                onClick={() => setShowCalculator(!showCalculator)}
                title="Calculator"
              >
                <CalculatorIcon size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="content-container-fluid">
          {activeTab === 'pos' && <POS currentSession={currentSession} onSaleSuccess={fetchSessionStatus} />}
          {activeTab === 'inventory' && <Inventory currentSession={currentSession} />}
          {activeTab === 'purchases' && <Purchases settings={settings} />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      {/* Day Open Modal */}
      {showDayOpenModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2"><Sun className="text-amber-500" /> Start New Day</h2>
            </div>
            <div className="modal-body">
              <p className="text-slate-500 mb-4 text-sm font-bold">Please enter the opening cash amount in the drawer to begin the shift.</p>
              <div className="amount-input-box" style={{ background: '#f8fafc', padding: '1.5rem' }}>
                <span className="currency-symbol-large">Rs.</span>
                <input
                  type="number"
                  className="amount-received-input"
                  style={{ fontSize: '2.5rem' }}
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer" style={{ gap: '1rem' }}>
              <button className="btn-cancel flex-1" onClick={() => setShowDayOpenModal(false)}>Cancel</button>
              <button className="btn-print-large flex-1" style={{ margin: 0 }} onClick={handleDayOpen}>
                Open Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Component */}
      {showCalculator && (
        <Calculator onClose={() => setShowCalculator(false)} />
      )}
    </div>
  );
}

export default App;
