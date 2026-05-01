# HTU Accreditation Monitoring System

![HTU Logo](https://htu.edu.gh/images/logo.png)

## 🏛️ Project Overview

The **HTU Accreditation Monitoring System** is a mission-critical platform designed for the **Quality Assurance Unit** at Ho Technical University. It ensures that all academic programmes maintain their institutional and professional accreditation status through real-time monitoring, automated reminders, and a secure document vault for GTEC compliance.

### Key Value Propositions
- **Zero-Miss Compliance**: Automated email reminders at 1-year, 6-month, and 1-month intervals.
- **Institutional Readiness**: Integrated GTEC readiness checklists for every programme.
- **Centralized Evidence**: A robust document vault for storing accreditation certificates and self-assessment reports.
- **Audit Transparency**: Full traceability of all administrative actions for institutional integrity.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|-|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express, MySQL |
| **Email Service** | Resend API / Gmail OAuth2 |
| **Storage** | Local Filesystem with UUID-based metadata |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Database**: MySQL 8.0+
- **Mail**: Resend API Key or Gmail App Credentials

### Quick Installation

1. **Clone & Install**
   ```bash
   git clone <repo-url>
   cd accreditation
   npm install && cd backend && npm install
   ```

2. **Database Setup**
   Create a database named `htu_accreditation` and run:
   ```bash
   cd backend
   npm run db:setup
   ```

3. **Environment Configuration**
   Create a `.env` file in the `backend/` directory using `.env.example` as a template.

### Execution
- **Dev Server**: `npm run dev` (Frontend)
- **API Server**: `cd backend && npm start` (Backend)

---

## 📚 Documentation

For detailed information, please refer to the following specialized guides:

> [!IMPORTANT]
> **[User Guide](docs/USER_GUIDE.md)**  
> Instructions for departmental admins and viewers on how to use the dashboard and manage records.

> [!NOTE]
> **[Administrator Guide](docs/ADMIN_GUIDE.md)**  
> Specialized instructions for Super Admins on user management, audit review, and monthly reports.

> [!TIP]
> **[Technical & API Guide](docs/TECHNICAL_GUIDE.md)**  
> Architectual overview, database schema, and full REST API documentation for developers.

> [!WARNING]
> **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**  
> Step-by-step instructions for deploying to cPanel and managing production environments.

---

## ⚖️ License & Copyright

© 2026 **Ho Technical University (HTU)**. Developed by the ICT Directorate. All rights reserved.

For support, please contact the **HTU Quality Assurance Unit**.
