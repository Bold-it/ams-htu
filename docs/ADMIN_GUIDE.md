# 🔑 ADMINISTRATOR & SYSTEM MANAGEMENT GUIDE

**HTU Accreditation Monitoring System**  
**Ho Technical University | ICT Directorate**

---

## 📑 TABLE OF CONTENTS
- [1.0 User Identity & Access Control](#10-user-identity--access-control)
- [2.0 Institutional Audit Logging](#20-institutional-audit-logging)
- [3.0 Pro-VC Reporting Engine](#30-pro-vc-reporting-engine)
- [4.0 System Maintenance & Disaster Recovery](#40-system-maintenance--disaster-recovery)
- [5.0 Security Best Practices](#50-security-best-practices)

---

## 1.0 USER IDENTITY & ACCESS CONTROL

The system utilizes **Role-Based Access Control (RBAC)** to ensure data integrity and departmental privacy.

### 1.1 Account Provisioning
- **Manual Creation**: Super Admins can create accounts via the **User Management** portal.
- **Self-Registration**: Staff can sign up using Google OAuth. These accounts remain **Pending** until a Super Admin assigns them a Department and Role.

### 1.2 Administrative Resets
In the event of a lost password (for non-Google accounts), use the **Administrative Reset** feature. This generates a secure 6-digit TOTP sent to the user's registered email, valid for 15 minutes.

---

## 2.0 INSTITUTIONAL AUDIT LOGGING

Every state-changing action (POST, PUT, DELETE) is captured in the **Institutional Audit Trail**.

### 2.1 Interpreting Logs
- **Timestamp**: Exact UTC time of the action.
- **Identity**: The email address of the administrator who performed the action.
- **Action**: The specific API endpoint and method used.
- **Payload**: A "Before/After" snapshot of the data (available in the JSON detail view).

> [!IMPORTANT]
> **Data Integrity**: Audit logs are immutable. They cannot be deleted or modified by any user, including Super Admins, once written to the database.

---

## 3.0 PRO-VC REPORTING ENGINE

The system is designed to provide high-level visibility to the Office of the Pro-Vice-Chancellor.

### 3.1 Automated Monthly Audits
On the **1st of every month at 08:00 GMT**, the system compiles a "University Compliance Snapshot" and emails it to executive management. 

### 3.2 Manual Report Dispatch
If an urgent update is required for a meeting, navigate to **System Settings -> Reports** and click **Trigger Executive Dispatch**.

---

## 4.0 SYSTEM MAINTENANCE & DISASTER RECOVERY

### 4.1 Automated Backups
- **Daily Backups**: A full JSON dump of the database is generated daily at **12:00 PM**.
- **Storage**: Backups are encrypted and dispatched to the official system email (`accreditationsystem@htu.edu.gh`).

### 4.2 Health Monitoring
Super Admins should periodically check the **System Health Dashboard** to verify:
- **DB Connection**: MySQL Pool status.
- **Mail Gateway**: Resend/SMTP relay connectivity.
- **Storage Quota**: Available disk space for Document Vault uploads.

---

## 5.0 SECURITY BEST PRACTICES

> [!CAUTION]
> **Super Admin Responsibility**: Your account has the power to delete institutional records and approve new users. 

1.  **Enforce Official Emails**: Only approve users with `@htu.edu.gh` or approved faculty domains.
2.  **Regular Audit Reviews**: Review the "Critical Actions" section of the Audit Trail weekly.
3.  **Departmental Isolation**: Ensure HoDs are assigned only to their respective departments to prevent unauthorized cross-departmental data access.

---

**Technical Lead: ICT Directorate, Ho Technical University**
