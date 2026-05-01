# 🛠️ TECHNICAL ARCHITECTURE & SYSTEMS GUIDE

**HTU Accreditation Monitoring System**  
**Ho Technical University | ICT Directorate**  
**Engineering Documentation VERSION 1.2**

---

## 📑 TABLE OF CONTENTS
- [1.0 Architectural Stack](#10-architectural-stack)
- [2.0 Database Schema & Normalization](#20-database-schema--normalization)
- [3.0 API Interface Definition](#30-api-interface-definition)
- [4.0 Background Services & Automation](#40-background-services--automation)
- [5.0 Frontend Component Architecture](#50-frontend-component-architecture)

---

## 1.0 ARCHITECTURAL STACK

The system follows a modern, decoupled **Three-Tier Architecture** designed for high availability and institutional scaling.

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Presentation** | React.js | 18.x | Dynamic, responsive SPA. |
| **Logic** | Node.js / Express | 20.x | RESTful API & Business Logic. |
| **Persistence** | MySQL | 8.0 | Relational data integrity. |
| **Automation** | Node-Cron | 3.x | Scheduled alerts & backups. |

---

## 2.0 DATABASE SCHEMA & NORMALIZATION

The system utilizes **UUID (Universally Unique Identifiers)** for all primary keys to ensure data portable and prevent ID collisions across environments.

### 2.1 Core Entities
- **`accreditations`**: The master registry for institutional and programme compliance records.
- **`accreditation_documents`**: Metadata mapping for the Document Vault, linking files to their parent programmes.
- **`users`**: Secure identity storage with Bcrypt hashing and RBAC mapping.
- **`audit_logs`**: Immutable tracking of all state-changing transactions.

---

## 3.0 API INTERFACE DEFINITION

### 3.1 Security Headers
All requests must be accompanied by the `x-user-email` header. This is used by the backend to:
1.  Verify the user's role and departmental permissions.
2.  Populate the `user_email` field in the automated Audit Trail.

### 3.2 Primary Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/api/accreditations` | `GET` | Fetch all records (filtered by RBAC). |
| `/api/accreditations/:id/documents` | `POST` | Multipart upload to the Document Vault. |
| `/api/send-monthly-report` | `POST` | Trigger executive PDF/HTML report dispatch. |
| `/api/health` | `GET` | System heartbeat and dependency check. |

---

## 4.0 BACKGROUND SERVICES & AUTOMATION

The backend orchestration is handled via scheduled cron jobs located in `backend/app.js`.

| Schedule | Task | Logic Component |
|---|---|---|
| **09:00 Daily** | Compliance Check | Identifies records moving to Warning/Critical status. |
| **12:00 Daily** | System Backup | Full JSON database dump & email dispatch. |
| **08:00 Monthly** | Exec Report | Compiles and sends the Pro-VC Audit Report. |

---

## 5.0 FRONTEND COMPONENT ARCHITECTURE

The frontend is built using **Vite** for rapid hot-reloading and optimized production bundles.

- **`src/lib/api.ts`**: The central communication hub using Axios.
- **`src/components/DocumentVault.tsx`**: A high-performance, drag-and-drop file management component.
- **`src/pages/AuditTrail.tsx`**: A searchable, paginated table for institutional transparency.

---

> [!IMPORTANT]
> **Developer Note**: When adding new tables, always use `VARCHAR(36)` for primary and foreign keys to remain compatible with the existing UUID standard.

---

**Institutional Technical Documentation | © 2026 HTU ICT Directorate**
