-- Migration to add Google Auth support and Approval Flow
ALTER TABLE users ADD COLUMN status ENUM('active', 'pending_approval') DEFAULT 'active';
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE NULL;
ALTER TABLE users MODIFY COLUMN password_hash TEXT NULL;
UPDATE users SET status = 'active';
