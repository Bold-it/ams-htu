# ⚙️ BACKEND CORE: NODE.JS & MYSQL SETUP GUIDE

**HTU Accreditation Monitoring System**  
**Ho Technical University | ICT Directorate**

---

## 📑 TABLE OF CONTENTS
- [1.0 System Requirements](#10-system-requirements)
- [2.0 Database Schema Initialization](#20-database-schema-initialization)
- [3.0 API Interface Implementation](#30-api-interface-implementation)
- [4.0 Email Gateway Configuration](#40-email-gateway-configuration)
- [5.0 Production Deployment (cPanel)](#50-production-deployment-cpanel)

---

## 1.0 SYSTEM REQUIREMENTS

The backend serves as the centralized logic hub for the HTU Accreditation Monitoring System.

| Component | specification |
|---|---|
| **Runtime** | Node.js 18.x or 20.x (LTS) |
| **Framework** | Express.js (RESTful) |
| **Database** | MySQL 8.0+ / MariaDB 10.4+ |
| **Email Gateway** | Resend API (Recommended) or Gmail OAuth |

---

## 2.0 DATABASE SCHEMA INITIALIZATION

The system utilizes a relational schema with UUID-based identification. Use **phpMyAdmin** or a MySQL terminal to initialize the database:

```sql
CREATE DATABASE IF NOT EXISTS htu_accreditation;
USE htu_accreditation;

-- Core Accreditations Table
CREATE TABLE accreditations (
  id VARCHAR(36) PRIMARY KEY,
  programme_name VARCHAR(255) NOT NULL,
  accreditation_type ENUM('programme', 'institutional') DEFAULT 'programme',
  faculty VARCHAR(255),
  department VARCHAR(255),
  start_date DATE,
  expiry_date DATE NOT NULL,
  email VARCHAR(255),
  workflow_status VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 3.0 API INTERFACE IMPLEMENTATION

### 3.1 Environment Configuration (`.env`)
```env
PORT=3001
DB_HOST=localhost
DB_USER=htu_db_admin
DB_PASSWORD=YOUR_SECURE_PHRASE
DB_NAME=htu_accreditation
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
FRONTEND_URL=https://accreditation.htu.edu.gh
```

### 3.2 Core Logic Snippet (Status Calculation)
```javascript
function calculateComplianceStatus(expiryDate) {
  const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000);
  if (days <= 0) return 'expired';
  if (days <= 90) return 'critical';
  if (days <= 365) return 'warning';
  if (days <= 455) return 'upcoming'; // 15 months
  return 'active';
}
```

---

## 4.0 EMAIL GATEWAY CONFIGURATION

The system uses **Resend** for institutional mail delivery. Ensure your domain `htu.edu.gh` is verified in the Resend dashboard to prevent the system emails from being flagged as spam.

> [!IMPORTANT]
> **API Security**: Never commit your `RESEND_API_KEY` to public repositories. Always use the server-side `.env` file.

---

## 5.0 PRODUCTION DEPLOYMENT (CPANEL)

1.  **Repository Setup**: Upload the `backend/` directory to your server.
2.  **Node.js App**: In cPanel, navigate to **Setup Node.js App**.
3.  **App Configuration**:
    - **Startup File**: `app.js` (or `server.js`)
    - **App Root**: `backend`
4.  **Dependencies**: Click **Run NPM Install** to fetch `express`, `mysql2`, and `resend`.
5.  **Restart**: Restart the application after any changes to the `.env` file.

---

**Technical Lead: ICT Directorate, Ho Technical University**
**© 2026 HTU Accreditation Monitoring Project**
```

---

## Connecting the Frontend

Set the environment variable before building the frontend:

```env
VITE_API_URL=https://your-cpanel-domain.com/api
```

Or update the default in `src/lib/api.ts`:
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'https://your-domain.com/api';
```

---

## Deploying to cPanel

1. Create a MySQL database via **cPanel → MySQL Databases**
2. Run the SQL schema via **phpMyAdmin**
3. Upload backend files via **File Manager** or **SSH**
4. Configure `.env` with your DB credentials
5. Go to **cPanel → Setup Node.js App** and create an app
6. Set entry point to `server.js`
7. Click **Run NPM Install**, then **Start App**

---

## Automated Email Reminders

Add via **cPanel → Cron Jobs**:

```bash
# Daily at 8:00 AM
0 8 * * * curl -s -X POST https://your-domain.com/api/send-bulk-reminders -H "Content-Type: application/json" -d '{"status":"all"}'
```
