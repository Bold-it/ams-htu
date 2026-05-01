-- Phase 1 Schema Update: GTEC Alignment & Document Tracking

-- 1. Update accreditations table
ALTER TABLE accreditations 
ADD COLUMN accreditation_type ENUM('programme', 'institutional') DEFAULT 'programme' AFTER programme_name,
ADD COLUMN workflow_status ENUM('self_assessment', 'application_submitted', 'vetting', 'visitation', 'accredited') DEFAULT 'accredited' AFTER expiry_date,
ADD COLUMN institution_id VARCHAR(50) DEFAULT 'HTU' AFTER notes;

-- 2. Create documents table
CREATE TABLE IF NOT EXISTS accreditation_documents (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    accreditation_id VARCHAR(36) NOT NULL,
    document_type ENUM('curriculum', 'staff_list', 'council_approval', 'gtec_certificate', 'other') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NULL,
    size_bytes BIGINT NULL,
    uploaded_by VARCHAR(255) NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accreditation_id) REFERENCES accreditations(id) ON DELETE CASCADE
);

-- 3. Create readiness checklist table
CREATE TABLE IF NOT EXISTS accreditation_checkpoints (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    accreditation_id VARCHAR(36) NOT NULL,
    checkpoint_name VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (accreditation_id) REFERENCES accreditations(id) ON DELETE CASCADE
);
