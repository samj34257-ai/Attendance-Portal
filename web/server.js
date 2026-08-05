import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 9001;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Security: Dynamic Admin Password from Environment Variable
const getAdminPassword = () => process.env.ADMIN_PASSWORD || 'admin987654321';

// Supabase Integration Check
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

if (isSupabaseConfigured) {
  console.log('[Database] Supabase Postgres connected successfully!');
} else {
  console.log('[Database] Running local file database (db.json). Set SUPABASE_URL & SUPABASE_KEY in .env for cloud database.');
}

const defaultDb = {
  adminPassword: getAdminPassword(),
  settings: {
    shiftStart: '20:30',
    shiftEnd: '04:30',
    enforceShiftWindow: true
  },
  employees: [],
  sessions: []
};

// Local DB Helpers
function readLocalDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
      return defaultDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return defaultDb;
  }
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing local db.json:', err);
  }
}

// 90s Inactive Heartbeat Worker
setInterval(async () => {
  if (isSupabaseConfigured) {
    try {
      const nowMs = Date.now();
      const { data: activeEmps } = await supabase.from('employees').select('*').eq('status', 'ACTIVE');
      if (activeEmps && activeEmps.length > 0) {
        for (const emp of activeEmps) {
          if (emp.last_seen && nowMs - new Date(emp.last_seen).getTime() > 90000) {
            await supabase.from('employees').update({ status: 'NOT ACTIVE' }).eq('id', emp.id);
          }
        }
      }
    } catch (e) {
      console.error('Heartbeat worker Supabase error:', e.message);
    }
  } else {
    const db = readLocalDb();
    const now = Date.now();
    let updated = false;
    db.employees.forEach((emp) => {
      if (emp.status === 'ACTIVE' && emp.lastSeenTimestamp) {
        if (now - emp.lastSeenTimestamp > 90000) {
          emp.status = 'NOT ACTIVE';
          updated = true;
        }
      }
    });
    if (updated) writeLocalDb(db);
  }
}, 10000);

/* ================= API ROUTES ================= */

// Get Settings
app.get('/api/settings', async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (data) {
        return res.json({
          shiftStart: data.shift_start || '20:30',
          shiftEnd: data.shift_end || '04:30',
          enforceShiftWindow: data.enforce_shift_window !== false
        });
      }
    } catch (e) {}
  }
  const db = readLocalDb();
  res.json(db.settings || defaultDb.settings);
});

// Update Settings (Admin action)
app.post('/api/admin/settings', async (req, res) => {
  const { shiftStart, shiftEnd, enforceShiftWindow } = req.body;
  
  if (isSupabaseConfigured) {
    try {
      await supabase.from('settings').upsert({
        id: 1,
        shift_start: shiftStart || '20:30',
        shift_end: shiftEnd || '04:30',
        enforce_shift_window: enforceShiftWindow !== false
      });
      return res.json({ success: true, settings: { shiftStart, shiftEnd, enforceShiftWindow } });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = readLocalDb();
  db.settings = {
    shiftStart: shiftStart || '20:30',
    shiftEnd: shiftEnd || '04:30',
    enforceShiftWindow: enforceShiftWindow !== false
  };
  writeLocalDb(db);
  res.json({ success: true, settings: db.settings });
});

// Admin Auth (Checks env variable process.env.ADMIN_PASSWORD)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const currentAdminPass = getAdminPassword();
  if (password === currentAdminPass) {
    return res.json({ success: true, message: 'Admin authenticated' });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin password' });
});

// Employee Login (ID + Password)
app.post('/api/employee/login', async (req, res) => {
  const { employeeId, password } = req.body;

  if (isSupabaseConfigured) {
    try {
      const { data: emp, error } = await supabase.from('employees').select('*').ilike('id', employeeId || '').single();
      if (error || !emp) return res.status(404).json({ success: false, message: 'Employee ID not found' });
      if (emp.password && emp.password !== password) {
        return res.status(401).json({ success: false, message: 'Incorrect employee password' });
      }
      return res.json({ success: true, employee: emp });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = readLocalDb();
  const emp = db.employees.find(e => e.id.toLowerCase() === (employeeId || '').toLowerCase());
  if (!emp) return res.status(404).json({ success: false, message: 'Employee ID not found' });
  if (emp.password && emp.password !== password) {
    return res.status(401).json({ success: false, message: 'Incorrect employee password' });
  }
  res.json({ success: true, employee: emp });
});

// Get all employees
app.get('/api/employees', async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: true });
      return res.json(data || []);
    } catch (e) {
      return res.status(500).json([]);
    }
  }
  const db = readLocalDb();
  res.json(db.employees);
});

// Create Employee (Admin action)
app.post('/api/admin/employees', async (req, res) => {
  const { name, id, password, dept, email, shiftStart, shiftEnd } = req.body;
  if (!name || !id || !password) {
    return res.status(400).json({ success: false, message: 'Name, ID & Password required' });
  }

  if (isSupabaseConfigured) {
    try {
      const { data: existing } = await supabase.from('employees').select('id').eq('id', id).maybeSingle();
      if (existing) return res.status(400).json({ success: false, message: 'Employee ID already exists' });

      const newEmp = {
        id,
        name,
        password,
        dept: dept || 'Engineering',
        email: email || `${id.toLowerCase()}@company.com`,
        status: 'NOT ACTIVE',
        registered_device: 'PC Authorized',
        shift_start: shiftStart || '20:30',
        shift_end: shiftEnd || '04:30'
      };

      const { error } = await supabase.from('employees').insert([newEmp]);
      if (error) return res.status(500).json({ success: false, message: error.message });
      return res.json({ success: true, employee: newEmp });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = readLocalDb();
  if (db.employees.some(e => e.id.toLowerCase() === id.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Employee ID already exists' });
  }

  const newEmp = {
    id,
    name,
    password,
    dept: dept || 'Engineering',
    email: email || `${id.toLowerCase()}@company.com`,
    status: 'NOT ACTIVE',
    lastSeen: null,
    registeredDevice: 'PC Authorized',
    customShiftStart: shiftStart || null,
    customShiftEnd: shiftEnd || null
  };

  db.employees.push(newEmp);
  writeLocalDb(db);
  res.json({ success: true, employee: newEmp });
});

// Delete Employee
app.delete('/api/admin/employees/:id', async (req, res) => {
  const { id } = req.params;
  if (isSupabaseConfigured) {
    try {
      await supabase.from('employees').delete().eq('id', id);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = readLocalDb();
  db.employees = db.employees.filter((e) => e.id !== id);
  writeLocalDb(db);
  res.json({ success: true });
});

// Clock In
app.post('/api/clock-in', async (req, res) => {
  const { employeeId } = req.body;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const todayStr = now.toISOString().split('T')[0];

  if (isSupabaseConfigured) {
    try {
      const { data: emp } = await supabase.from('employees').select('*').eq('id', employeeId).single();
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

      await supabase.from('employees').update({ status: 'ACTIVE', last_seen: now.toISOString() }).eq('id', employeeId);

      const sessId = `sess-${Date.now()}`;
      await supabase.from('sessions').insert([{
        id: sessId,
        employee_id: employeeId,
        work_date: todayStr,
        clock_in: timeStr,
        status: 'PRESENT',
        active_minutes: 0
      }]);

      return res.json({ success: true, employee: emp });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = readLocalDb();
  const emp = db.employees.find((e) => e.id === employeeId);
  if (!emp) return res.status(404).json({ success: false, message: 'Employee ID not found' });

  emp.status = 'ACTIVE';
  emp.lastSeen = 'Just now';
  emp.lastSeenTimestamp = Date.now();

  let activeSess = db.sessions.find((s) => s.employeeId === employeeId && s.workDate === todayStr && !s.clockOut);
  if (!activeSess) {
    activeSess = {
      id: `sess-${Date.now()}`,
      employeeId,
      workDate: todayStr,
      clockIn: timeStr,
      clockOut: null,
      status: 'PRESENT',
      activeMinutes: 0
    };
    db.sessions.push(activeSess);
  }

  writeLocalDb(db);
  res.json({ success: true, employee: emp, session: activeSess });
});

// Clock Out
app.post('/api/clock-out', async (req, res) => {
  const { employeeId } = req.body;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isSupabaseConfigured) {
    try {
      await supabase.from('employees').update({ status: 'NOT ACTIVE', last_seen: null }).eq('id', employeeId);
      await supabase.from('sessions').update({ clock_out: timeStr }).eq('employee_id', employeeId).is('clock_out', null);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  const db = readLocalDb();
  const emp = db.employees.find((e) => e.id === employeeId);
  if (emp) {
    emp.status = 'NOT ACTIVE';
    emp.lastSeen = 'Clocked out';
    emp.lastSeenTimestamp = null;
  }
  const activeSess = db.sessions.find((s) => s.employeeId === employeeId && !s.clockOut);
  if (activeSess) {
    activeSess.clockOut = timeStr;
  }

  writeLocalDb(db);
  res.json({ success: true });
});

// Heartbeat
app.post('/api/heartbeat', async (req, res) => {
  const { employeeId, isBreak } = req.body;
  const status = isBreak ? 'BREAK' : 'ACTIVE';
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      await supabase.from('employees').update({ status, last_seen: nowIso }).eq('id', employeeId);
      return res.json({ success: true, status });
    } catch (e) {
      return res.status(500).json({ success: false });
    }
  }

  const db = readLocalDb();
  const emp = db.employees.find((e) => e.id === employeeId);
  if (emp) {
    emp.status = status;
    emp.lastSeen = 'Just now';
    emp.lastSeenTimestamp = Date.now();
    writeLocalDb(db);
  }
  res.json({ success: true, status: emp ? emp.status : 'NOT ACTIVE' });
});

// Monthly Attendance Report
app.get('/api/admin/monthly-report', async (req, res) => {
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  if (isSupabaseConfigured) {
    try {
      const { data: emps } = await supabase.from('employees').select('*');
      const { data: sessions } = await supabase.from('sessions').select('*');

      const filteredSessions = (sessions || []).filter(s => String(s.work_date).startsWith(targetMonth));

      const report = (emps || []).map(emp => {
        const empSessions = filteredSessions.filter(s => s.employee_id === emp.id);
        const presentDays = empSessions.filter(s => s.status === 'PRESENT' || s.status === 'LATE').length;
        const lateDays = empSessions.filter(s => s.status === 'LATE').length;
        const autoLeaveDays = empSessions.filter(s => s.status === 'AUTO LEAVE').length;
        const totalMinutes = empSessions.reduce((acc, s) => acc + (s.active_minutes || 0), 0);

        return {
          employeeId: emp.id,
          name: emp.name,
          dept: emp.dept,
          presentDays,
          lateDays,
          autoLeaveDays,
          totalHours: (totalMinutes / 60).toFixed(1),
          sessions: empSessions
        };
      });

      return res.json({ month: targetMonth, report });
    } catch (e) {
      return res.status(500).json({ month: targetMonth, report: [] });
    }
  }

  const db = readLocalDb();
  const filteredSessions = db.sessions.filter((s) => s.workDate.startsWith(targetMonth));

  const report = db.employees.map((emp) => {
    const empSessions = filteredSessions.filter((s) => s.employeeId === emp.id);
    const presentDays = empSessions.filter((s) => s.status === 'PRESENT' || s.status === 'LATE').length;
    const lateDays = empSessions.filter((s) => s.status === 'LATE').length;
    const autoLeaveDays = empSessions.filter((s) => s.status === 'AUTO LEAVE').length;
    const totalMinutes = empSessions.reduce((acc, s) => acc + (s.activeMinutes || 0), 0);

    return {
      employeeId: emp.id,
      name: emp.name,
      dept: emp.dept,
      presentDays,
      lateDays,
      autoLeaveDays,
      totalHours: (totalMinutes / 60).toFixed(1),
      sessions: empSessions
    };
  });

  res.json({ month: targetMonth, report });
});

app.listen(PORT, () => {
  console.log(`Backend Express server listening on http://localhost:${PORT}`);
});
