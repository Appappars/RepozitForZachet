const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Настройка CORS для работы с фронтендом
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Логирование запросов для отладки
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes

// GET /api/records - Получить все записи
app.get('/api/records', async (req, res) => {
  try {
    const records = await db.getAllRecords();
    res.json(records);
  } catch (error) {
    console.error('Ошибка получения записей:', error);
    res.status(500).json({ error: 'Ошибка при получении записей' });
  }
});

// GET /api/records/:id - Получить запись по ID
app.get('/api/records/:id', async (req, res) => {
  try {
    const record = await db.getRecordById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Ошибка получения записи:', error);
    res.status(500).json({ error: 'Ошибка при получении записи' });
  }
});

// POST /api/records - Создать новую запись
app.post('/api/records', async (req, res) => {
  try {
    const { operator_id, shift_id } = req.body;
    
    // Проверяем наличие оператора и смены
    if (!operator_id) {
      return res.status(400).json({ success: false, error: 'Необходимо указать оператора' });
    }
    
    if (!shift_id) {
      return res.status(400).json({ success: false, error: 'Необходимо указать смену' });
    }
    
    // Проверяем, что смена активна
    const shift = await db.getShiftById(shift_id);
    if (!shift) {
      return res.status(404).json({ success: false, error: 'Смена не найдена' });
    }
    
    if (shift.status !== 'open') {
      return res.status(403).json({ success: false, error: 'Смена закрыта. Операции невозможны.' });
    }
    
    // Вычисляем общую цену из услуг
    let totalPrice = 0;
    if (req.body.services && Array.isArray(req.body.services) && req.body.services.length > 0) {
      totalPrice = req.body.services.reduce((sum, service) => sum + Number(service.price || 0), 0);
    } else {
      totalPrice = Number(req.body.price) || 0;
    }

    const newRecord = {
      ...req.body,
      id: `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      price: totalPrice,
      payment_amount: req.body.payment_amount ? Number(req.body.payment_amount) : undefined,
      payment_status: req.body.payment_status || "Pending",
      created_by_operator_id: operator_id,
      created_by_shift_id: shift_id
    };
    
    const createdRecord = await db.createRecord(newRecord);
    
    // Если запись создана со статусом "оплачена", создаем операцию
    if (newRecord.payment_status === 'paid') {
      const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.createOperation({
        id: operationId,
        record_id: newRecord.id,
        operator_id: operator_id,
        shift_id: shift_id,
        operation_type: 'payment',
        amount: req.body.payment_amount,
        previous_status: 'Pending',
        new_status: 'paid',
        reason: req.body.comment || 'Оплата при создании записи'
      });
    }
    
    res.status(201).json({ success: true, record: createdRecord });
  } catch (error) {
    console.error('Ошибка создания записи:', error);
    res.status(500).json({ success: false, error: error.message || 'Ошибка при сохранении записи' });
  }
});

// PUT /api/records/:id - Обновить запись
app.put('/api/records/:id', async (req, res) => {
  try {
    const { operator_id, shift_id } = req.body;
    
    // Проверяем наличие оператора и смены
    if (!operator_id) {
      return res.status(400).json({ success: false, error: 'Необходимо указать оператора' });
    }
    
    if (!shift_id) {
      return res.status(400).json({ success: false, error: 'Необходимо указать смену' });
    }
    
    // Проверяем, что смена активна
    const shift = await db.getShiftById(shift_id);
    if (!shift) {
      return res.status(404).json({ success: false, error: 'Смена не найдена' });
    }
    
    if (shift.status !== 'open') {
      return res.status(403).json({ success: false, error: 'Смена закрыта. Операции невозможны.' });
    }
    
    // Получаем текущую запись для сравнения статуса
    const currentRecord = await db.getRecordById(req.params.id);
    if (!currentRecord) {
      return res.status(404).json({ success: false, error: 'Запись не найдена' });
    }
    
    // Вычисляем общую цену из услуг
    let totalPrice = 0;
    if (req.body.services && Array.isArray(req.body.services) && req.body.services.length > 0) {
      totalPrice = req.body.services.reduce((sum, service) => sum + Number(service.price || 0), 0);
    } else {
      totalPrice = Number(req.body.price) || 0;
    }

    const updatedData = {
      ...req.body,
      price: totalPrice,
      payment_amount: req.body.payment_amount ? Number(req.body.payment_amount) : undefined
    };
    
    const updatedRecord = await db.updateRecord(req.params.id, updatedData);
    
    if (!updatedRecord) {
      return res.status(404).json({ success: false, error: 'Запись не найдена' });
    }
    
    // Если статус изменился, создаем операцию
    if (currentRecord.payment_status !== req.body.payment_status) {
      const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let operationType = 'status_change';
      let reason = '';
      
      if (req.body.payment_status === 'paid') {
        operationType = 'payment';
        reason = req.body.comment || 'Оплата';
      } else if (req.body.payment_status === 'cancelled') {
        operationType = 'cancellation';
        reason = req.body.cancel_reason || 'Отмена';
      }
      
      await db.createOperation({
        id: operationId,
        record_id: req.params.id,
        operator_id: operator_id,
        shift_id: shift_id,
        operation_type: operationType,
        amount: req.body.payment_amount || null,
        previous_status: currentRecord.payment_status,
        new_status: req.body.payment_status,
        reason: reason
      });
    }
    
    res.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error('Ошибка обновления записи:', error);
    res.status(500).json({ success: false, error: error.message || 'Ошибка при обновлении записи' });
  }
});

// DELETE /api/records/:id - Удалить запись
app.delete('/api/records/:id', async (req, res) => {
  try {
    const deleted = await db.deleteRecord(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Запись не найдена' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления записи:', error);
    res.status(500).json({ success: false, error: error.message || 'Ошибка при удалении записи' });
  }
});

// ========== API ДЛЯ МАСТЕРОВ ==========

// GET /api/masters - Получить всех мастеров
app.get('/api/masters', async (req, res) => {
  try {
    const masters = await db.getAllMasters();
    res.json(masters);
  } catch (error) {
    console.error('Ошибка получения мастеров:', error);
    res.status(500).json({ error: 'Ошибка при получении мастеров' });
  }
});

// GET /api/masters/:id - Получить мастера по ID
app.get('/api/masters/:id', async (req, res) => {
  try {
    const master = await db.getMasterById(req.params.id);
    if (!master) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }
    
    // Получаем услуги мастера
    const services = await db.getMasterServices(req.params.id);
    res.json({ ...master, services });
  } catch (error) {
    console.error('Ошибка получения мастера:', error);
    res.status(500).json({ error: 'Ошибка при получении мастера' });
  }
});

// POST /api/masters - Создать мастера
app.post('/api/masters', async (req, res) => {
  try {
    const newMaster = {
      ...req.body,
      id: `master-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    const createdMaster = await db.createMaster(newMaster);
    res.status(201).json(createdMaster);
  } catch (error) {
    console.error('Ошибка создания мастера:', error);
    res.status(500).json({ error: error.message || 'Ошибка при создании мастера' });
  }
});

// PUT /api/masters/:id - Обновить мастера
app.put('/api/masters/:id', async (req, res) => {
  try {
    const updatedMaster = await db.updateMaster(req.params.id, req.body);
    if (!updatedMaster) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }
    res.json(updatedMaster);
  } catch (error) {
    console.error('Ошибка обновления мастера:', error);
    res.status(500).json({ error: error.message || 'Ошибка при обновлении мастера' });
  }
});

// DELETE /api/masters/:id - Удалить мастера
app.delete('/api/masters/:id', async (req, res) => {
  try {
    const deleted = await db.deleteMaster(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления мастера:', error);
    res.status(500).json({ error: error.message || 'Ошибка при удалении мастера' });
  }
});

// GET /api/masters/:id/services - Получить услуги мастера
app.get('/api/masters/:id/services', async (req, res) => {
  try {
    const services = await db.getMasterServices(req.params.id);
    res.json(services);
  } catch (error) {
    console.error('Ошибка получения услуг мастера:', error);
    res.status(500).json({ error: 'Ошибка при получении услуг мастера' });
  }
});

// POST /api/masters/:id/services - Добавить услугу мастеру
app.post('/api/masters/:id/services', async (req, res) => {
  try {
    const { service_id } = req.body;
    if (!service_id) {
      return res.status(400).json({ error: 'service_id обязателен' });
    }
    const result = await db.addServiceToMaster(req.params.id, service_id);
    res.status(201).json(result);
  } catch (error) {
    console.error('Ошибка добавления услуги мастеру:', error);
    res.status(500).json({ error: error.message || 'Ошибка при добавлении услуги' });
  }
});

// DELETE /api/masters/:id/services/:serviceId - Удалить услугу у мастера
app.delete('/api/masters/:id/services/:serviceId', async (req, res) => {
  try {
    const deleted = await db.removeServiceFromMaster(req.params.id, req.params.serviceId);
    if (!deleted) {
      return res.status(404).json({ error: 'Связь не найдена' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления услуги у мастера:', error);
    res.status(500).json({ error: error.message || 'Ошибка при удалении услуги' });
  }
});

// ========== API ДЛЯ УСЛУГ ==========

// GET /api/services - Получить все услуги
app.get('/api/services', async (req, res) => {
  try {
    const services = await db.getAllServices();
    res.json(services);
  } catch (error) {
    console.error('Ошибка получения услуг:', error);
    res.status(500).json({ error: 'Ошибка при получении услуг' });
  }
});

// GET /api/services/:id - Получить услугу по ID
app.get('/api/services/:id', async (req, res) => {
  try {
    const service = await db.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }
    res.json(service);
  } catch (error) {
    console.error('Ошибка получения услуги:', error);
    res.status(500).json({ error: 'Ошибка при получении услуги' });
  }
});

// POST /api/services - Создать услугу
app.post('/api/services', async (req, res) => {
  try {
    const newService = {
      ...req.body,
      id: `service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      price: Number(req.body.price)
    };
    const createdService = await db.createService(newService);
    res.status(201).json(createdService);
  } catch (error) {
    console.error('Ошибка создания услуги:', error);
    res.status(500).json({ error: error.message || 'Ошибка при создании услуги' });
  }
});

// PUT /api/services/:id - Обновить услугу
app.put('/api/services/:id', async (req, res) => {
  try {
    const updatedService = {
      ...req.body,
      price: Number(req.body.price)
    };
    const result = await db.updateService(req.params.id, updatedService);
    if (!result) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }
    res.json(result);
  } catch (error) {
    console.error('Ошибка обновления услуги:', error);
    res.status(500).json({ error: error.message || 'Ошибка при обновлении услуги' });
  }
});

// DELETE /api/services/:id - Удалить услугу
app.delete('/api/services/:id', async (req, res) => {
  try {
    const deleted = await db.deleteService(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления услуги:', error);
    res.status(500).json({ error: error.message || 'Ошибка при удалении услуги' });
  }
});

// GET /api/services/:id/masters - Получить мастеров по услуге
app.get('/api/services/:id/masters', async (req, res) => {
  try {
    const masters = await db.getMastersByService(req.params.id);
    res.json(masters);
  } catch (error) {
    console.error('Ошибка получения мастеров по услуге:', error);
    res.status(500).json({ error: 'Ошибка при получении мастеров' });
  }
});

// ========== API ДЛЯ ОПЕРАТОРОВ ==========

// GET /api/operators - Получить всех операторов
app.get('/api/operators', async (req, res) => {
  try {
    const operators = await db.getAllOperators();
    res.json(operators);
  } catch (error) {
    console.error('Ошибка получения операторов:', error);
    res.status(500).json({ error: 'Ошибка при получении операторов' });
  }
});

// GET /api/operators/:id - Получить оператора по ID
app.get('/api/operators/:id', async (req, res) => {
  try {
    const operator = await db.getOperatorById(req.params.id);
    if (!operator) {
      return res.status(404).json({ error: 'Оператор не найден' });
    }
    res.json(operator);
  } catch (error) {
    console.error('Ошибка получения оператора:', error);
    res.status(500).json({ error: 'Ошибка при получении оператора' });
  }
});

// POST /api/operators/login - Авторизация оператора по телефону
app.post('/api/operators/login', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Телефон обязателен' });
    }
    
    const operator = await db.getOperatorByPhone(phone);
    if (!operator) {
      return res.status(404).json({ error: 'Оператор не найден' });
    }
    
    if (!operator.is_active) {
      return res.status(403).json({ error: 'Оператор деактивирован' });
    }
    
    // Проверяем активную смену
    const activeShift = await db.getActiveShiftByOperator(operator.id);
    
    res.json({ 
      success: true, 
      operator,
      activeShift 
    });
  } catch (error) {
    console.error('Ошибка авторизации оператора:', error);
    res.status(500).json({ error: error.message || 'Ошибка авторизации' });
  }
});

// POST /api/operators - Создать оператора
app.post('/api/operators', async (req, res) => {
  try {
    const newOperator = {
      ...req.body,
      id: `operator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    const createdOperator = await db.createOperator(newOperator);
    res.status(201).json(createdOperator);
  } catch (error) {
    console.error('Ошибка создания оператора:', error);
    res.status(500).json({ error: error.message || 'Ошибка при создании оператора' });
  }
});

// PUT /api/operators/:id - Обновить оператора
app.put('/api/operators/:id', async (req, res) => {
  try {
    const updatedOperator = await db.updateOperator(req.params.id, req.body);
    if (!updatedOperator) {
      return res.status(404).json({ error: 'Оператор не найден' });
    }
    res.json(updatedOperator);
  } catch (error) {
    console.error('Ошибка обновления оператора:', error);
    res.status(500).json({ error: error.message || 'Ошибка при обновлении оператора' });
  }
});

// DELETE /api/operators/:id - Удалить оператора
app.delete('/api/operators/:id', async (req, res) => {
  try {
    const deleted = await db.deleteOperator(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Оператор не найден' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления оператора:', error);
    res.status(500).json({ error: error.message || 'Ошибка при удалении оператора' });
  }
});

// ========== API ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ==========

// GET /api/users - Получить всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

// GET /api/users/:id - Получить пользователя по ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователя' });
  }
});

// POST /api/users/register - Регистрация пользователя
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }
    
    // Проверяем, существует ли пользователь с таким телефоном
    const existingUser = await db.getUserByPhone(phone);
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь с таким телефоном уже существует' });
    }
    
    const newUser = {
      ...req.body,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    const createdUser = await db.createUser(newUser);
    res.status(201).json(createdUser);
  } catch (error) {
    console.error('Ошибка регистрации пользователя:', error);
    res.status(500).json({ error: error.message || 'Ошибка при регистрации пользователя' });
  }
});

// PUT /api/users/:id - Обновить пользователя
app.put('/api/users/:id', async (req, res) => {
  try {
    const updatedUser = await db.updateUser(req.params.id, req.body);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error('Ошибка обновления пользователя:', error);
    res.status(500).json({ error: error.message || 'Ошибка при обновлении пользователя' });
  }
});

// DELETE /api/users/:id - Удалить пользователя
app.delete('/api/users/:id', async (req, res) => {
  try {
    const deleted = await db.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    res.status(500).json({ error: error.message || 'Ошибка при удалении пользователя' });
  }
});

// ========== API ДЛЯ СМЕН ==========

// GET /api/shifts - Получить все смены
app.get('/api/shifts', async (req, res) => {
  try {
    const shifts = await db.getAllShifts();
    res.json(shifts);
  } catch (error) {
    console.error('Ошибка получения смен:', error);
    res.status(500).json({ error: 'Ошибка при получении смен' });
  }
});

// GET /api/shifts/:id - Получить смену по ID
app.get('/api/shifts/:id', async (req, res) => {
  try {
    const shift = await db.getShiftById(req.params.id);
    if (!shift) {
      return res.status(404).json({ error: 'Смена не найдена' });
    }
    
    // Получаем логи смены
    const logs = await db.getShiftLogs(req.params.id);
    res.json({ ...shift, logs });
  } catch (error) {
    console.error('Ошибка получения смены:', error);
    res.status(500).json({ error: 'Ошибка при получении смены' });
  }
});

// POST /api/shifts/open - Открыть смену
app.post('/api/shifts/open', async (req, res) => {
  try {
    const { operator_id, notes } = req.body;
    if (!operator_id) {
      return res.status(400).json({ error: 'operator_id обязателен' });
    }
    
    const shift = await db.openShift(operator_id, notes);
    res.status(201).json({ success: true, shift });
  } catch (error) {
    console.error('Ошибка открытия смены:', error);
    res.status(500).json({ error: error.message || 'Ошибка при открытии смены' });
  }
});

// POST /api/shifts/:id/close - Закрыть смену
app.post('/api/shifts/:id/close', async (req, res) => {
  try {
    const { notes } = req.body;
    const shift = await db.closeShift(req.params.id, notes);
    res.json({ success: true, shift });
  } catch (error) {
    console.error('Ошибка закрытия смены:', error);
    res.status(500).json({ error: error.message || 'Ошибка при закрытии смены' });
  }
});

// GET /api/shifts/:id/operations - Получить операции по смене
app.get('/api/shifts/:id/operations', async (req, res) => {
  try {
    const operations = await db.getOperationsByShift(req.params.id);
    res.json(operations);
  } catch (error) {
    console.error('Ошибка получения операций по смене:', error);
    res.status(500).json({ error: 'Ошибка при получении операций' });
  }
});

// Обслуживание статических файлов React в production
// ВАЖНО: Это должно быть ПОСЛЕ всех API routes
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'build');
  
  // Обслуживание статических файлов
  app.use(express.static(buildPath));
  
  // Все остальные запросы отправляем на React приложение
  app.get('*', (req, res) => {
    // Пропускаем API запросы
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Инициализация базы данных и запуск сервера
async function startServer() {
  try {
    console.log('🚀 Запуск сервера...');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'не установлен');
    console.log('PORT:', PORT);
    
    // Проверяем наличие DATABASE_URL перед инициализацией
    if (!process.env.DATABASE_URL) {
      console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА: DATABASE_URL не установлен!');
      console.error('\n📋 Инструкция по настройке на Railway:');
      console.error('1. В вашем проекте Railway нажмите "+ New" → "Database" → "Add PostgreSQL"');
      console.error('2. Убедитесь, что PostgreSQL сервис и Web Service находятся в ОДНОМ проекте');
      console.error('3. Railway автоматически добавит DATABASE_URL в Web Service');
      console.error('4. Если DATABASE_URL не появился автоматически:');
      console.error('   - Откройте PostgreSQL сервис → "Variables"');
      console.error('   - Скопируйте значение DATABASE_URL');
      console.error('   - Откройте Web Service → "Variables" → "New Variable"');
      console.error('   - Добавьте: Name = DATABASE_URL, Value = (скопированное значение)');
      process.exit(1);
    }
    
    // Инициализируем базу данных
    await db.initDatabase();
    
    // Опционально: миграция данных из файла (если нужно)
    if (process.env.MIGRATE_FROM_FILE === 'true') {
      const fs = require('fs-extra');
      const filePath = path.join(__dirname, 'data', 'records.json');
      await db.migrateFromFile(filePath);
    }
    
    // Запускаем сервер
    app.listen(PORT, () => {
      console.log(`\n✅ Сервер запущен на порту ${PORT}`);
      console.log(`📡 API доступен по адресу: http://localhost:${PORT}/api`);
      console.log(`💾 База данных: PostgreSQL подключена`);
    });
  } catch (error) {
    console.error('\n❌ Ошибка запуска сервера:', error.message);
    console.error('Код ошибки:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔴 Не удалось подключиться к PostgreSQL');
      console.error('Проверьте настройки Railway (см. инструкцию выше)');
    }
    
    process.exit(1);
  }
}

// Обработка ошибок подключения к БД
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  if (error.code === 'ECONNREFUSED') {
    console.error('Не удалось подключиться к базе данных. Проверьте DATABASE_URL.');
  }
});

startServer();
