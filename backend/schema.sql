-- ============================================================
-- Bank Statement Analyzer — MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS bank_analyzer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bank_analyzer;

-- ------------------------------------------------------------
-- 1. Statements
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS statements (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  bank_name     VARCHAR(50)    NOT NULL,
  account_number VARCHAR(30)   NULL,
  month         INT            NOT NULL,
  year          INT            NOT NULL,
  file_name     VARCHAR(255)   NOT NULL,
  uploaded_at   DATETIME       DEFAULT NOW(),
  total_credit  DECIMAL(12,2)  DEFAULT 0.00,
  total_debit   DECIMAL(12,2)  DEFAULT 0.00,
  UNIQUE KEY uq_statement_period (bank_name, account_number, month, year)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. Transactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  statement_id  INT            NOT NULL,
  txn_date      DATE           NULL,
  description   TEXT           NULL,
  debit         DECIMAL(12,2)  DEFAULT 0.00,
  credit        DECIMAL(12,2)  DEFAULT 0.00,
  balance       DECIMAL(14,2)  DEFAULT 0.00,
  category      VARCHAR(50)    DEFAULT 'Uncategorized',
  merchant      VARCHAR(100)   NULL,
  INDEX idx_txn_date  (txn_date),
  INDEX idx_category  (category),
  INDEX idx_stmt_id   (statement_id),
  CONSTRAINT fk_txn_statement
    FOREIGN KEY (statement_id) REFERENCES statements(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. Categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(50)  NOT NULL UNIQUE,
  keywords JSON         NULL,
  color    VARCHAR(10)  NULL,
  icon     VARCHAR(10)  NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. Insights
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insights (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  statement_id  INT            NOT NULL,
  type          ENUM('anomaly','pattern','tip') NOT NULL,
  title         VARCHAR(120)   NOT NULL,
  body          TEXT           NULL,
  severity      ENUM('info','warn','alert') DEFAULT 'info',
  created_at    DATETIME       DEFAULT NOW(),
  CONSTRAINT fk_insight_statement
    FOREIGN KEY (statement_id) REFERENCES statements(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. Seed Categories (10 default categories)
-- ------------------------------------------------------------
INSERT IGNORE INTO categories (name, keywords, color, icon) VALUES
('Food',          '["swiggy","zomato","restaurant","food","cafe","pizza","burger","dominos","mcdonalds","kfc","dining","eat","biryani","uber eats","dunzo"]', '#FF6B6B', '🍔'),
('Rent',          '["rent","house rent","rental","landlord","pg","hostel","accommodation"]', '#4ECDC4', '🏠'),
('Utilities',     '["electricity","water","gas","broadband","internet","wifi","jio","airtel","vodafone","bsnl","dth","tata sky","recharge","bill payment"]', '#45B7D1', '💡'),
('Shopping',      '["amazon","flipkart","myntra","ajio","meesho","shoppers stop","dmart","reliance","big bazaar","mall","store","purchase","market"]', '#96CEB4', '🛒'),
('EMI',           '["emi","loan","bajaj","hdfc loan","mortgage","personal loan","car loan","home loan","repayment","installment"]', '#DDA0DD', '🏦'),
('Salary',        '["salary","wage","payroll","income","stipend","freelance","consulting","payment received","credit salary"]', '#98D8C8', '💰'),
('Transport',     '["uber","ola","rapido","petrol","diesel","fuel","metro","bus","train","irctc","redbus","parking","toll","fastag","cab"]', '#F7DC6F', '🚗'),
('Entertainment', '["netflix","hotstar","prime video","spotify","youtube","movie","cinema","pvr","inox","gaming","subscription","book my show"]', '#BB8FCE', '🎬'),
('Healthcare',    '["hospital","doctor","medical","pharmacy","medicine","apollo","medplus","1mg","practo","health","diagnostic","lab","test"]', '#82E0AA', '🏥'),
('Education',     '["school","college","university","course","udemy","coursera","tuition","coaching","books","stationery","exam","fees"]', '#85C1E9', '📚');
