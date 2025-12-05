import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMasters, createMaster, getAllServices, addServiceToMaster, removeServiceFromMaster, getMasterServices, createService } from '../service/api';

export default function MastersManagement() {
  const [masters, setMasters] = useState([]);
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [masterServices, setMasterServices] = useState({}); // {masterId: [services]}
  const [submitting, setSubmitting] = useState(false);
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [newServiceData, setNewServiceData] = useState({
    name: '',
    price: '',
    description: ''
  });
  const [creatingService, setCreatingService] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем авторизацию
    const operatorData = localStorage.getItem('operator');
    if (!operatorData) {
      navigate('/login');
      return;
    }
    
    setOperator(JSON.parse(operatorData));
    loadMasters();
    loadServices();
  }, [navigate]);

  const loadMasters = async () => {
    setLoading(true);
    setError('');
    try {
      const mastersData = await getAllMasters();
      console.log('Загружены мастера:', mastersData); // Для отладки
      setMasters(mastersData || []);
      
      // Загружаем услуги для каждого мастера
      if (mastersData && mastersData.length > 0) {
        const servicesMap = {};
        for (const master of mastersData) {
          try {
            const masterServicesData = await getMasterServices(master.id);
            servicesMap[master.id] = masterServicesData || [];
          } catch (err) {
            console.error(`Ошибка загрузки услуг для мастера ${master.id}:`, err);
            servicesMap[master.id] = [];
          }
        }
        setMasterServices(servicesMap);
      }
    } catch (err) {
      console.error('Ошибка загрузки мастеров:', err);
      setError('Ошибка при загрузке мастеров: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const servicesData = await getAllServices();
      setServices(servicesData || []);
    } catch (err) {
      console.error('Ошибка загрузки услуг:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (!formData.name.trim()) {
      setError('Имя мастера обязательно');
      setSubmitting(false);
      return;
    }

    try {
      // Создаем мастера
      console.log('Создание мастера с данными:', formData);
      console.log('Выбранные услуги:', selectedServices);
      const response = await createMaster(formData);
      console.log('Ответ создания мастера:', response);
      
      if (response.id) {
        const masterId = response.id;
        console.log('Мастер создан с ID:', masterId);
        
        // Обновляем список мастеров сразу после создания
        await loadMasters();
        
        // Добавляем выбранные услуги (если есть ошибки, мастер уже будет виден в списке)
        if (selectedServices.length > 0) {
          console.log('Добавление услуг к мастеру:', selectedServices);
          const serviceResults = [];
          const serviceErrors = [];
          
          for (const serviceId of selectedServices) {
            try {
              console.log(`Добавление услуги ${serviceId} к мастеру ${masterId}`);
              const serviceResponse = await addServiceToMaster(masterId, serviceId);
              console.log('Ответ добавления услуги:', serviceResponse);
              
              if (serviceResponse.id || serviceResponse.success) {
                serviceResults.push(serviceId);
              } else {
                serviceErrors.push({ serviceId, error: serviceResponse.error || 'Неизвестная ошибка' });
              }
            } catch (serviceErr) {
              console.error(`Ошибка при добавлении услуги ${serviceId}:`, serviceErr);
              serviceErrors.push({ serviceId, error: serviceErr.message });
            }
          }
          
          if (serviceErrors.length === 0) {
            setSuccess('Мастер успешно добавлен со всеми услугами!');
          } else if (serviceResults.length > 0) {
            setSuccess(`Мастер успешно добавлен! Добавлено услуг: ${serviceResults.length} из ${selectedServices.length}. Некоторые услуги не удалось добавить.`);
          } else {
            setSuccess('Мастер успешно добавлен, но не удалось добавить услуги. Вы можете добавить их позже.');
          }
          
          // Обновляем список еще раз, чтобы показать мастера с услугами
          await loadMasters();
        } else {
          setSuccess('Мастер успешно добавлен!');
        }
        
        setFormData({ name: '', phone: '' });
        setSelectedServices([]);
        setShowAddForm(false);
      } else {
        console.error('Ошибка создания мастера - нет ID в ответе:', response);
        const errorMsg = response.error || response.message || 'Ошибка при создании мастера. Проверьте консоль для деталей.';
        setError(errorMsg);
        console.error('Детали ошибки:', JSON.stringify(response, null, 2));
      }
    } catch (err) {
      console.error('Исключение при создании мастера:', err);
      const errorMsg = err.message || err.toString() || 'Неизвестная ошибка при создании мастера';
      setError('Ошибка при создании мастера: ' + errorMsg);
      console.error('Полная информация об ошибке:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleServiceToggle = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleNewServiceChange = (e) => {
    const { name, value } = e.target;
    setNewServiceData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newServiceData.name.trim()) {
      setError('Название услуги обязательно');
      return;
    }
    
    if (!newServiceData.price || Number(newServiceData.price) <= 0) {
      setError('Цена услуги должна быть больше 0');
      return;
    }

    setCreatingService(true);
    try {
      const response = await createService({
        name: newServiceData.name.trim(),
        price: Number(newServiceData.price),
        description: newServiceData.description.trim() || null
      });
      
      if (response.id) {
        // Обновляем список услуг
        await loadServices();
        // Автоматически добавляем новую услугу к выбранным
        setSelectedServices(prev => [...prev, response.id]);
        // Очищаем форму
        setNewServiceData({ name: '', price: '', description: '' });
        setShowNewServiceForm(false);
        setSuccess('Услуга успешно создана и добавлена к мастеру!');
      } else {
        setError(response.error || 'Ошибка при создании услуги');
      }
    } catch (err) {
      setError('Ошибка при создании услуги: ' + err.message);
    } finally {
      setCreatingService(false);
    }
  };

  const handleAddServiceToMaster = async (masterId, serviceId) => {
    try {
      const response = await addServiceToMaster(masterId, serviceId);
      if (response.id || response.success) {
        // Обновляем услуги мастера
        const masterServicesData = await getMasterServices(masterId);
        setMasterServices(prev => ({
          ...prev,
          [masterId]: masterServicesData || []
        }));
      } else {
        alert('Ошибка при добавлении услуги: ' + (response.error || 'Неизвестная ошибка'));
      }
    } catch (err) {
      alert('Ошибка при добавлении услуги: ' + err.message);
    }
  };

  const handleRemoveServiceFromMaster = async (masterId, serviceId) => {
    if (!window.confirm('Удалить эту услугу у мастера?')) {
      return;
    }
    
    try {
      const response = await removeServiceFromMaster(masterId, serviceId);
      if (response.success) {
        // Обновляем услуги мастера
        const masterServicesData = await getMasterServices(masterId);
        setMasterServices(prev => ({
          ...prev,
          [masterId]: masterServicesData || []
        }));
      } else {
        alert('Ошибка при удалении услуги: ' + (response.error || 'Неизвестная ошибка'));
      }
    } catch (err) {
      alert('Ошибка при удалении услуги: ' + err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>👨‍🔧 Управление мастерами</h2>

      {operator && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px' 
        }}>
          <strong>Оператор:</strong> {operator.name}
        </div>
      )}

      {error && (
        <div style={{ 
          color: '#dc3545', 
          marginBottom: '15px', 
          padding: '10px',
          backgroundColor: '#f8d7da',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          color: '#155724', 
          marginBottom: '15px', 
          padding: '10px',
          backgroundColor: '#d4edda',
          borderRadius: '4px'
        }}>
          {success}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#fff',
            backgroundColor: '#28a745',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {showAddForm ? '✖ Отменить' : '➕ Добавить мастера'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#fff',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginBottom: '20px' }}>Добавить нового мастера</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold' 
              }}>
                Имя мастера: *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
                placeholder="Введите имя мастера"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold' 
              }}>
                Телефон (необязательно):
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
                placeholder="Введите телефон мастера"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ 
                  fontWeight: 'bold' 
                }}>
                  Доступные услуги (необязательно):
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewServiceForm(!showNewServiceForm)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '14px',
                    color: '#fff',
                    backgroundColor: showNewServiceForm ? '#6c757d' : '#17a2b8',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {showNewServiceForm ? '✖ Отменить' : '➕ Создать новую услугу'}
                </button>
              </div>
              
              {showNewServiceForm && (
                <div style={{
                  border: '1px solid #17a2b8',
                  borderRadius: '4px',
                  padding: '15px',
                  marginBottom: '15px',
                  backgroundColor: '#f0f8ff'
                }}>
                  <h4 style={{ marginBottom: '15px', marginTop: '0' }}>Создать новую услугу</h4>
                  <form onSubmit={handleCreateService}>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                        Название услуги: *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={newServiceData.name}
                        onChange={handleNewServiceChange}
                        required
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          boxSizing: 'border-box'
                        }}
                        placeholder="Введите название услуги"
                      />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                        Цена (₽): *
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={newServiceData.price}
                        onChange={handleNewServiceChange}
                        required
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          boxSizing: 'border-box'
                        }}
                        placeholder="Введите цену"
                      />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                        Описание (необязательно):
                      </label>
                      <textarea
                        name="description"
                        value={newServiceData.description}
                        onChange={handleNewServiceChange}
                        rows="2"
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          boxSizing: 'border-box'
                        }}
                        placeholder="Введите описание услуги"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creatingService}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#fff',
                        backgroundColor: creatingService ? '#6c757d' : '#17a2b8',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: creatingService ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {creatingService ? 'Создание...' : 'Создать услугу'}
                    </button>
                  </form>
                </div>
              )}
              
              {services.length === 0 ? (
                <div style={{ color: '#666', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  Услуги не загружены
                </div>
              ) : (
                <div style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '4px', 
                  padding: '10px', 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  backgroundColor: '#fff'
                }}>
                  {services.map(service => {
                    const isSelected = selectedServices.includes(service.id);
                    return (
                      <label 
                        key={service.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          marginBottom: '8px',
                          cursor: 'pointer',
                          padding: '5px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleServiceToggle(service.id)}
                          style={{ marginRight: '8px' }}
                        />
                        <span>
                          {service.name} - {service.price} ₽
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedServices.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                  Выбрано услуг: {selectedServices.length}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: submitting ? '#6c757d' : '#007bff',
                border: 'none',
                borderRadius: '4px',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Добавление...' : 'Добавить мастера'}
            </button>
          </form>
        </div>
      )}

      <div>
        <h3 style={{ marginBottom: '15px' }}>Список мастеров ({masters.length})</h3>
        {masters.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#666',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            Мастера не найдены. Добавьте первого мастера.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {masters.map(master => {
              const masterServicesList = masterServices[master.id] || [];
              return (
                <div
                  key={master.id}
                  style={{
                    padding: '15px',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginBottom: '15px'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>
                    {master.name}
                  </div>
                  {master.phone && (
                    <div style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                      📞 {master.phone}
                    </div>
                  )}
                  
                  <div style={{ marginTop: '15px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      Услуги мастера ({masterServicesList.length}):
                    </div>
                    {masterServicesList.length === 0 ? (
                      <div style={{ color: '#666', fontSize: '14px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                        У мастера нет доступных услуг
                      </div>
                    ) : (
                      <div style={{ marginBottom: '10px' }}>
                        {masterServicesList.map(service => (
                          <div 
                            key={service.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px',
                              marginBottom: '5px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '4px'
                            }}
                          >
                            <span>{service.name} - {service.price} ₽</span>
                            <button
                              onClick={() => handleRemoveServiceFromMaster(master.id, service.id)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                color: '#fff',
                                backgroundColor: '#dc3545',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              ✖ Удалить
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                        Добавить услугу:
                      </div>
                      {services.length === 0 ? (
                        <div style={{ color: '#666', fontSize: '12px' }}>Услуги не загружены</div>
                      ) : (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddServiceToMaster(master.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '14px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                        >
                          <option value="">Выберите услугу для добавления</option>
                          {services
                            .filter(service => !masterServicesList.some(ms => ms.id === service.id))
                            .map(service => (
                              <option key={service.id} value={service.id}>
                                {service.name} - {service.price} ₽
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ color: '#999', fontSize: '12px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                    ID: {master.id}
                    {master.created_at && (
                      <> • Создан: {new Date(master.created_at).toLocaleString('ru-RU')}</>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
