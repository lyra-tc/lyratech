-- Lyratech Database Initialization
-- Development database: lyratech-dev

CREATE DATABASE IF NOT EXISTS `lyratech-dev`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lyratech-dev`;

-- --------------------------------------------------------
-- Users
-- is_superadmin is never granted by the API (register/login) or by any
-- name/email match — it must be set manually in the database for the
-- intended owner account. See README.md "Usuarios y permisos".
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    full_name     VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Leads (raw public inbound from the contact form)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(50),
    company     VARCHAR(255),
    industry    VARCHAR(120),
    address     VARCHAR(255),
    service     VARCHAR(100),
    message     TEXT,
    created_at  DATETIME DEFAULT (now()),
    INDEX ix_leads_id (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- Prospects (admin-managed sales pipeline)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS prospects (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(50),
    company     VARCHAR(255),
    industry    VARCHAR(120),
    service     VARCHAR(100),
    status      ENUM('meeting_to_schedule','call_later','meeting_scheduled','lost') NOT NULL DEFAULT 'meeting_to_schedule',
    source      VARCHAR(100),
    notes       TEXT,
    assigned_to INT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Notification recipients (dashboard-configurable email list)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_recipients (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Diagnostic GO: questions (dashboard-configurable, i18n)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnostic_questions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    `key`        VARCHAR(100) NOT NULL UNIQUE,
    type         VARCHAR(20) NOT NULL DEFAULT 'single_choice',
    sort_order   INT NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    is_required  BOOLEAN NOT NULL DEFAULT TRUE,
    config_json  JSON NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Diagnostic GO: submissions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnostic_submissions (
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    name                            VARCHAR(255) NOT NULL,
    email                           VARCHAR(255) NOT NULL,
    phone                           VARCHAR(50),
    company                         VARCHAR(255),
    locale                          VARCHAR(5) NOT NULL DEFAULT 'es',
    raw_answers_json                JSON NOT NULL,
    normalized_answers_en_json      JSON NOT NULL,
    service_scores_json             JSON NOT NULL,
    recommended_primary_service     VARCHAR(50) NOT NULL,
    recommended_secondary_service   VARCHAR(50),
    automation_approach             VARCHAR(20),
    llm_provider                    VARCHAR(50),
    llm_model                       VARCHAR(100),
    llm_input_json                  JSON,
    llm_response_json               JSON,
    llm_status                      VARCHAR(20) NOT NULL DEFAULT 'ok',
    email_delivery_status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    email_delivery_error            TEXT,
    email_provider_id               VARCHAR(64),
    conversion_status               VARCHAR(20) NOT NULL DEFAULT 'pending',
    converted_prospect_id           INT,
    converted_at                    DATETIME NULL,
    created_at                      DATETIME DEFAULT (now()),
    CONSTRAINT fk_diag_converted_prospect FOREIGN KEY (converted_prospect_id) REFERENCES prospects(id) ON DELETE SET NULL,
    INDEX ix_diagnostic_submissions_id (id),
    INDEX idx_created_at (created_at),
    INDEX idx_conversion_status (conversion_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------
-- Used Turnstile tokens: idempotency guard so a duplicate submit
-- (double-click, network retry, replayed request) with the same
-- Turnstile token on /leads or /diagnostics/submit is rejected
-- instead of processed twice. Rows older than 30 days are cleaned up by
-- the backend at startup (see app/core/idempotency.py).
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS used_turnstile_tokens (
    token_hash  CHAR(64) NOT NULL PRIMARY KEY,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
