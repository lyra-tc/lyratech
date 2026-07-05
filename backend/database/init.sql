-- Lyratech Database Initialization
-- Development database: lyratech-dev

CREATE DATABASE IF NOT EXISTS `lyratech-dev`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lyratech-dev`;

-- --------------------------------------------------------
-- Users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    full_name     VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Leads
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(50),
    company     VARCHAR(255),
    status      ENUM('new','contacted','qualified','proposal','closed','lost') DEFAULT 'new',
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
-- Prospects (public contact form submissions)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS prospects (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    company     VARCHAR(255),
    service     VARCHAR(100),
    message     TEXT,
    created_at  DATETIME DEFAULT (now()),
    INDEX ix_prospects_id (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
    created_at                      DATETIME DEFAULT (now()),
    INDEX ix_diagnostic_submissions_id (id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
