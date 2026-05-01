# 🚀 INSTITUTIONAL DEPLOYMENT & INFRASTRUCTURE GUIDE

**HTU Accreditation Monitoring System**  
**Ho Technical University | ICT Directorate**

---

## 📑 TABLE OF CONTENTS
- [1.0 Environment Prerequisites](#10-environment-prerequisites)
- [2.0 Frontend Compilation & Asset Delivery](#20-frontend-compilation--asset-delivery)
- [3.0 Backend Service Configuration (cPanel/VPS)](#30-backend-service-configuration-cpanelvps)
- [4.0 Database Schema Initialization](#40-database-schema-initialization)
- [5.0 Post-Deployment Verification (Go-Live)](#50-post-deployment-verification-go-live)

---

## 1.0 ENVIRONMENT PREREQUISITES

The system is optimized for **Linux-based environments** (cPanel/CloudLinux or Ubuntu/Debian VPS).

| Requirement | Minimal Specification | Recommended |
|---|---|---|
| **Node.js** | Version 18.x (LTS) | Version 20.x (LTS) |
| **Database** | MySQL 8.0 or MariaDB 10.4 | MySQL 8.0 Cluster |
| **Memory** | 1GB RAM | 2GB+ RAM |
| **Connectivity** | SMTPS (Port 465/587) | Resend API Key |

---

## 2.0 FRONTEND COMPILATION & ASSET DELIVERY

The frontend utilizes **Vite** for static asset optimization.

1.  **Build Phase**: Execute `npm run build` in the root directory.
2.  **Asset Distribution**: Navigate to the `dist/` directory.
3.  **Deployment**: Upload all contents (HTML, Assets, Manifest) to the university's web server (e.g., `/public_html/accreditation`).

---

## 3.0 BACKEND SERVICE CONFIGURATION (cPanel/VPS)

### 3.1 cPanel Application Setup
1.  Access **Setup Node.js App** in the cPanel dashboard.
2.  **Application Root**: `backend`
3.  **Application URL**: `api.htu.edu.gh` (or a dedicated subdomain).
4.  **Startup File**: `app.js`

### 3.2 Environment Variables (`.env`)
Create a `.env` file in the `backend/` directory with the following institutional parameters:

```env
PORT=3001
DB_HOST=localhost
DB_USER=htu_db_admin
DB_PASSWORD=YOUR_SECURE_PHRASE
DB_NAME=htu_accreditation

# System Communications
RESEND_API_KEY=re_xxxxxx
EMAIL_FROM=accreditationsystem@htu.edu.gh

# Resource URLs
FRONTEND_URL=https://accreditation.htu.edu.gh
```

---

## 4.0 DATABASE SCHEMA INITIALIZATION

1.  Create a fresh MySQL database via **MySQL Database Wizard**.
2.  Initialize the UUID-based schema by importing `migration.sql` or running the `backend/demo-setup.js` script via the Node.js Terminal.

> [!IMPORTANT]
> **Data Integrity**: Ensure the database user has `CREATE`, `SELECT`, `UPDATE`, and `DELETE` privileges. For enhanced security, revoke `DROP` permissions after the initial setup.

---

## 5.0 POST-DEPLOYMENT VERIFICATION (GO-LIVE)

1.  **Connectivity Check**: Access the `/api/health` endpoint. A `200 OK` indicates the database and mailer are active.
2.  **Auth Validation**: Perform a test login with a verified `@htu.edu.gh` account.
3.  **Audit Verification**: Check the **Audit Trail** to ensure the initial admin login was successfully logged.

---

**Infrastructure Lead: ICT Directorate, Ho Technical University**
**© 2026 Institutional Systems Documentation**
