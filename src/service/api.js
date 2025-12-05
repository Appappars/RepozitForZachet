// Базовый URL API
// В production используем относительный путь (когда фронтенд и бэкенд на одном домене)
// В development используем переменную окружения или localhost
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // В production используем относительный путь
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  // В development используем localhost
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Вспомогательная функция для выполнения запросов
async function fetchAPI(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API Request:', url, options.method || 'GET'); // Для отладки
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network response was not ok' }));
      throw new Error(error.error || 'Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Получить все записи
export async function getRecordCards() {
  try {
    const data = await fetchAPI('/records');
    return data;
  } catch (err) {
    console.error("ошибка загрузки записей", err);
    return [];
  }
}

// Получить запись по ID
export async function getRecordById(recordId) {
  try {
    const record = await fetchAPI(`/records/${recordId}`);
    return record;
  } catch (err) {
    console.error("ошибка получения записи", err);
    return null;
  }
}

// Создать новую запись
export async function createRecord(recordData) {
  try {
    const response = await fetchAPI('/records', {
      method: 'POST',
      body: JSON.stringify(recordData)
    });
    return response;
  } catch (err) {
    console.error("ошибка сохранения записи", err);
    return { success: false, error: err.message };
  }
}

// Обновить запись
export async function updateRecord(recordId, updatedData) {
  try {
    const response = await fetchAPI(`/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedData)
    });
    return response;
  } catch (err) {
    console.error("ошибка обновления записи", err);
    return { success: false, error: err.message };
  }
}

// Удалить запись
export async function deleteRecord(recordId) {
  try {
    const response = await fetchAPI(`/records/${recordId}`, {
      method: 'DELETE'
    });
    return response;
  } catch (err) {
    console.error("ошибка удаления записи", err);
    return { success: false, error: err.message };
  }
}

// ========== API ДЛЯ МАСТЕРОВ ==========

// Получить всех мастеров
export async function getAllMasters() {
  try {
    console.log('Запрос всех мастеров...');
    const data = await fetchAPI('/masters');
    console.log('Получены мастера из API:', data);
    if (Array.isArray(data)) {
      return data;
    } else {
      console.error('Некорректный формат данных мастеров:', data);
      return [];
    }
  } catch (err) {
    console.error("ошибка загрузки мастеров", err);
    return [];
  }
}

// Получить мастера по ID
export async function getMasterById(masterId) {
  try {
    const master = await fetchAPI(`/masters/${masterId}`);
    return master;
  } catch (err) {
    console.error("ошибка получения мастера", err);
    return null;
  }
}

// Получить услуги мастера
export async function getMasterServices(masterId) {
  try {
    const services = await fetchAPI(`/masters/${masterId}/services`);
    return services;
  } catch (err) {
    console.error("ошибка получения услуг мастера", err);
    return [];
  }
}

// Создать мастера
export async function createMaster(masterData) {
  try {
    const response = await fetchAPI('/masters', {
      method: 'POST',
      body: JSON.stringify(masterData)
    });
    return response;
  } catch (err) {
    console.error("ошибка создания мастера", err);
    return { success: false, error: err.message };
  }
}

// Добавить услугу мастеру
export async function addServiceToMaster(masterId, serviceId) {
  try {
    const response = await fetchAPI(`/masters/${masterId}/services`, {
      method: 'POST',
      body: JSON.stringify({ service_id: serviceId })
    });
    return response;
  } catch (err) {
    console.error("ошибка добавления услуги мастеру", err);
    return { success: false, error: err.message };
  }
}

// Удалить услугу у мастера
export async function removeServiceFromMaster(masterId, serviceId) {
  try {
    const response = await fetchAPI(`/masters/${masterId}/services/${serviceId}`, {
      method: 'DELETE'
    });
    return response;
  } catch (err) {
    console.error("ошибка удаления услуги у мастера", err);
    return { success: false, error: err.message };
  }
}

// ========== API ДЛЯ УСЛУГ ==========

// Получить все услуги
export async function getAllServices() {
  try {
    const data = await fetchAPI('/services');
    return data;
  } catch (err) {
    console.error("ошибка загрузки услуг", err);
    return [];
  }
}

// Получить услугу по ID
export async function getServiceById(serviceId) {
  try {
    const service = await fetchAPI(`/services/${serviceId}`);
    return service;
  } catch (err) {
    console.error("ошибка получения услуги", err);
    return null;
  }
}

// Создать услугу
export async function createService(serviceData) {
  try {
    const response = await fetchAPI('/services', {
      method: 'POST',
      body: JSON.stringify(serviceData)
    });
    return response;
  } catch (err) {
    console.error("ошибка создания услуги", err);
    return { success: false, error: err.message };
  }
}

// Получить мастеров по услуге
export async function getMastersByService(serviceId) {
  try {
    const masters = await fetchAPI(`/services/${serviceId}/masters`);
    return masters;
  } catch (err) {
    console.error("ошибка получения мастеров по услуге", err);
    return [];
  }
}

// ========== API ДЛЯ ОПЕРАТОРОВ ==========

// Получить всех операторов
export async function getAllOperators() {
  try {
    const data = await fetchAPI('/operators');
    return data;
  } catch (err) {
    console.error("ошибка загрузки операторов", err);
    return [];
  }
}

// Авторизация оператора
export async function loginOperator(phone) {
  try {
    const response = await fetchAPI('/operators/login', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
    return response;
  } catch (err) {
    console.error("ошибка авторизации оператора", err);
    return { success: false, error: err.message };
  }
}

// ========== API ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ==========

// Получить всех пользователей
export async function getAllUsers() {
  try {
    const data = await fetchAPI('/users');
    return data;
  } catch (err) {
    console.error("ошибка загрузки пользователей", err);
    return [];
  }
}

// Получить пользователя по ID
export async function getUserById(userId) {
  try {
    const user = await fetchAPI(`/users/${userId}`);
    return user;
  } catch (err) {
    console.error("ошибка получения пользователя", err);
    return null;
  }
}

// Регистрация пользователя
export async function registerUser(userData) {
  try {
    const response = await fetchAPI('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response;
  } catch (err) {
    console.error("ошибка регистрации пользователя", err);
    return { error: err.message };
  }
}

// Обновить пользователя
export async function updateUser(userId, userData) {
  try {
    const response = await fetchAPI(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    return response;
  } catch (err) {
    console.error("ошибка обновления пользователя", err);
    return { error: err.message };
  }
}

// ========== API ДЛЯ СМЕН ==========

// Получить все смены
export async function getAllShifts() {
  try {
    const data = await fetchAPI('/shifts');
    return data;
  } catch (err) {
    console.error("ошибка загрузки смен", err);
    return [];
  }
}

// Получить смену по ID
export async function getShiftById(shiftId) {
  try {
    const shift = await fetchAPI(`/shifts/${shiftId}`);
    return shift;
  } catch (err) {
    console.error("ошибка получения смены", err);
    return null;
  }
}

// Открыть смену
export async function openShift(operatorId, notes = '') {
  try {
    const response = await fetchAPI('/shifts/open', {
      method: 'POST',
      body: JSON.stringify({ operator_id: operatorId, notes })
    });
    return response;
  } catch (err) {
    console.error("ошибка открытия смены", err);
    return { success: false, error: err.message };
  }
}

// Закрыть смену
export async function closeShift(shiftId, notes = '') {
  try {
    const response = await fetchAPI(`/shifts/${shiftId}/close`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
    return response;
  } catch (err) {
    console.error("ошибка закрытия смены", err);
    return { success: false, error: err.message };
  }
}

// Получить операции по смене
export async function getOperationsByShift(shiftId) {
  try {
    const operations = await fetchAPI(`/shifts/${shiftId}/operations`);
    return operations;
  } catch (err) {
    console.error("ошибка получения операций по смене", err);
    return [];
  }
}