const { Pool } = require('pg');
require('dotenv').config();

// Проверка наличия DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('ОШИБКА: DATABASE_URL не установлен!');
  console.error('Убедитесь, что:');
  console.error('1. PostgreSQL сервис добавлен в Railway проект');
  console.error('2. Web Service связан с PostgreSQL сервисом');
  console.error('3. Переменная DATABASE_URL доступна в настройках Web Service');
  process.exit(1);
}

// Создание пула подключений к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // В production Railway требует SSL
  ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('railway') 
    ? { rejectUnauthorized: false } 
    : false,
  // Настройки пула для лучшей обработки ошибок
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Инициализация базы данных - создание таблицы, если её нет
async function initDatabase() {
  let client;
  try {
    console.log('Попытка подключения к базе данных...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'установлен' : 'НЕ УСТАНОВЛЕН');
    
    // Проверяем подключение
    client = await pool.connect();
    console.log('Подключение к базе данных установлено');
    
    // Проверяем доступность базы
    await client.query('SELECT NOW()');
    console.log('База данных доступна');
    
    // Создаем таблицу masters (мастера)
    await client.query(`
      CREATE TABLE IF NOT EXISTS masters (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица masters создана/проверена');

    // Создаем таблицу services (услуги)
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица services создана/проверена');

    // Создаем таблицу master_services (связь мастеров и услуг)
    await client.query(`
      CREATE TABLE IF NOT EXISTS master_services (
        id VARCHAR(255) PRIMARY KEY,
        master_id VARCHAR(255) NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
        service_id VARCHAR(255) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(master_id, service_id)
      )
    `);
    console.log('Таблица master_services создана/проверена');

    // Создаем таблицу records, если её нет (обновленная версия с master_id)
    await client.query(`
      CREATE TABLE IF NOT EXISTS records (
        id VARCHAR(255) PRIMARY KEY,
        client VARCHAR(255) NOT NULL,
        car VARCHAR(255) NOT NULL,
        master_id VARCHAR(255) REFERENCES masters(id) ON DELETE SET NULL,
        price NUMERIC(10, 2) NOT NULL,
        date DATE NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'Pending',
        cancel_reason TEXT,
        payment_amount NUMERIC(10, 2),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица records создана/проверена');

    // Добавляем колонку master_id, если её нет (для миграции существующих данных)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'records' AND column_name = 'master_id'
        ) THEN
          ALTER TABLE records ADD COLUMN master_id VARCHAR(255) REFERENCES masters(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Удаляем старые колонки service, если они есть (для миграции)
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'records' AND column_name = 'service'
        ) THEN
          ALTER TABLE records DROP COLUMN service;
        END IF;
      END $$;
    `);

    // Создаем таблицу record_services (связь записей и услуг)
    await client.query(`
      CREATE TABLE IF NOT EXISTS record_services (
        id VARCHAR(255) PRIMARY KEY,
        record_id VARCHAR(255) NOT NULL REFERENCES records(id) ON DELETE CASCADE,
        service_id VARCHAR(255) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        price NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(record_id, service_id)
      )
    `);
    console.log('Таблица record_services создана/проверена');
    
    // Создаем индексы для быстрого поиска
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_status ON records(payment_status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_master_id ON records(master_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_record_services_record ON record_services(record_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_record_services_service ON record_services(service_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_master_services_master ON master_services(master_id)
    `);
    console.log('Индексы созданы/проверены');

    // Создаем таблицу operators (операторы)
    await client.query(`
      CREATE TABLE IF NOT EXISTS operators (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица operators создана/проверена');

    // Создаем таблицу users (пользователи/клиенты)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица users создана/проверена');

    // Создаем таблицу shifts (смены)
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id VARCHAR(255) PRIMARY KEY,
        operator_id VARCHAR(255) NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'open',
        open_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        close_time TIMESTAMP,
        notes TEXT,
        close_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица shifts создана/проверена');

    // Создаем таблицу operations (операции)
    await client.query(`
      CREATE TABLE IF NOT EXISTS operations (
        id VARCHAR(255) PRIMARY KEY,
        record_id VARCHAR(255) REFERENCES records(id) ON DELETE SET NULL,
        operator_id VARCHAR(255) NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
        shift_id VARCHAR(255) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        operation_type VARCHAR(50) NOT NULL,
        amount NUMERIC(10, 2),
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Таблица operations создана/проверена');

    // Создаем индексы для новых таблиц
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_operators_phone ON operators(phone)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_operator ON shifts(operator_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_operations_shift ON operations(shift_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_operations_record ON operations(record_id)
    `);
    
    client.release();
    console.log('✅ База данных инициализирована успешно');

    // Инициализируем тестового оператора
    await initTestOperator();
  } catch (error) {
    if (client) {
      client.release();
    }
    console.error('❌ Ошибка инициализации базы данных:', error.message);
    console.error('Код ошибки:', error.code);
    console.error('Детали:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔴 ПРОБЛЕМА: Не удалось подключиться к базе данных');
      console.error('Проверьте:');
      console.error('1. PostgreSQL сервис запущен в Railway');
      console.error('2. DATABASE_URL правильно установлен');
      console.error('3. Web Service связан с PostgreSQL сервисом в одном проекте');
    }
    
    throw error;
  }
}

// Получить все записи с мастерами и услугами
async function getAllRecords() {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        m.name as master_name,
        m.phone as master_phone,
        COALESCE(
          json_agg(
            json_build_object(
              'id', rs.id,
              'service_id', s.id,
              'service_name', s.name,
              'price', rs.price
            )
          ) FILTER (WHERE rs.id IS NOT NULL),
          '[]'::json
        ) as services
      FROM records r
      LEFT JOIN masters m ON r.master_id = m.id
      LEFT JOIN record_services rs ON r.id = rs.record_id
      LEFT JOIN services s ON rs.service_id = s.id
      GROUP BY r.id, m.id
      ORDER BY r.created_at DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения записей:', error);
    throw error;
  }
}

// Получить запись по ID с мастером и услугами
async function getRecordById(id) {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        m.name as master_name,
        m.phone as master_phone,
        COALESCE(
          json_agg(
            json_build_object(
              'id', rs.id,
              'service_id', s.id,
              'service_name', s.name,
              'price', rs.price
            )
          ) FILTER (WHERE rs.id IS NOT NULL),
          '[]'::json
        ) as services
      FROM records r
      LEFT JOIN masters m ON r.master_id = m.id
      LEFT JOIN record_services rs ON r.id = rs.record_id
      LEFT JOIN services s ON rs.service_id = s.id
      WHERE r.id = $1
      GROUP BY r.id, m.id
    `, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения записи:', error);
    throw error;
  }
}

// Создать новую запись
async function createRecord(record) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      id,
      client: clientName,
      car,
      master_id,
      price,
      date,
      payment_status,
      cancel_reason,
      payment_amount,
      comment,
      services = []
    } = record;
    
    // Создаем запись
    const result = await client.query(
      `INSERT INTO records (
        id, client, car, master_id, price, date, 
        payment_status, cancel_reason, payment_amount, comment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        clientName,
        car,
        master_id || null,
        price,
        date,
        payment_status || 'Pending',
        cancel_reason || null,
        payment_amount || null,
        comment || null
      ]
    );
    
    const createdRecord = result.rows[0];
    
    // Добавляем услуги
    if (services && services.length > 0) {
      for (const service of services) {
        const serviceId = `rs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.query(
          `INSERT INTO record_services (id, record_id, service_id, price)
           VALUES ($1, $2, $3, $4)`,
          [serviceId, id, service.service_id, service.price]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Получаем полную запись с услугами
    return await getRecordById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка создания записи:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Обновить запись
async function updateRecord(id, record) {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    
    const {
      client: clientName,
      car,
      master_id,
      price,
      date,
      payment_status,
      cancel_reason,
      payment_amount,
      comment,
      services = []
    } = record;
    
    // Обновляем запись
    const result = await dbClient.query(
      `UPDATE records SET
        client = $1,
        car = $2,
        master_id = $3,
        price = $4,
        date = $5,
        payment_status = $6,
        cancel_reason = $7,
        payment_amount = $8,
        comment = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *`,
      [
        clientName,
        car,
        master_id || null,
        price,
        date,
        payment_status,
        cancel_reason || null,
        payment_amount || null,
        comment || null,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return null;
    }
    
    // Удаляем старые услуги
    await dbClient.query('DELETE FROM record_services WHERE record_id = $1', [id]);
    
    // Добавляем новые услуги
    if (services && services.length > 0) {
      for (const service of services) {
        const serviceId = `rs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await dbClient.query(
          `INSERT INTO record_services (id, record_id, service_id, price)
           VALUES ($1, $2, $3, $4)`,
          [serviceId, id, service.service_id, service.price]
        );
      }
    }
    
    await dbClient.query('COMMIT');
    
    // Получаем обновленную запись с услугами
    return await getRecordById(id);
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Ошибка обновления записи:', error);
    throw error;
  } finally {
    dbClient.release();
  }
}

// Удалить запись
async function deleteRecord(id) {
  try {
    const result = await pool.query('DELETE FROM records WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Ошибка удаления записи:', error);
    throw error;
  }
}

// Миграция данных из JSON файла (опционально, для переноса существующих данных)
async function migrateFromFile(filePath) {
  try {
    const fs = require('fs-extra');
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJson(filePath);
      console.log(`Найдено ${data.length} записей для миграции`);
      
      for (const record of data) {
        try {
          await createRecord({
            ...record,
            id: record.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          });
        } catch (error) {
          console.error(`Ошибка миграции записи ${record.id}:`, error);
        }
      }
      
      console.log('Миграция завершена');
    }
  } catch (error) {
    console.error('Ошибка миграции:', error);
  }
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С МАСТЕРАМИ ==========

// Получить всех мастеров
async function getAllMasters() {
  try {
    const result = await pool.query('SELECT * FROM masters ORDER BY name');
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения мастеров:', error);
    throw error;
  }
}

// Получить мастера по ID
async function getMasterById(id) {
  try {
    const result = await pool.query('SELECT * FROM masters WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения мастера:', error);
    throw error;
  }
}

// Создать мастера
async function createMaster(master) {
  try {
    const { id, name, phone } = master;
    const result = await pool.query(
      'INSERT INTO masters (id, name, phone) VALUES ($1, $2, $3) RETURNING *',
      [id, name, phone || null]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка создания мастера:', error);
    throw error;
  }
}

// Обновить мастера
async function updateMaster(id, master) {
  try {
    const { name, phone } = master;
    const result = await pool.query(
      'UPDATE masters SET name = $1, phone = $2 WHERE id = $3 RETURNING *',
      [name, phone || null, id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка обновления мастера:', error);
    throw error;
  }
}

// Удалить мастера
async function deleteMaster(id) {
  try {
    const result = await pool.query('DELETE FROM masters WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Ошибка удаления мастера:', error);
    throw error;
  }
}

// Получить услуги мастера
async function getMasterServices(masterId) {
  try {
    const result = await pool.query(`
      SELECT s.*, ms.id as master_service_id
      FROM services s
      INNER JOIN master_services ms ON s.id = ms.service_id
      WHERE ms.master_id = $1
      ORDER BY s.name
    `, [masterId]);
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения услуг мастера:', error);
    throw error;
  }
}

// Добавить услугу мастеру
async function addServiceToMaster(masterId, serviceId) {
  try {
    const id = `ms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await pool.query(
      'INSERT INTO master_services (id, master_id, service_id) VALUES ($1, $2, $3) RETURNING *',
      [id, masterId, serviceId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка добавления услуги мастеру:', error);
    throw error;
  }
}

// Удалить услугу у мастера
async function removeServiceFromMaster(masterId, serviceId) {
  try {
    const result = await pool.query(
      'DELETE FROM master_services WHERE master_id = $1 AND service_id = $2 RETURNING id',
      [masterId, serviceId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Ошибка удаления услуги у мастера:', error);
    throw error;
  }
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С УСЛУГАМИ ==========

// Получить все услуги
async function getAllServices() {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY name');
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения услуг:', error);
    throw error;
  }
}

// Получить услугу по ID
async function getServiceById(id) {
  try {
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения услуги:', error);
    throw error;
  }
}

// Создать услугу
async function createService(service) {
  try {
    const { id, name, price, description } = service;
    const result = await pool.query(
      'INSERT INTO services (id, name, price, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, price, description || null]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка создания услуги:', error);
    throw error;
  }
}

// Обновить услугу
async function updateService(id, service) {
  try {
    const { name, price, description } = service;
    const result = await pool.query(
      'UPDATE services SET name = $1, price = $2, description = $3 WHERE id = $4 RETURNING *',
      [name, price, description || null, id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка обновления услуги:', error);
    throw error;
  }
}

// Удалить услугу
async function deleteService(id) {
  try {
    const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Ошибка удаления услуги:', error);
    throw error;
  }
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ОПЕРАТОРАМИ ==========

// Получить всех операторов
async function getAllOperators() {
  try {
    const result = await pool.query('SELECT * FROM operators ORDER BY name');
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения операторов:', error);
    throw error;
  }
}

// Получить оператора по ID
async function getOperatorById(id) {
  try {
    const result = await pool.query('SELECT * FROM operators WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения оператора:', error);
    throw error;
  }
}

// Получить оператора по телефону
async function getOperatorByPhone(phone) {
  try {
    const result = await pool.query('SELECT * FROM operators WHERE phone = $1', [phone]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения оператора по телефону:', error);
    throw error;
  }
}

// Создать оператора
async function createOperator(operator) {
  try {
    const { id, name, phone, is_active } = operator;
    const result = await pool.query(
      'INSERT INTO operators (id, name, phone, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, phone, is_active !== undefined ? is_active : true]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка создания оператора:', error);
    throw error;
  }
}

// Обновить оператора
async function updateOperator(id, operator) {
  try {
    const { name, phone, is_active } = operator;
    const result = await pool.query(
      'UPDATE operators SET name = $1, phone = $2, is_active = $3 WHERE id = $4 RETURNING *',
      [name, phone, is_active !== undefined ? is_active : true, id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка обновления оператора:', error);
    throw error;
  }
}

// Удалить оператора
async function deleteOperator(id) {
  try {
    const result = await pool.query('DELETE FROM operators WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Ошибка удаления оператора:', error);
    throw error;
  }
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ==========

// Получить всех пользователей
async function getAllUsers() {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name');
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    throw error;
  }
}

// Получить пользователя по ID
async function getUserById(id) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    throw error;
  }
}

// Получить пользователя по телефону
async function getUserByPhone(phone) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения пользователя по телефону:', error);
    throw error;
  }
}

// Создать пользователя
async function createUser(user) {
  try {
    const { id, name, phone } = user;
    const result = await pool.query(
      'INSERT INTO users (id, name, phone) VALUES ($1, $2, $3) RETURNING *',
      [id, name, phone]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    throw error;
  }
}

// Обновить пользователя
async function updateUser(id, user) {
  try {
    const { name, phone } = user;
    const result = await pool.query(
      'UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING *',
      [name, phone, id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка обновления пользователя:', error);
    throw error;
  }
}

// Удалить пользователя
async function deleteUser(id) {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    throw error;
  }
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С СМЕНАМИ ==========

// Получить все смены
async function getAllShifts() {
  try {
    const result = await pool.query(`
      SELECT s.*, o.name as operator_name
      FROM shifts s
      LEFT JOIN operators o ON s.operator_id = o.id
      ORDER BY s.created_at DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения смен:', error);
    throw error;
  }
}

// Получить смену по ID
async function getShiftById(id) {
  try {
    const result = await pool.query(`
      SELECT s.*, o.name as operator_name
      FROM shifts s
      LEFT JOIN operators o ON s.operator_id = o.id
      WHERE s.id = $1
    `, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения смены:', error);
    throw error;
  }
}

// Получить активную смену оператора
async function getActiveShiftByOperator(operatorId) {
  try {
    const result = await pool.query(
      'SELECT * FROM shifts WHERE operator_id = $1 AND status = $2 ORDER BY open_time DESC LIMIT 1',
      [operatorId, 'open']
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Ошибка получения активной смены:', error);
    throw error;
  }
}

// Открыть смену
async function openShift(operatorId, notes = '') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Проверяем, нет ли уже открытой смены
    const activeShift = await getActiveShiftByOperator(operatorId);
    if (activeShift) {
      await client.query('ROLLBACK');
      throw new Error('У оператора уже есть открытая смена');
    }

    const id = `shift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await client.query(
      'INSERT INTO shifts (id, operator_id, status, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, operatorId, 'open', notes || null]
    );
    const shift = result.rows[0];

    // Создаем операцию для логирования открытия смены
    const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await client.query(
      `INSERT INTO operations (id, operator_id, shift_id, operation_type, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [operationId, operatorId, id, 'shift_open', notes || 'Смена открыта']
    );

    await client.query('COMMIT');
    return shift;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка открытия смены:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Закрыть смену
async function closeShift(shiftId, notes = '') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Получаем информацию о смене перед закрытием
    const shiftResult = await client.query(
      'SELECT * FROM shifts WHERE id = $1',
      [shiftId]
    );
    
    if (shiftResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Смена не найдена');
    }

    const shift = shiftResult.rows[0];
    
    if (shift.status === 'closed') {
      await client.query('ROLLBACK');
      throw new Error('Смена уже закрыта');
    }

    // Закрываем смену
    const result = await client.query(
      'UPDATE shifts SET status = $1, close_time = CURRENT_TIMESTAMP, close_notes = $2 WHERE id = $3 RETURNING *',
      ['closed', notes || null, shiftId]
    );
    const closedShift = result.rows[0];

    // Создаем операцию для логирования закрытия смены
    const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await client.query(
      `INSERT INTO operations (id, operator_id, shift_id, operation_type, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [operationId, shift.operator_id, shiftId, 'shift_close', notes || 'Смена закрыта']
    );

    await client.query('COMMIT');
    return closedShift;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка закрытия смены:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Получить логи смены
async function getShiftLogs(shiftId) {
  try {
    const result = await pool.query(
      'SELECT * FROM operations WHERE shift_id = $1 ORDER BY created_at DESC',
      [shiftId]
    );
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения логов смены:', error);
    throw error;
  }
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ОПЕРАЦИЯМИ ==========

// Создать операцию
async function createOperation(operation) {
  try {
    const { id, record_id, operator_id, shift_id, operation_type, amount, previous_status, new_status, reason } = operation;
    const result = await pool.query(
      `INSERT INTO operations (id, record_id, operator_id, shift_id, operation_type, amount, previous_status, new_status, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, record_id || null, operator_id, shift_id, operation_type, amount || null, previous_status || null, new_status || null, reason || null]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Ошибка создания операции:', error);
    throw error;
  }
}

// Получить операции по смене
async function getOperationsByShift(shiftId) {
  try {
    const result = await pool.query(
      'SELECT * FROM operations WHERE shift_id = $1 ORDER BY created_at DESC',
      [shiftId]
    );
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения операций по смене:', error);
    throw error;
  }
}

// Получить мастеров по услуге
async function getMastersByService(serviceId) {
  try {
    const result = await pool.query(`
      SELECT m.*, ms.id as master_service_id
      FROM masters m
      INNER JOIN master_services ms ON m.id = ms.master_id
      WHERE ms.service_id = $1
      ORDER BY m.name
    `, [serviceId]);
    return result.rows;
  } catch (error) {
    console.error('Ошибка получения мастеров по услуге:', error);
    throw error;
  }
}

// Инициализация тестового оператора
async function initTestOperator() {
  try {
    const testPhone = '12345678';
    const existingOperator = await getOperatorByPhone(testPhone);
    
    if (!existingOperator) {
      const operatorId = `operator-test-${Date.now()}`;
      await createOperator({
        id: operatorId,
        name: 'Тестовый оператор',
        phone: testPhone,
        is_active: true
      });
      console.log(`✅ Тестовый оператор создан: телефон ${testPhone}, имя: Тестовый оператор`);
    } else {
      console.log(`ℹ️ Тестовый оператор уже существует: телефон ${testPhone}`);
    }
  } catch (error) {
    console.error('Ошибка инициализации тестового оператора:', error);
  }
}

module.exports = {
  pool,
  initDatabase,
  getAllRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  migrateFromFile,
  // Мастера
  getAllMasters,
  getMasterById,
  createMaster,
  updateMaster,
  deleteMaster,
  getMasterServices,
  addServiceToMaster,
  removeServiceFromMaster,
  getMastersByService,
  // Услуги
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  // Операторы
  getAllOperators,
  getOperatorById,
  getOperatorByPhone,
  createOperator,
  updateOperator,
  deleteOperator,
  // Пользователи
  getAllUsers,
  getUserById,
  getUserByPhone,
  createUser,
  updateUser,
  deleteUser,
  // Смены
  getAllShifts,
  getShiftById,
  getActiveShiftByOperator,
  openShift,
  closeShift,
  getShiftLogs,
  // Операции
  createOperation,
  getOperationsByShift
};

