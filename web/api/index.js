import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

// Handle Vercel URL prefix stripping if necessary
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  next();
});

const getAdminPassword = () => process.env.ADMIN_PASSWORD || 'admin987654321';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_sds_SUPABASE_URL || process.env.sds_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.sds_SUPABASE_SERVICE_ROLE_KEY || process.env.sds_SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_sds_SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

let memoryDb = {
  adminPassword: getAdminPassword(),
  settings: { shiftStart: '20:30', shiftEnd: '04:30', enforceShiftWindow: true },
  employees: [],
  sessions: []
};

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (data) return res.json({ shiftStart: data.shift_start || '20:30', shiftEnd: data.shift_end || '04:30', enforceShiftWindow: data.enforce_shift_window !== false });
    }
  } catch (e) {}
  res.json(memoryDb.settings);
});

app.post('/api/admin/settings', async (req, res) => {
  try {
    const { shiftStart, shiftEnd, enforceShiftWindow } = req.body || {};
    if (isSupabaseConfigured) {
      await supabase.from('settings').upsert({ id: 1, shift_start: shiftStart || '20:30', shift_end: shiftEnd || '04:30', enforce_shift_window: enforceShiftWindow !== false });
      return res.json({ success: true });
    }
    memoryDb.settings = { shiftStart, shiftEnd, enforceShiftWindow };
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Auth
app.post('/api/admin/login', (req, res) => {
  try {
    const { password } = req.body || {};
    const adminPass = getAdminPassword();
    if (password === adminPass) {
      return res.json({ success: true, message: 'Admin authenticated' });
    }
    return res.status(401).json({ success: false, message: 'Invalid admin password' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Employee Login
app.post('/api/employee/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body || {};
    if (isSupabaseConfigured) {
      const { data: emp, error } = await supabase.from('employees').select('*').ilike('id', employeeId || '').maybeSingle();
      if (error || !emp) return res.status(404).json({ success: false, message: 'Employee ID not found' });
      if (emp.password && emp.password !== password) return res.status(401).json({ success: false, message: 'Incorrect password' });
      return res.json({ success: true, employee: emp });
    }
    const emp = memoryDb.employees.find(e => e.id.toLowerCase() === (employeeId || '').toLowerCase());
    if (!emp) return res.status(404).json({ success: false, message: 'Employee ID not found' });
    if (emp.password && emp.password !== password) return res.status(401).json({ success: false, message: 'Incorrect password' });
    res.json({ success: true, employee: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Employees List
app.get('/api/employees', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: true });
      return res.json(data || []);
    }
  } catch (e) {}
  res.json(memoryDb.employees);
});

// Add Employee
app.post('/api/admin/employees', async (req, res) => {
  try {
    const { name, id, password, dept, email, shiftStart, shiftEnd } = req.body || {};
    if (!name || !id || !password) return res.status(400).json({ success: false, message: 'Name, ID & Password required' });

    if (isSupabaseConfigured) {
      const newEmp = { id, name, password, dept: dept || 'Engineering', email: email || '', status: 'NOT ACTIVE', registered_device: 'PC Authorized', shift_start: shiftStart || '20:30', shift_end: shiftEnd || '04:30' };
      const { error } = await supabase.from('employees').insert([newEmp]);
      if (error) return res.status(400).json({ success: false, message: error.message });
      return res.json({ success: true, employee: newEmp });
    }

    const newEmp = { id, name, password, dept: dept || 'Engineering', email: email || '', status: 'NOT ACTIVE', registeredDevice: 'PC Authorized', customShiftStart: shiftStart || null, customShiftEnd: shiftEnd || null };
    memoryDb.employees.push(newEmp);
    res.json({ success: true, employee: newEmp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Employee
app.delete('/api/admin/employees/:id', async (req, res) => {
  try {
    if (isSupabaseConfigured) {
      await supabase.from('employees').delete().eq('id', req.params.id);
      return res.json({ success: true });
    }
    memoryDb.employees = memoryDb.employees.filter(e => e.id !== req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clock In
app.post('/api/clock-in', async (req, res) => {
  try {
    const { employeeId } = req.body || {};
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toISOString().split('T')[0];

    if (isSupabaseConfigured) {
      const { data: emp } = await supabase.from('employees').select('*').eq('id', employeeId).maybeSingle();
      await supabase.from('employees').update({ status: 'ACTIVE', last_seen: now.toISOString() }).eq('id', employeeId);
      await supabase.from('sessions').insert([{ id: `sess-${Date.now()}`, employee_id: employeeId, work_date: todayStr, clock_in: timeStr, status: 'PRESENT', active_minutes: 0 }]);
      return res.json({ success: true, employee: emp });
    }

    const emp = memoryDb.employees.find(e => e.id === employeeId);
    if (emp) emp.status = 'ACTIVE';
    res.json({ success: true, employee: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clock Out
app.post('/api/clock-out', async (req, res) => {
  try {
    const { employeeId } = req.body || {};
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isSupabaseConfigured) {
      await supabase.from('employees').update({ status: 'NOT ACTIVE', last_seen: null }).eq('id', employeeId);
      await supabase.from('sessions').update({ clock_out: timeStr }).eq('employee_id', employeeId).is('clock_out', null);
      return res.json({ success: true });
    }

    const emp = memoryDb.employees.find(e => e.id === employeeId);
    if (emp) emp.status = 'NOT ACTIVE';
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Heartbeat
app.post('/api/heartbeat', async (req, res) => {
  try {
    const { employeeId, isBreak } = req.body || {};
    const status = isBreak ? 'BREAK' : 'ACTIVE';
    if (isSupabaseConfigured) {
      await supabase.from('employees').update({ status, last_seen: new Date().toISOString() }).eq('id', employeeId);
      return res.json({ success: true, status });
    }
    const emp = memoryDb.employees.find(e => e.id === employeeId);
    if (emp) emp.status = status;
    res.json({ success: true, status: emp ? emp.status : 'NOT ACTIVE' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Monthly report
app.get('/api/admin/monthly-report', async (req, res) => {
  try {
    const { month } = req.query || {};
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    if (isSupabaseConfigured) {
      const { data: emps } = await supabase.from('employees').select('*');
      const { data: sessions } = await supabase.from('sessions').select('*');
      const filteredSessions = (sessions || []).filter(s => String(s.work_date).startsWith(targetMonth));

      const report = (emps || []).map(emp => {
        const empSessions = filteredSessions.filter(s => s.employee_id === emp.id);
        const presentDays = empSessions.filter(s => s.status === 'PRESENT' || s.status === 'LATE').length;
        const lateDays = empSessions.filter(s => s.status === 'LATE').length;
        const autoLeaveDays = empSessions.filter(s => s.status === 'AUTO LEAVE').length;
        const totalMinutes = empSessions.reduce((acc, s) => acc + (s.active_minutes || 0), 0);
        return { employeeId: emp.id, name: emp.name, dept: emp.dept, presentDays, lateDays, autoLeaveDays, totalHours: (totalMinutes / 60).toFixed(1), sessions: empSessions };
      });
      return res.json({ month: targetMonth, report });
    }

    res.json({ month: targetMonth, report: [] });
  } catch (err) {
    res.status(500).json({ month: req.query?.month || '', report: [] });
  }
});

export default app;
