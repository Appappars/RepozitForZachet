-- SQL схема для таблицы records
-- Эта схема создается автоматически через db.js, но можно использовать для ручного создания

CREATE TABLE IF NOT EXISTS records (
  id VARCHAR(255) PRIMARY KEY,
  client VARCHAR(255) NOT NULL,
  car VARCHAR(255) NOT NULL,
  service VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'Pending',
  cancel_reason TEXT,
  payment_amount NUMERIC(10, 2),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по статусу
CREATE INDEX IF NOT EXISTS idx_payment_status ON records(payment_status);

-- Индекс для поиска по дате
CREATE INDEX IF NOT EXISTS idx_date ON records(date);

