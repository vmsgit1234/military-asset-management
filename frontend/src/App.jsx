import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Package, TrendingUp, TrendingDown, RefreshCcw, LogOut, Shield, MapPin, 
  Plus, ArrowRightLeft, User, Activity
} from 'lucide-react';
import './index.css';

// ==========================================
// 1. API CONFIGURATION
// ==========================================
const API_URL = 'https://mams-backend-ehfb.onrender.com';

// Configure Axios to automatically attach the JWT token to every request
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ==========================================
// 2. AUTHENTICATION CONTEXT & COMPONENTS
// ==========================================

// Helper to get current user from local storage
const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

// Protected Route Component (The Frontend "Bouncer")
const ProtectedRoute = ({ children, allowedRoles }) => {
    const user = getCurrentUser();
    const token = localStorage.getItem('token');

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // User is logged in but doesn't have the right role for this specific page
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

// ==========================================
// 3. LOGIN PAGE
// ==========================================
const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/auth/login`, { username, password });
            
            // Store token and user data in browser's local storage
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Redirect to dashboard
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
            <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
                <div className="text-center mb-8">
                    <Shield className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                    <h2 className="text-3xl font-bold text-white">MIL-ASSET</h2>
                    <p className="text-slate-400 mt-2">Secure Command & Control</p>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Authenticating...' : 'Secure Login'}
                    </button>
                </form>
                
                <div className="mt-8 text-xs text-slate-500 text-center">
                    <p>Demo Credentials:</p>
                    <p>admin_user / AdminPass123!</p>
                    <p>commander_alpha / CommandPass123!</p>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 4. MAIN DASHBOARD (Protected)
// ==========================================
const Dashboard = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    
    // UI State
    const [activeTab, setActiveTab] = useState('overview');
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    
    // Mock Data for the dashboard visual layer
    const inventoryData = [
        { name: 'M4 Carbine', stock: 1250, category: 'WEAPON' },
        { name: 'Humvee', stock: 45, category: 'VEHICLE' },
        { name: '5.56mm Ammo', stock: 50000, category: 'AMMUNITION' },
        { name: 'Night Vision', stock: 320, category: 'GEAR' },
    ];

    const recentActivity = [
        { id: 1, action: 'PURCHASE', details: 'Added 500 M4 Carbines to Base #1', time: '2 hours ago' },
        { id: 2, action: 'TRANSFER', details: 'Moved 5 Humvees from Base #1 to Base #2', time: '5 hours ago' },
        { id: 3, action: 'PURCHASE', details: 'Restocked 10,000 rds 5.56mm to Base #2', time: '1 day ago' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    // Role-based UI helpers
    const canPurchase = ['ADMIN', 'LOGISTICS_OFFICER'].includes(user?.role);
    const canTransfer = ['ADMIN', 'LOGISTICS_OFFICER', 'BASE_COMMANDER'].includes(user?.role);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200">
            {/* Top Navigation Bar */}
            <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Shield className="h-8 w-8 text-blue-500 mr-3" />
                            <span className="font-bold text-xl tracking-wider text-white">MIL-ASSET COMMAND</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-medium text-white">{user?.username}</div>
                                <div className="text-xs text-blue-400 font-semibold">{user?.role?.replace('_', ' ')}</div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                                <User className="h-5 w-5 text-slate-300" />
                            </div>
                            <button 
                                onClick={handleLogout}
                                className="ml-4 p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors"
                                title="Secure Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center">
                            Operational Overview
                        </h1>
                        <p className="text-slate-400 mt-1 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {user?.role === 'BASE_COMMANDER' 
                                ? `Filtered for Assigned Base ID: ${user?.baseId}` 
                                : 'Global Asset View across all installations'}
                        </p>
                    </div>
                    
                    {/* Action Buttons (Role Based) */}
                    <div className="mt-4 md:mt-0 flex space-x-3">
                        {canTransfer && (
                            <button 
                                onClick={() => setShowTransferModal(true)}
                                className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600"
                            >
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Initiate Transfer
                            </button>
                        )}
                        {canPurchase && (
                            <button 
                                onClick={() => setShowPurchaseModal(true)}
                                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors border border-blue-500 shadow-lg shadow-blue-900/20"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Record Purchase
                            </button>
                        )}
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard title="Total Asset Types" value="4" icon={<Package />} color="blue" />
                    <MetricCard title="Items in Transit" value="12" icon={<RefreshCcw />} color="yellow" />
                    <MetricCard title="Recent Acquisitions" value="+540" icon={<TrendingUp />} color="green" />
                    <MetricCard title="Critical Shortages" value="0" icon={<TrendingDown />} color="red" />
                </div>

                {/* Dashboard Tabs & Charts */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden mb-8">
                    <div className="border-b border-slate-700 flex">
                        <button 
                            className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'overview' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Inventory Levels
                        </button>
                        <button 
                            className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'activity' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            Recent Audit Logs
                        </button>
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <div>
                                <h3 className="text-lg font-medium text-white mb-6">Current Stock Distribution</h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={inventoryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis dataKey="name" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" />
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                                                itemStyle={{ color: '#60a5fa' }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="stock" fill="#3b82f6" name="Quantity in Stock" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div>
                                <h3 className="text-lg font-medium text-white mb-6 flex items-center">
                                    <Activity className="h-5 w-5 mr-2 text-blue-500" />
                                    System Audit Trail
                                </h3>
                                <div className="space-y-4">
                                    {recentActivity.map((log) => (
                                        <div key={log.id} className="flex p-4 rounded-lg bg-slate-900 border border-slate-700 items-start">
                                            <div className={`mt-1 h-2 w-2 rounded-full mr-4 ${log.action === 'PURCHASE' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-white">{log.details}</p>
                                                <p className="text-xs text-slate-500 mt-1">{log.time} • Action: {log.action}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 text-center">
                                    <button className="text-sm text-blue-400 hover:text-blue-300">View Full Audit Log →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modals */}
            {showPurchaseModal && (
                <PurchaseModal onClose={() => setShowPurchaseModal(false)} />
            )}
            {showTransferModal && (
                <TransferModal onClose={() => setShowTransferModal(false)} />
            )}

        </div>
    );
};

// ==========================================
// 5. HELPER COMPONENTS & MODALS
// ==========================================

const MetricCard = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        green: 'text-green-500 bg-green-500/10 border-green-500/20',
        yellow: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
    };

    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg flex items-center">
            <div className={`p-4 rounded-lg border ${colorClasses[color]} mr-5`}>
                {React.cloneElement(icon, { className: 'h-6 w-6' })}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    );
};

// Form Modals for Actions
const ModalBase = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    ✕
                </button>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    </div>
);

const PurchaseModal = ({ onClose }) => {
    const [formData, setFormData] = useState({ baseId: '1', equipmentTypeId: '1', quantity: '' });
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: 'loading', message: 'Processing purchase...' });
        
        try {
            await axios.post(`${API_URL}/inventory/purchase`, {
                baseId: parseInt(formData.baseId),
                equipmentTypeId: parseInt(formData.equipmentTypeId),
                quantity: parseInt(formData.quantity)
            });
            setStatus({ type: 'success', message: 'Purchase recorded successfully!' });
            setTimeout(onClose, 1500);
        } catch (error) {
            setStatus({ 
                type: 'error', 
                message: error.response?.data?.message || 'Failed to record purchase.' 
            });
        }
    };

    return (
        <ModalBase title="Record New Asset Purchase" onClose={onClose}>
            {status.message && (
                <div className={`p-3 rounded mb-4 text-sm ${
                    status.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-500' :
                    status.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-500' :
                    'bg-blue-900/50 text-blue-200 border border-blue-500'
                }`}>
                    {status.message}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Destination Base</label>
                    <select 
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                        value={formData.baseId}
                        onChange={(e) => setFormData({...formData, baseId: e.target.value})}
                    >
                        <option value="1">Fort Alpha</option>
                        <option value="2">Camp Bravo</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Equipment Type</label>
                    <select 
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                        value={formData.equipmentTypeId}
                        onChange={(e) => setFormData({...formData, equipmentTypeId: e.target.value})}
                    >
                        <option value="1">M4 Carbine (Weapon)</option>
                        <option value="2">Humvee (Vehicle)</option>
                        <option value="3">5.56mm Ammo (Ammunition)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
                    <input 
                        type="number" 
                        required 
                        min="1"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        placeholder="Enter quantity"
                    />
                </div>
                <div className="pt-4 flex space-x-3">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={status.type === 'loading'}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                    >
                        Confirm Purchase
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

const TransferModal = ({ onClose }) => {
    const [formData, setFormData] = useState({ sourceBaseId: '1', destinationBaseId: '2', equipmentTypeId: '1', quantity: '' });
    const [status, setStatus] = useState({ type: '', message: '' });
    
    // Automatically restrict Source Base if user is a Base Commander
    const user = getCurrentUser();
    const isCommander = user?.role === 'BASE_COMMANDER';
    
    useEffect(() => {
        if (isCommander && user?.baseId) {
            setFormData(prev => ({ ...prev, sourceBaseId: user.baseId.toString() }));
        }
    }, [isCommander, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.sourceBaseId === formData.destinationBaseId) {
             setStatus({ type: 'error', message: 'Source and destination bases cannot be the same.' });
             return;
        }

        setStatus({ type: 'loading', message: 'Processing transfer...' });
        
        try {
            await axios.post(`${API_URL}/inventory/transfer`, {
                sourceBaseId: parseInt(formData.sourceBaseId),
                destinationBaseId: parseInt(formData.destinationBaseId),
                equipmentTypeId: parseInt(formData.equipmentTypeId),
                quantity: parseInt(formData.quantity)
            });
            setStatus({ type: 'success', message: 'Transfer initiated successfully!' });
            setTimeout(onClose, 1500);
        } catch (error) {
            setStatus({ 
                type: 'error', 
                message: error.response?.data?.message || error.response?.data?.error || 'Failed to initiate transfer.' 
            });
        }
    };

    return (
        <ModalBase title="Initiate Asset Transfer" onClose={onClose}>
            {status.message && (
                <div className={`p-3 rounded mb-4 text-sm ${
                    status.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-500' :
                    status.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-500' :
                    'bg-blue-900/50 text-blue-200 border border-blue-500'
                }`}>
                    {status.message}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex space-x-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-300 mb-1">From (Source)</label>
                        <select 
                            className={`w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500 ${isCommander ? 'opacity-70 cursor-not-allowed' : ''}`}
                            value={formData.sourceBaseId}
                            onChange={(e) => setFormData({...formData, sourceBaseId: e.target.value})}
                            disabled={isCommander} // Commander can only transfer from their own base
                        >
                            <option value="1">Fort Alpha</option>
                            <option value="2">Camp Bravo</option>
                        </select>
                        {isCommander && <p className="text-xs text-slate-500 mt-1">Locked to assigned base</p>}
                    </div>
                    <div className="flex items-end pb-2 justify-center px-2">
                        <ArrowRightLeft className="text-slate-500 h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-300 mb-1">To (Destination)</label>
                        <select 
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                            value={formData.destinationBaseId}
                            onChange={(e) => setFormData({...formData, destinationBaseId: e.target.value})}
                        >
                            <option value="1">Fort Alpha</option>
                            <option value="2">Camp Bravo</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Equipment Type</label>
                    <select 
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                        value={formData.equipmentTypeId}
                        onChange={(e) => setFormData({...formData, equipmentTypeId: e.target.value})}
                    >
                        <option value="1">M4 Carbine (Weapon)</option>
                        <option value="2">Humvee (Vehicle)</option>
                        <option value="3">5.56mm Ammo (Ammunition)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Transfer Quantity</label>
                    <input 
                        type="number" 
                        required 
                        min="1"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        placeholder="Enter amount to transfer"
                    />
                </div>
                
                <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-md mt-2">
                    <p className="text-xs text-yellow-500 flex items-start">
                        <span className="font-bold mr-1">Note:</span> 
                        This action will be securely logged in the audit trail under your credentials.
                    </p>
                </div>

                <div className="pt-4 flex space-x-3">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={status.type === 'loading'}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                    >
                        Submit Transfer
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

// ==========================================
// 6. UNAUTHORIZED PAGE
// ==========================================
const Unauthorized = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-center px-4">
        <div className="max-w-md w-full">
            <Shield className="mx-auto h-20 w-20 text-red-500 mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-slate-400 mb-8">
                Your current clearance level does not permit access to this sector. 
                This incident has been logged.
            </p>
            <button 
                onClick={() => window.history.back()}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600"
            >
                Return to Previous
            </button>
        </div>
    </div>
);

// ==========================================
// 7. MAIN APP COMPONENT & ROUTING
// ==========================================
function App() {
    return (
        <Router>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />
                
                {/* Protected Routes */}
                <Route 
                    path="/" 
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } 
                />
                
                {/* Error/Feedback Routes */}
                <Route path="/unauthorized" element={<Unauthorized />} />
                
                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;