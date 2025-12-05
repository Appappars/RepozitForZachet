import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginOperator } from '../service/api';

export default function OperatorLogin() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await loginOperator(phone);
      
      if (response.success && response.operator) {
        // Сохраняем данные оператора в localStorage
        localStorage.setItem('operator', JSON.stringify(response.operator));
        
        // Сохраняем активную смену, если она есть
        if (response.activeShift) {
          localStorage.setItem('activeShift', JSON.stringify(response.activeShift));
        } else {
          localStorage.removeItem('activeShift');
        }
        
        // Перенаправляем на страницу записей
        navigate('/records');
      } else {
        setError(response.error || 'Ошибка авторизации. Проверьте номер телефона.');
      }
    } catch (err) {
      setError('Ошибка при подключении к серверу. Попробуйте позже.');
      console.error('Ошибка авторизации:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '50px auto', 
      padding: '30px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        🔐 Вход оператора
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold',
            color: '#555'
          }}>
            Номер телефона:
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 (999) 123-45-67"
            required
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <div style={{ 
            color: '#dc3545', 
            marginBottom: '15px', 
            padding: '10px',
            backgroundColor: '#f8d7da',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#fff',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}

