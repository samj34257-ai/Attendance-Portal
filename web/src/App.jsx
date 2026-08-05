import React, { useState, useEffect } from 'react';
import {
  Clock,
  Laptop,
  Moon,
  ShieldCheck,
  Activity,
  UserCheck,
  UserX,
  Coffee,
  RefreshCw,
  LogIn,
  LogOut,
  Users,
  Calendar,
  Wifi,
  Radio,
  Server,
  Zap,
  Lock,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  Smartphone,
  Sliders,
  CheckCircle,
  FileText,
  Key
} from 'lucide-react';

export default function App() {
  // URL Hash-based Routing (#portal vs #admin)
  const getTabFromHash = () => {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#admin' || window.location.pathname.startsWith('/admin')) return 'admin';
    return 'pwa';
  };

  const [activeTab, setActiveTab] = useState(getTabFromHash);

  const switchTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab === 'admin' ? 'admin' : 'portal';
  };

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState(null);

  // Admin Auth state
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(true);
  const [adminAuthError, setAdminAuthError] = useState('');

  // Global Settings state
  const [settings, setSettings] = useState({ shiftStart: '20:30', shiftEnd: '04:30', enforceShiftWindow: true });

  // Employee Authentication State
  const [employees, setEmployees] = useState([]);
  const [empLoginId, setEmpLoginId] = useState('');
  const [empLoginPass, setEmpLoginPass] = useState('');
  const [empAuthError, setEmpAuthError] = useState('');
  const [currentEmp, setCurrentEmp] = useState(null);
  
  // Work session state
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState('NOT ACTIVE');
  const [heartbeatSeconds, setHeartbeatSeconds] = useState(30);
  const [isBreak, setIsBreak] = useState(false);

  // Admin - New Employee Modal Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpForm, setNewEmpForm] = useState({ name: '', id: '', password: '', dept: 'Engineering', email: '', shiftStart: '20:30', shiftEnd: '04:30' });

  // Admin - Sub Tabs
  const [adminSubTab, setAdminSubTab] = useState('live'); // 'live', 'monthly', 'settings'
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [monthlyReportData, setMonthlyReportData] = useState([]);
  const [showPwaGuideModal, setShowPwaGuideModal] = useState(false);

  // 12-Hour Time Formatter (e.g., 20:30 -> 08:30 PM)
  const formatTime12 = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // PC-Only Check
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isDesktopOS = /windows|macintosh|mac os x|linux/i.test(ua) && !/android|iphone|ipad/i.test(ua);
    const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    
    if (isMobileUA && !isDesktopOS) {
      setIsMobileDevice(true);
    } else {
      setIsMobileDevice(false);
    }
  }, []);

  // PWA Install Prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Fetch Settings & Employees
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data);
      
      // Update current logged in employee state if modified
      if (currentEmp) {
        const updated = data.find(e => e.id === currentEmp.id);
        if (updated) setCurrentEmp(updated);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchEmployees();
    const interval = setInterval(fetchEmployees, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Monthly Report
  const fetchMonthlyReport = async (monthStr) => {
    try {
      const res = await fetch(`/api/admin/monthly-report?month=${monthStr}`);
      const data = await res.json();
      setMonthlyReportData(data.report || []);
    } catch (err) {
      console.error('Failed to fetch monthly report:', err);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated && adminSubTab === 'monthly') {
      fetchMonthlyReport(selectedMonth);
    }
  }, [isAdminAuthenticated, adminSubTab, selectedMonth]);

  // Heartbeat loop when employee clocked in
  useEffect(() => {
    let timer;
    if (isClockedIn && currentEmp) {
      timer = setInterval(async () => {
        setHeartbeatSeconds((prev) => {
          if (prev <= 1) {
            fetch('/api/heartbeat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employeeId: currentEmp.id, isBreak })
            })
            .then(res => res.json())
            .then(data => {
              if (data.status) setPresenceStatus(data.status);
            })
            .catch(err => console.error('Heartbeat failed:', err));
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setHeartbeatSeconds(30);
    }
    return () => clearInterval(timer);
  }, [isClockedIn, currentEmp, isBreak]);

  // Admin Login Handler
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPasswordInput })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdminAuthenticated(true);
      } else {
        setAdminAuthError(data.message || 'Invalid password');
      }
    } catch (err) {
      setAdminAuthError('Server error');
    }
  };

  // Employee Login Handler
  const handleEmployeeLogin = async (e) => {
    e.preventDefault();
    setEmpAuthError('');
    try {
      const res = await fetch('/api/employee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empLoginId, password: empLoginPass })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentEmp(data.employee);
        setEmpLoginPass('');
      } else {
        setEmpAuthError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setEmpAuthError('Server login error');
    }
  };

  // Employee Logout Handler
  const handleEmployeeLogout = () => {
    if (isClockedIn) {
      if (!window.confirm('You are clocked in. Logging out will close your active session. Continue?')) return;
      handleClockOut();
    }
    setCurrentEmp(null);
  };

  // Clock In Handler (Enforces Allowed Time Window)
  const handleClockIn = async () => {
    if (!currentEmp) return;
    try {
      const res = await fetch('/api/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmp.id, deviceName: 'Windows PC (Verified PWA)' })
      });
      const data = await res.json();
      if (data.success) {
        setIsClockedIn(true);
        setPresenceStatus('ACTIVE');
        fetchEmployees();
      } else {
        alert(`❌ CLOCK IN DENIED:\n${data.message}`);
      }
    } catch (err) {
      alert('Clock In failed: Server offline');
    }
  };

  // Clock Out Handler
  const handleClockOut = async () => {
    if (!currentEmp) return;
    try {
      await fetch('/api/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmp.id })
      });
      setIsClockedIn(false);
      setIsBreak(false);
      setPresenceStatus('NOT ACTIVE');
      fetchEmployees();
    } catch (err) {
      alert('Clock Out failed');
    }
  };

  // Toggle Break
  const handleToggleBreak = () => {
    const nextBreak = !isBreak;
    setIsBreak(nextBreak);
    setPresenceStatus(nextBreak ? 'BREAK' : 'ACTIVE');
  };

  // Add Employee Handler
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmpForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewEmpForm({ name: '', id: '', password: '', dept: 'Engineering', email: '', shiftStart: settings.shiftStart || '20:30', shiftEnd: settings.shiftEnd || '04:30' });
        fetchEmployees();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error creating employee');
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (empId) => {
    if (!window.confirm(`Are you sure you want to delete employee ${empId}?`)) return;
    try {
      await fetch(`/api/admin/employees/${empId}`, { method: 'DELETE' });
      fetchEmployees();
    } catch (err) {
      alert('Failed to delete employee');
    }
  };

  // Save Global Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        alert('Settings saved successfully!');
      }
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  // Install PWA & Pin to Taskbar
  const handleInstallPWA = () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      pwaPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') setPwaPrompt(null);
      });
    }
    setShowPwaGuideModal(true);
  };

  // PC Only Block Screen
  if (isMobileDevice) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', padding: '2rem', textAlign: 'center', color: '#f3f4f6' }}>
        <div className="card" style={{ maxWidth: '450px', padding: '2.5rem', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
          <Smartphone size={56} color="var(--accent-rose)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--accent-rose)' }}>PC-Only Access Policy</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            This Work Presence PWA is restricted to authorized Desktop PCs only (Windows / macOS / Linux). Mobile and tablet devices are blocked by system policy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <Radio size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="brand-title">PRESENCE PWA</span>
              <span className="brand-tag">PORT 9000</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Server size={12} color="var(--accent-cyan)" />
              <span>Default Shift: <strong style={{ color: 'var(--accent-cyan)' }}>{formatTime12(settings.shiftStart || '20:30')} - {formatTime12(settings.shiftEnd || '04:30')}</strong></span>
            </div>
          </div>
        </div>

        {/* Header Title & Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="brand-tag" style={{ background: activeTab === 'admin' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)', color: activeTab === 'admin' ? 'var(--accent-blue)' : 'var(--text-muted)', cursor: 'pointer' }} onClick={() => switchTab(activeTab === 'admin' ? 'pwa' : 'admin')}>
            {activeTab === 'admin' ? 'ADMIN DASHBOARD' : 'EMPLOYEE PORTAL'}
          </span>
        </div>

        {/* PWA Install & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-secondary" style={{ border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)' }} onClick={handleInstallPWA}>
            <Download size={14} /> Install / Pin PWA
          </button>
          <div className={`status-badge ${isClockedIn ? (isBreak ? 'break' : 'active') : 'inactive'}`}>
            <span className="status-dot"></span>
            <span>{isClockedIn ? (isBreak ? 'BREAK' : 'ACTIVE') : 'OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="main-content">
        {activeTab === 'pwa' ? (
          /* ================= EMPLOYEE PORTAL VIEW ================= */
          !currentEmp ? (
            /* Employee Password Login Form */
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>
              <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.15)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <Key size={32} color="var(--accent-blue)" />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Employee Login</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Enter your assigned Employee ID & Password to access your work portal.
                </p>

                <form onSubmit={handleEmployeeLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Employee ID (e.g. EMP-101)"
                    value={empLoginId}
                    onChange={(e) => setEmpLoginId(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Employee Password"
                    value={empLoginPass}
                    onChange={(e) => setEmpLoginPass(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                  />
                  {empAuthError && (
                    <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}>{empAuthError}</p>
                  )}
                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
                    <LogIn size={18} /> Login to Work Portal
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Logged In Employee Work Session Portal */
            <div className="grid-main">
              {/* Left Card - Employee Profile Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.8rem', borderRadius: '14px' }}>
                        <UserCheck size={28} color="var(--accent-blue)" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{currentEmp.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {currentEmp.id}</p>
                      </div>
                    </div>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={handleEmployeeLogout}>
                      Logout
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                      <span style={{ fontWeight: 500 }}>{currentEmp.dept}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>PC Verification:</span>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <ShieldCheck size={14} /> Registered PC
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Assigned Shift:</span>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {currentEmp.customShiftStart || settings.shiftStart || '20:30'} - {currentEmp.customShiftEnd || settings.shiftEnd || '04:30'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Night Shift Policy Info */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                    <Moon size={20} color="var(--accent-purple)" />
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Shift Rules & Allowed Window</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} color="var(--accent-blue)" />
                      <span>Clock In Allowed Window: <strong>{currentEmp.customShiftStart || settings.shiftStart || '20:30'} to {currentEmp.customShiftEnd || settings.shiftEnd || '04:30'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Coffee size={16} color="var(--accent-amber)" />
                      <span>Scheduled Break: <strong>12:30 AM - 01:00 AM</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Zap size={16} color="var(--accent-rose)" />
                      <span>Heartbeat Timeout: <strong>90 Seconds</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Interactive Clock-In Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card" style={{ background: 'linear-gradient(145deg, rgba(18, 26, 43, 0.8), rgba(15, 23, 42, 0.95))', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: isClockedIn ? (isBreak ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)') : 'rgba(244, 63, 94, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    border: `2px solid ${isClockedIn ? (isBreak ? 'var(--accent-amber)' : 'var(--accent-emerald)') : 'var(--accent-rose)'}`
                  }}>
                    {isClockedIn ? (
                      isBreak ? <Coffee size={48} color="var(--accent-amber)" /> : <Activity size={48} color="var(--accent-emerald)" />
                    ) : (
                      <UserX size={48} color="var(--accent-rose)" />
                    )}
                  </div>

                  <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {isClockedIn ? (isBreak ? 'ON SCHEDULED BREAK' : 'WORK SESSION ACTIVE') : 'NOT CLOCKED IN'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', marginBottom: '2rem' }}>
                    {isClockedIn
                      ? `PWA sending automatic 30s heartbeats to backend.`
                      : `Press Clock In to start your work session. Allowed shift window: ${currentEmp.customShiftStart || settings.shiftStart || '20:30'} - ${currentEmp.customShiftEnd || settings.shiftEnd || '04:30'}`}
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {!isClockedIn ? (
                      <button className="btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.05rem' }} onClick={handleClockIn}>
                        <LogIn size={20} /> CLOCK IN NOW
                      </button>
                    ) : (
                      <>
                        <button className="btn-danger" style={{ padding: '0.9rem 2rem' }} onClick={handleClockOut}>
                          <LogOut size={18} /> CLOCK OUT
                        </button>
                        <button className="btn-secondary" onClick={handleToggleBreak}>
                          <Coffee size={16} color="var(--accent-amber)" />
                          {isBreak ? 'Resume Work' : 'Scheduled Break (12:30 AM)'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isClockedIn && (
                  <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '0.6rem', borderRadius: '10px' }}>
                        <Wifi size={20} color="var(--accent-cyan)" />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Heartbeat Service</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Posting pings to /api/heartbeat</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{heartbeatSeconds}s</span>
                      <RefreshCw size={18} color="var(--text-muted)" style={{ animation: 'spin 3s linear infinite' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          /* ================= ADMIN WORKFORCE DASHBOARD ================= */
          !isAdminAuthenticated ? (
            /* Admin Password Lock Screen */
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>
              <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.15)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <Lock size={32} color="var(--accent-purple)" />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Admin Authentication</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Enter admin security password to manage workforce, settings & monthly data.
                </p>

                <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="password"
                    placeholder="Enter Admin Password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid var(--border-color)',
                      color: 'white',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem'
                    }}
                  />
                  {adminAuthError && (
                    <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem' }}>{adminAuthError}</p>
                  )}
                  <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
                    <LogIn size={18} /> Authenticate Admin
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Admin Authenticated View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="nav-tabs">
                  <button className={`nav-tab-btn ${adminSubTab === 'live' ? 'active' : ''}`} onClick={() => setAdminSubTab('live')}>
                    <Activity size={16} /> Live Status
                  </button>
                  <button className={`nav-tab-btn ${adminSubTab === 'monthly' ? 'active' : ''}`} onClick={() => setAdminSubTab('monthly')}>
                    <FileText size={16} /> Monthly Data Report
                  </button>
                  <button className={`nav-tab-btn ${adminSubTab === 'settings' ? 'active' : ''}`} onClick={() => setAdminSubTab('settings')}>
                    <Sliders size={16} /> Shift & Allowed Windows
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-primary" onClick={() => {
                    setNewEmpForm({ name: '', id: '', password: '', dept: 'Engineering', email: '', shiftStart: settings.shiftStart || '20:30', shiftEnd: settings.shiftEnd || '04:30' });
                    setShowAddModal(true);
                  }}>
                    <Plus size={16} /> Add New Employee
                  </button>
                </div>
              </div>

              {adminSubTab === 'live' ? (
                <>
                  <div className="grid-cols-3">
                    <div className="card metric-card">
                      <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                        <UserCheck size={28} color="var(--accent-emerald)" />
                      </div>
                      <div>
                        <div className="metric-value" style={{ color: 'var(--accent-emerald)' }}>
                          {employees.filter(e => e.status === 'ACTIVE').length}
                        </div>
                        <div className="metric-label">Active Presence</div>
                      </div>
                    </div>

                    <div className="card metric-card">
                      <div className="metric-icon" style={{ background: 'rgba(244, 63, 94, 0.15)' }}>
                        <UserX size={28} color="var(--accent-rose)" />
                      </div>
                      <div>
                        <div className="metric-value" style={{ color: 'var(--accent-rose)' }}>
                          {employees.filter(e => e.status === 'NOT ACTIVE').length}
                        </div>
                        <div className="metric-label">Not Active</div>
                      </div>
                    </div>

                    <div className="card metric-card">
                      <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                        <Coffee size={28} color="var(--accent-amber)" />
                      </div>
                      <div>
                        <div className="metric-value" style={{ color: 'var(--accent-amber)' }}>
                          {employees.filter(e => e.status === 'BREAK').length}
                        </div>
                        <div className="metric-label">Scheduled Break</div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Realtime Employee Workforce ({employees.length})</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Updated live from backend</span>
                    </div>

                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Employee ID & Name</th>
                          <th>Department</th>
                          <th>Shift Window</th>
                          <th>Live Status</th>
                          <th>Last Seen</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                              No employees registered yet. Click <strong>"+ Add New Employee"</strong> above to register your first workforce member.
                            </td>
                          </tr>
                        ) : (
                          employees.map((emp) => (
                            <tr key={emp.id}>
                              <td style={{ fontWeight: 600 }}>
                                <div>{emp.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.id}</div>
                              </td>
                              <td style={{ color: 'var(--text-muted)' }}>{emp.dept}</td>
                              <td>
                                <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                                  {emp.customShiftStart || settings.shiftStart || '20:30'} - {emp.customShiftEnd || settings.shiftEnd || '04:30'}
                                </span>
                              </td>
                              <td>
                                <span className={`status-badge ${emp.status === 'ACTIVE' ? 'active' : (emp.status === 'BREAK' ? 'break' : 'inactive')}`}>
                                  <span className="status-dot"></span>
                                  {emp.status}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{emp.lastSeen || 'Never'}</td>
                              <td>
                                <button
                                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '0.3rem' }}
                                  title="Delete Employee"
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : adminSubTab === 'monthly' ? (
                /* Monthly Analytics */
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Monthly Attendance Analytics</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Historical performance & presence log</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filter Month:</label>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Present Days</th>
                        <th>Late Days</th>
                        <th>Auto Leave Days</th>
                        <th>Total Active Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyReportData.map((item) => (
                        <tr key={item.employeeId}>
                          <td style={{ fontWeight: 600 }}>
                            <div>{item.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.employeeId}</div>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{item.dept}</td>
                          <td>
                            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{item.presentDays} Days</span>
                          </td>
                          <td>
                            <span style={{ color: item.lateDays > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>{item.lateDays} Days</span>
                          </td>
                          <td>
                            <span style={{ color: item.autoLeaveDays > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>{item.autoLeaveDays} Days</span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{item.totalHours} hrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Shift Settings Panel */
                <div className="card" style={{ maxWidth: '600px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Global Shift & Allowed Window Settings</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Configure default allowed Clock In time window for all employees.
                  </p>

                  <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Default Shift Start Time:</label>
                        <input
                          type="time"
                          value={settings.shiftStart}
                          onChange={(e) => setSettings({ ...settings, shiftStart: e.target.value })}
                          style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Default Shift End Time:</label>
                        <input
                          type="time"
                          value={settings.shiftEnd}
                          onChange={(e) => setSettings({ ...settings, shiftEnd: e.target.value })}
                          style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        id="enforceCheck"
                        checked={settings.enforceShiftWindow}
                        onChange={(e) => setSettings({ ...settings, enforceShiftWindow: e.target.checked })}
                      />
                      <label htmlFor="enforceCheck" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                        Strictly enforce allowed Clock-In window (Deny Clock-In outside assigned shift hours)
                      </label>
                    </div>

                    <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                      Save Shift Settings
                    </button>
                  </form>
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* Add New Employee Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.2rem' }}>Create New Employee Account</h3>
            
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Employee ID:</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP-101"
                    value={newEmpForm.id}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, id: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Set Password:</label>
                  <input
                    type="password"
                    required
                    placeholder="Employee Pass"
                    value={newEmpForm.password}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, password: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="Full Employee Name"
                  value={newEmpForm.name}
                  onChange={(e) => setNewEmpForm({ ...newEmpForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Department:</label>
                <input
                  type="text"
                  placeholder="Engineering / Support"
                  value={newEmpForm.dept}
                  onChange={(e) => setNewEmpForm({ ...newEmpForm, dept: e.target.value })}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Custom Shift Start (Optional):</label>
                  <input
                    type="time"
                    value={newEmpForm.shiftStart}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, shiftStart: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Custom Shift End (Optional):</label>
                  <input
                    type="time"
                    value={newEmpForm.shiftEnd}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, shiftEnd: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Create Employee Account
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PWA Guide & Pinning Modal */}
      {showPwaGuideModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.6rem', borderRadius: '12px' }}>
                <Download size={24} color="var(--accent-blue)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Install App & Pin to Taskbar</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Follow these 2 quick steps in Chrome or Edge</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--accent-blue)', display: 'block', marginBottom: '0.3rem' }}>Step 1: Install PWA App</strong>
                <span>Click the <strong>Install</strong> icon in your browser's address bar (top right corner in Chrome/Edge) OR click browser menu (⋮) → <strong>"Install PC Work Presence"</strong>.</span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--accent-emerald)', display: 'block', marginBottom: '0.3rem' }}>Step 2: Pin to Windows Taskbar</strong>
                <span>Once installed, launch the app from your Desktop or Start Menu. <strong>Right-click</strong> the app icon on your Windows Taskbar at the bottom and select <strong style={{ color: 'var(--accent-emerald)' }}>"Pin to Taskbar"</strong>!</span>
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowPwaGuideModal(false)}>
              Got It!
            </button>
          </div>
        </div>
      )}

      {/* Stealth Footer with Hidden Admin Lock Icon */}
      <footer style={{ marginTop: '3rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>© 2026 PC Work Presence Portal</span>
        <button 
          title="Console" 
          style={{ background: 'transparent', border: 'none', color: activeTab === 'admin' ? 'var(--accent-blue)' : 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem', opacity: 0.35, transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.35'}
          onClick={() => switchTab(activeTab === 'admin' ? 'pwa' : 'admin')}
        >
          <Lock size={13} />
        </button>
      </footer>
    </div>
  );
}
