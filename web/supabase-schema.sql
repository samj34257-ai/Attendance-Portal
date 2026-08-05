-- ===================================================
-- Supabase PostgreSQL 3-Table Schema for Work Presence PWA
-- Paste and Run this in your Supabase SQL Editor
-- ===================================================

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    dept VARCHAR(100) DEFAULT 'Engineering',
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'NOT ACTIVE',
    last_seen TIMESTAMP WITH TIME ZONE,
    registered_device VARCHAR(255) DEFAULT 'PC Authorized',
    shift_start VARCHAR(20) DEFAULT '20:30',
    shift_end VARCHAR(20) DEFAULT '04:30',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(100) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    clock_in VARCHAR(50),
    clock_out VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PRESENT',
    active_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    shift_start VARCHAR(20) DEFAULT '20:30',
    shift_end VARCHAR(20) DEFAULT '04:30',
    enforce_shift_window BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Settings Row if not exists
INSERT INTO settings (id, shift_start, shift_end, enforce_shift_window)
VALUES (1, '20:30', '04:30', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) policies (Allowing service key / anon access)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write access to employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access to sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access to settings" ON settings FOR ALL USING (true) WITH CHECK (true);
