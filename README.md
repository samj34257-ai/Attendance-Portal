# ⚡ PC-Only Work Presence PWA & Workforce Management System

A lightweight, PC-Only Progressive Web App (PWA) and Admin Portal for tracking employee work presence during fixed night shifts (Default: `08:30 PM` - `04:30 AM`).

---

## 🔑 System Credentials

- **Admin Dashboard Password**: `admin987654321`
- **Port**: `9000` (Frontend PWA) / `9001` (Backend Express API)

---

## ✨ Features

- **🔒 Password Protected Admin Panel**: Manage workforce, create employee accounts with passwords, view live presence, and inspect monthly reports.
- **👥 Dynamic Employee Management**: 0 dummy data pre-seeded. Admin creates employee accounts on demand.
- **📱 PWA & Desktop Installable**: Includes Service Worker & Web App Manifest. Can be installed directly to Windows Taskbar.
- **🛡️ PC-Only Enforcement**: Automatically blocks mobile and tablet devices.
- **⏰ Shift Window Validation**: Restricts Clock-In to allowed shift hours (Default: `08:30 PM` to `04:30 AM`).
- **📊 Monthly Analytics**: View monthly attendance totals, active hours, late days, and auto-leave records per employee.
- **🌐 Vercel Live Ready**: Includes `vercel.json` and `api/index.js` serverless function handlers.

---

## 🚀 Quick Start (Local Setup)

```bash
# 1. Navigate to the web folder
cd web

# 2. Install dependencies
npm install

# 3. Start Backend & Dev Server
node server.js   # Runs on port 9001
npm run dev      # Runs PWA on port 9000
```

Open **http://localhost:9000** in your browser.

---

## 🐙 Git Deployment Commands

To push this repository manually to GitHub or GitLab:

```bash
# Initialize repository (if not already done)
git init

# Stage all project files
git add .

# Commit changes
git commit -m "Initial Release: PC-Only Work Presence PWA with Admin Security"

# Link your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# Set main branch and push
git branch -M main
git push -u origin main
```

---

## ☁️ Vercel Deployment

1. Push code to GitHub repository.
2. Go to [Vercel.com](https://vercel.com) -> **Add New Project**.
3. Select root directory as `web`.
4. Click **Deploy**. Vercel will host both your PWA client and serverless API endpoints live!
