# Dissanayake Enterprise (Pvt) Ltd – Seirra Cables

Distributor ERP built for **Dissanayake Enterprise (Pvt) Ltd – Seirra Cables**.

**Business Address:** 9 Cannel, Mahanilubewa, Hidogama, Anuradhapura, Sri Lanka  
**Contact:** +94 77 777 9548  
**Email:** Dissanayakenr@gmail.com

Cloud-ready, offline-first ERP for wholesale distribution — web ERP, Android mobile app, live GPS tracking, fleet management, and QR-based customer visit verification.

## Estimated Scope

- **25+ Core Modules**
- **350+ Business Features**
- **Android Mobile Application**
- **Enterprise Web ERP**
- **Offline-First Architecture**
- **Real-Time GPS Tracking**
- **QR-Based Customer Visit Verification**
- **Fleet Management**
- **Enterprise-Grade Security**
- **Cloud-Ready Scalable Architecture**

---

## Features

### Core System

- Enterprise Web ERP
- Android Mobile Application
- Responsive Design
- Multi-User Access
- Role-Based Access Control (RBAC)
- Multi-Branch Support
- Dashboard & Business Analytics

### Customer Management

- Customer Registration
- Customer Categories
- Customer Credit Management
- Customer Statements
- Customer Outstanding Tracking
- Customer Route Assignment
- Customer QR Code Management

### Supplier Management

- Supplier Registration
- Purchase History
- Supplier Payments
- Supplier Statements

### Product & Inventory

- Product Management
- Categories & Brands
- Barcode & QR Code Support
- Multi-Warehouse Management
- Real-Time Inventory
- Stock Transfers
- Stock Adjustments
- Batch & Serial Number Tracking
- Low Stock Alerts

### Purchasing

- Purchase Orders
- Goods Received Notes (GRN)
- Purchase Returns
- Supplier Invoice Management

### Sales

- Quotations
- Sales Orders
- Sales Invoices
- Delivery Notes
- Sales Returns
- Discounts & Promotions

### Finance

- Customer Payments
- Supplier Payments
- Cash Book
- Bank Transactions
- Cheque Management
- Income & Expense Management
- Profit & Loss Reports
- Financial Reports

### Fleet Management

- Vehicle Registration
- Driver Management
- Fuel Tracking
- Vehicle Maintenance
- Insurance & License Tracking
- Vehicle Expense Management

### Live GPS Tracking

- Live Vehicle Tracking
- Live Sales Representative Tracking
- GPS Attendance
- Route History
- Route Playback
- Geofencing
- Speed Monitoring
- Travel Distance
- Working Hours Monitoring

### Daily Route Management

- Route Planning
- Shop Assignment
- Daily Visit Schedule
- Route Optimization
- Route Completion Percentage
- Missed Visit Tracking

### QR Customer Visit System

- Unique Customer QR Codes
- Small QR Sticker Printing
- QR Scan Verification
- Customer Visit Verification
- GPS Verification
- Timestamp Recording
- Customer Visit History
- Manual Check-In (If QR Not Available)
- Visit Reason Selection
- Optional Shop Photo Capture

### Android Mobile Application

- Android Support
- Secure Login
- Customer Management
- Sales Orders
- Invoice Creation
- Payment Collection
- Delivery Confirmation
- Expense Entry
- Live GPS Tracking
- QR Code Scanner
- Barcode Scanner
- Push Notifications

### Offline Mode

- Offline Customer Management
- Offline Orders
- Offline Invoices
- Offline Payment Collection
- Offline QR Scanning
- Offline Manual Check-In
- Offline GPS Recording
- Encrypted Local Database
- Automatic Background Synchronization
- Duplicate Prevention
- Conflict Resolution

### Reports & Analytics

- Daily Reports
- Weekly Reports
- Monthly Reports
- Annual Reports
- Sales Reports
- Purchase Reports
- Inventory Reports
- Customer Reports
- Supplier Reports
- Finance Reports
- Fleet Reports
- Route Performance Reports
- Sales Representative Performance Reports
- Export to PDF & Excel

### Notifications

- Push Notifications
- Email Notifications
- SMS Notifications
- WhatsApp Notifications
- Low Stock Alerts
- Outstanding Payment Alerts
- Delivery Alerts

### Security

- JWT Authentication
- Password Encryption
- Audit Logs
- Activity Logs
- Session Management
- Device Management
- API Security
- Automatic Backup
- Data Recovery

### Future AI Features

- AI Business Dashboard
- AI Sales Forecasting
- AI Inventory Prediction
- AI Customer Insights
- AI Business Analytics
- AI Smart Reports
- AI Assistant

---

## Tech Stack

- **Web:** React, TypeScript, Vite, Tailwind CSS
- **Desktop:** Electron
- **Mobile:** Capacitor (Android)
- **Backend / Sync:** Supabase
- **Local DB:** better-sqlite3 (encrypted offline support)
- **Maps:** Leaflet / react-leaflet

## Database migrations

Run [`supabase_schema_phases.sql`](supabase_schema_phases.sql) in the Supabase SQL Editor after deploy to create Phase 1–6 tables (routes, visits, warehouses, POs, quotes, offline outbox, fleet, audit, notifications).

Also keep [`supabase_migration.sql`](supabase_migration.sql) for cheques `received_from` and `location_logs`.

## Getting Started

```bash
npm install
npm run dev      # Vite web app
npm start        # Electron desktop
npm run build    # Production build
```

## License

Proprietary — Dissanayake Enterprise (Pvt) Ltd – Seirra Cables
