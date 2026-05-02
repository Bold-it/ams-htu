-- HTU Accreditation Monitoring System
-- Unified Production Database Schema
-- Generate Date: 2026-03-17

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for users
-- ----------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` text DEFAULT NULL,
  `role` enum('super_admin','admin','user') NOT NULL DEFAULT 'user',
  `status` enum('active','pending_approval') DEFAULT 'active',
  `google_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for accreditations
-- ----------------------------
CREATE TABLE IF NOT EXISTS `accreditations` (
  `id` varchar(36) NOT NULL,
  `programme_name` varchar(255) NOT NULL,
  `accreditation_type` enum('programme','institutional') DEFAULT 'programme',
  `faculty` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `expiry_date` date NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `workflow_status` enum('self_assessment','application_submitted','vetting','visitation','accredited') DEFAULT 'accredited',
  `notes` text DEFAULT NULL,
  `institution_id` varchar(50) DEFAULT 'HTU',
  `snoozed_until` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_expiry_date` (`expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for audit_logs
-- ----------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_email` varchar(255) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `method` varchar(10) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `status` int(11) DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for accreditation_documents
-- ----------------------------
CREATE TABLE IF NOT EXISTS `accreditation_documents` (
  `id` varchar(36) NOT NULL,
  `accreditation_id` varchar(36) NOT NULL,
  `document_type` enum('curriculum','staff_list','council_approval','gtec_certificate','other') NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `size_bytes` bigint(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `uploaded_by` varchar(255) DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `accreditation_id` (`accreditation_id`),
  CONSTRAINT `accreditation_documents_ibfk_1` FOREIGN KEY (`accreditation_id`) REFERENCES `accreditations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for accreditation_checkpoints
-- ----------------------------
CREATE TABLE IF NOT EXISTS `accreditation_checkpoints` (
  `id` varchar(36) NOT NULL,
  `accreditation_id` varchar(36) NOT NULL,
  `checkpoint_name` varchar(255) NOT NULL,
  `is_completed` tinyint(1) DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `accreditation_id` (`accreditation_id`),
  CONSTRAINT `accreditation_checkpoints_ibfk_1` FOREIGN KEY (`accreditation_id`) REFERENCES `accreditations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Initial Admin Data (Seeding)
-- Note: Default password is 'admin123' (hash included below)
-- ----------------------------
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `role`, `status`) 
VALUES (UUID(), 'super_admin', 'accreditationsystem@htu.edu.gh', '$2b$10$.65ZFHxEZ0SOGeh.Lz/z7.4CMOtXCJOT2TQYZRkImANR3sHym4mem', 'super_admin', 'active');

SET FOREIGN_KEY_CHECKS = 1;
