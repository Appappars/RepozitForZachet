import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResultCreateRecord from './ResultCreateRecord';
import { createRecord, getAllMasters, getMasterServices } from '../service/api';

export default function CreateCard() {
  const [formData, setFormData] = useState({
    client: '',
    car: '',
    master_id: '',
    date: '',
    payment_status: "Pending",
    cancel_reason: '',
    payment_amount: '',
    comment: ''
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [masters, setMasters] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [operator, setOperator] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const navigate = useNavigate();

  // Проверяем авторизацию и активную смену
  useEffect(() => {
    const operatorData = localStorage.getItem('operator');
    const shiftData = localStorage.getItem('activeShift');
    
    if (!operatorData) {
      navigate('/login');
      return;
    }
    
    setOperator(JSON.parse(operatorData));
    
    if (!shiftData) {
      setError('Необходимо открыть смену перед созданием записей');
      setTimeout(() => {
        navigate('/shift-management');
      }, 2000);
      return;
    }
    
    setActiveShift(JSON.parse(shiftData));

    // Предзаполняем данные клиента, если они есть (после регистрации)
    const newClient = localStorage.getItem('newClient');
    if (newClient) {
      try {
        const clientData = JSON.parse(newClient);
        setFormData(prev => ({
          ...prev,
          client: clientData.name || prev.client
        }));
        // Удаляем данные после использования
        localStorage.removeItem('newClient');
      } catch (err) {
        console.error('Ошибка загрузки данных клиента:', err);
      }
    }
  }, [navigate]);

  // Загружаем мастеров при монтировании
  useEffect(() => {
    const loadData = async () => {
      try {
        const mastersData = await getAllMasters();
        setMasters(mastersData);
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
      }
    };
    
    if (operator && activeShift) {
      loadData();
    }
  }, [operator, activeShift]);

  // Загружаем услуги мастера при выборе мастера
  useEffect(() => {
    const loadMasterServices = async () => {
      if (formData.master_id) {
        try {
          const services = await getMasterServices(formData.master_id);
          setAvailableServices(services);
          // Очищаем выбранные услуги, если они не доступны для нового мастера
          setSelectedServices(prev => 
            prev.filter(sel => services.some(s => s.id === sel.service_id))
          );
        } catch (err) {
          console.error('Ошибка загрузки услуг мастера:', err);
          setAvailableServices([]);
        }
      } else {
        setAvailableServices([]);
        setSelectedServices([]);
      }
    };
    loadMasterServices();
  }, [formData.master_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      // Если статус изменен не на "отмена", очищаем причину отмены
      if (name === 'payment_status' && value !== 'cancelled') {
        newData.cancel_reason = '';
      }
      // Если статус изменен не на "проведена", очищаем сумму оплаты и комментарий
      if (name === 'payment_status' && value !== 'paid') {
        newData.payment_amount = '';
        newData.comment = '';
      }
      return newData;
    });
  };

  // Обработка выбора услуги
  const handleServiceToggle = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.service_id === service.id);
      if (exists) {
        return prev.filter(s => s.service_id !== service.id);
      } else {
        return [...prev, {
          service_id: service.id,
          price: service.price
        }];
      }
    });
  };

  // Вычисляем общую цену
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault(); // предотвращаем перезагрузку страницы
    
    setError('');
    setResult('');
    
    // Проверяем, что если статус "отмена", то указана причина
    if (formData.payment_status === 'cancelled' && !formData.cancel_reason.trim()) {
      setError('При статусе "Отмена" необходимо указать причину отмены');
      return;
    }
    
    // Проверяем, что если статус "проведена", то указана сумма оплаты
    if (formData.payment_status === 'paid' && !formData.payment_amount.trim()) {
      setError('При статусе "Проведена" необходимо указать сумму оплаты');
      return;
    }

    // Проверяем, что выбран мастер
    if (!formData.master_id) {
      setError('Необходимо выбрать мастера');
      return;
    }

    // Проверяем, что выбрана хотя бы одна услуга
    if (selectedServices.length === 0) {
      setError('Необходимо выбрать хотя бы одну услугу');
      return;
    }
    
    // Создаем запись с услугами
    const recordData = {
      ...formData,
      price: totalPrice,
      services: selectedServices,
      operator_id: operator.id,
      shift_id: activeShift.id
    };
    const response = await createRecord(recordData);
    
    if (response.success) {
      setResult('Запись успешно создана!');
      // Очищаем форму
      setFormData({
        client: '',
        car: '',
        master_id: '',
        date: '',
        payment_status: "Pending",
        cancel_reason: '',
        payment_amount: '',
        comment: ''
      });
      setSelectedServices([]);
      
      // Перенаправляем на страницу со списком записей через 1.5 секунды
      setTimeout(() => {
        navigate('/records');
      }, 1500);
    } else {
      setError('Ошибка при создании записи: ' + (response.error || 'Неизвестная ошибка'));
    }
  };

  return (
    <>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Создать новую запись</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Клиент:</label>
          <input
            type="text"
            name="client"
            value={formData.client}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Автомобиль:</label>
          <input
            type="text"
            name="car"
            value={formData.car}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Мастер:</label>
          <select
            name="master_id"
            value={formData.master_id}
            onChange={handleChange}
            required
          >
            <option value="">Выберите мастера</option>
            {masters.map(master => (
              <option key={master.id} value={master.id}>
                {master.name} {master.phone ? `(${master.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {formData.master_id && (
          <div>
            <label>Услуги мастера:</label>
            {availableServices.length === 0 ? (
              <div style={{ color: '#666', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                У этого мастера пока нет доступных услуг
              </div>
            ) : (
              <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                {availableServices.map(service => {
                  const isSelected = selectedServices.some(s => s.service_id === service.id);
                  return (
                    <div key={service.id} style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleServiceToggle(service)}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ flex: 1 }}>
                          {service.name} - {service.price} ₽
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedServices.length > 0 && (
          <div style={{ padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px', marginTop: '10px' }}>
            <strong>Выбранные услуги:</strong>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              {selectedServices.map((sel, index) => {
                const service = availableServices.find(s => s.id === sel.service_id);
                return service ? (
                  <li key={index}>{service.name} - {sel.price} ₽</li>
                ) : null;
              })}
            </ul>
            <div style={{ marginTop: '10px', fontSize: '18px', fontWeight: 'bold' }}>
              Общая стоимость: {totalPrice.toFixed(2)} ₽
            </div>
          </div>
        )}

        <div>
          <label>Дата:</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Статус:</label>
          <select
            name="payment_status"
            value={formData.payment_status}
            onChange={handleChange}
            required
          >
            <option value="Pending">В работе</option>
            <option value="paid">Проведена</option>
            <option value="cancelled">Отмена</option>
          </select>
        </div>

        {formData.payment_status === 'cancelled' && (
          <div>
            <label>Причина отмены:</label>
            <textarea
              name="cancel_reason"
              value={formData.cancel_reason}
              onChange={handleChange}
              required={formData.payment_status === 'cancelled'}
              rows="3"
              placeholder="Укажите причину отмены записи"
            />
          </div>
        )}

        {formData.payment_status === 'paid' && (
          <>
            <div>
              <label>Сумма оплаты (₽):</label>
              <input
                type="number"
                name="payment_amount"
                value={formData.payment_amount}
                onChange={handleChange}
                required={formData.payment_status === 'paid'}
                min="0"
                step="0.01"
                placeholder="Укажите сумму оплаты"
              />
            </div>
            <div>
              <label>Комментарий:</label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                rows="3"
                placeholder="Добавьте комментарий (необязательно)"
              />
            </div>
          </>
        )}

        <button type="submit">Создать запись</button>
      </form>

      {result && <ResultCreateRecord result={result} />}
      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
    </>
  );
}
