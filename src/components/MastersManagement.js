import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMasters, createMaster } from '../service/api';

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
  const [submitting, setSubmitting] = useState(false);
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
  }, [navigate]);

  const loadMasters = async () => {
    setLoading(true);
    setError('');
    try {
      const mastersData = await getAllMasters();
      console.log('Загружены мастера:', mastersData); // Для отладки
      setMasters(mastersData || []);
    } catch (err) {
      console.error('Ошибка загрузки мастеров:', err);
      setError('Ошибка при загрузке мастеров: ' + err.message);
    } finally {
      setLoading(false);
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
      const response = await createMaster(formData);
      if (response.id) {
        setSuccess('Мастер успешно добавлен!');
        setFormData({ name: '', phone: '' });
        setShowAddForm(false);
        // Обновляем список мастеров
        await loadMasters();
      } else {
        setError(response.error || 'Ошибка при создании мастера');
      }
    } catch (err) {
      setError('Ошибка при создании мастера: ' + err.message);
    } finally {
      setSubmitting(false);
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
            {masters.map(master => (
              <div
                key={master.id}
                style={{
                  padding: '15px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
                <div style={{ color: '#999', fontSize: '12px' }}>
                  ID: {master.id}
                </div>
                {master.created_at && (
                  <div style={{ color: '#999', fontSize: '12px' }}>
                    Создан: {new Date(master.created_at).toLocaleString('ru-RU')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

