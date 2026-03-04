import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Save, Store, MapPin, Phone, Image, Globe, ShieldCheck, Activity, Cpu } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const Settings = () => {
    const [settings, setSettings] = useState({
        shop_name: '',
        shop_logo: '',
        shop_address: '',
        shop_phone: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_BASE}/settings`);
            setSettings(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching settings', err);
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.put(`${API_BASE}/settings`, settings);
            alert('Infrastructure configuration updated successfully.');
            window.location.reload();
        } catch (err) {
            alert('Failed to synchronize infrastructure.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="premium-container flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Activity size={48} className="text-primary animate-pulse" />
                    <div className="text-[10px] font-black tracking-[0.5em] text-slate-300 uppercase">Synchronizing Systems...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="premium-container">
            <div className="elite-card">
                {/* Header */}
                <header className="elite-header-section">
                    <h2 className="elite-title">
                        <SettingsIcon size={28} className="text-primary" /> System Configuration
                    </h2>
                    <div className="elite-subtitle" style={{ color: '#f59e0b', fontWeight: 'normal' }}>BY NOVA TECHNO</div>
                </header>

                <form onSubmit={handleSave}>
                    <div className="flex flex-col">
                        {/* Content */}
                        <main className="elite-content-area">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                                {/* Identity Block */}
                                <section>
                                    <div className="elite-input-field">
                                        <label className="elite-label">Organization Designation</label>
                                        <div className="elite-input-container">
                                            <div className="elite-input-icon"><Store size={20} /></div>
                                            <input
                                                type="text"
                                                className="elite-input"
                                                value={settings.shop_name}
                                                onChange={e => setSettings({ ...settings, shop_name: e.target.value })}
                                                placeholder="Precision Grocery Pro"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="elite-input-field">
                                        <label className="elite-label">Brand Asset (URL)</label>
                                        <div className="elite-input-container">
                                            <div className="elite-input-icon"><Image size={20} /></div>
                                            <input
                                                type="text"
                                                className="elite-input"
                                                value={settings.shop_logo}
                                                onChange={e => setSettings({ ...settings, shop_logo: e.target.value })}
                                                placeholder="https://cloud.assets/logo.png"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Contact Block */}
                                <section>
                                    <div className="elite-input-field">
                                        <label className="elite-label">Headquarters Physical Location</label>
                                        <div className="elite-input-container">
                                            <div className="elite-input-icon"><MapPin size={20} /></div>
                                            <input
                                                type="text"
                                                className="elite-input"
                                                value={settings.shop_address}
                                                onChange={e => setSettings({ ...settings, shop_address: e.target.value })}
                                                placeholder="Street, City, Country"
                                            />
                                        </div>
                                    </div>

                                    <div className="elite-input-field">
                                        <label className="elite-label">Enterprise Support Terminal</label>
                                        <div className="elite-input-container">
                                            <div className="elite-input-icon"><Phone size={20} /></div>
                                            <input
                                                type="text"
                                                className="elite-input"
                                                value={settings.shop_phone}
                                                onChange={e => setSettings({ ...settings, shop_phone: e.target.value })}
                                                placeholder="+94 112 345 678"
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </main>
                    </div>

                    {/* Footer */}
                    <footer className="elite-footer">
                        <div className="elite-badge">
                            <div className="elite-badge-dot"></div>
                            Infrastructure Verified
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="elite-btn-primary"
                        >
                            <Save size={18} /> {saving ? 'Synchronizing...' : 'Commit Configuration'}
                        </button>
                    </footer>
                </form>
            </div>

            {/* Signature Branding */}
            <div className="elite-signature-box">
                <div className="elite-signature">
                    NOVA <span className="elite-signature-highlight">TECHNO</span>
                </div>
                <div className="elite-signature-line"></div>
                <div className="elite-signature-sub">Powered by Flashy Mart</div>
            </div>
        </div>
    );
};

export default Settings;
