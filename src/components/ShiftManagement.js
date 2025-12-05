import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { openShift, closeShift, getOperationsByShift } from '../service/api';

export default function ShiftManagement() {
  const [operator, setOperator] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [notes, setNotes] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [operations, setOperations] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const operatorData = localStorage.getItem('operator');
    const shiftData = localStorage.getItem('activeShift');
    
    if (!operatorData) {
      navigate('/login');
      return;
    }
    
    setOperator(JSON.parse(operatorData));
    
    if (shiftData) {
      const shift = JSON.parse(shiftData);
      setActiveShift(shift);
      loadOperations(shift.id);
    }
  }, [navigate]);

  const loadOperations = async (shiftId) => {
    try {
      const ops = await getOperationsByShift(shiftId);
      setOperations(ops);
    } catch (err) {
      console.error('Ошибка загрузки операций:', err);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await openShift(operator.id, notes);
      
      if (response.success && response.shift) {
        localStorage.setItem('activeShift', JSON.stringify(response.shift));
        setActiveShift(response.shift);
        setSuccess('Смена успешно открыта!');
        setNotes('');
        setOperations([]);
      } else {
        setError(response.error || 'Ошибка при открытии смены');
      }
    } catch (err) {
      setError('Ошибка при подключении к серверу');
      console.error('Ошибка открытия смены:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!window.confirm('Вы уверены, что хотите закрыть смену?')) {
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await closeShift(activeShift.id, closeNotes);
      
      if (response.success) {
        localStorage.removeItem('activeShift');
        setActiveShift(null);
        setSuccess('Смена успешно закрыта!');
        setCloseNotes('');
        setOperations([]);
      } else {
        setError(response.error || 'Ошибка при закрытии смены');
      }
    } catch (err) {
      setError('Ошибка при подключении к серверу');
      console.error('Ошибка закрытия смены:', err);
    } finally {
      setLoading(false);
    }
  };

  // Вычисляем общую сумму операций
  const totalAmount = operations.reduce((sum, op) => sum + Number(op.amount || 0), 0);

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>⏰ Управление сменой</h2>

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

      {!activeShift ? (
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '30px',
          backgroundColor: '#fff'
        }}>
          <h3 style={{ marginBottom: '20px' }}>Открыть смену</h3>
          <form onSubmit={handleOpenShift}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold' 
              }}>
                Примечания (необязательно):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="3"
                placeholder="Добавьте примечания к смене"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
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

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: loading ? '#6c757d' : '#28a745',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Открытие...' : 'Открыть смену'}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div style={{
            border: '1px solid #28a745',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: '#d4edda',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#155724', marginBottom: '10px' }}>
              ✅ Смена открыта
            </h3>
            <p><strong>Дата открытия:</strong> {new Date(activeShift.open_time).toLocaleString('ru-RU')}</p>
            {activeShift.notes && (
              <p><strong>Примечания:</strong> {activeShift.notes}</p>
            )}
          </div>

          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '30px',
            backgroundColor: '#fff',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Закрыть смену</h3>
            <form onSubmit={handleCloseShift}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold' 
                }}>
                  Примечания при закрытии (необязательно):
                </label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  rows="3"
                  placeholder="Добавьте примечания при закрытии смены"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
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

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#fff',
                  backgroundColor: loading ? '#6c757d' : '#dc3545',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Закрытие...' : 'Закрыть смену'}
              </button>
            </form>
          </div>

          {operations.length > 0 && (
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: '#fff'
            }}>
              <h3 style={{ marginBottom: '15px' }}>Операции смены</h3>
              <div style={{ marginBottom: '15px' }}>
                <strong>Всего операций:</strong> {operations.length}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong>Общая сумма:</strong> {totalAmount.toFixed(2)} ₽
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {operations.map((op, index) => (
                  <div 
                    key={op.id || index}
                    style={{
                      padding: '10px',
                      marginBottom: '10px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <div><strong>Сумма:</strong> {op.amount} ₽</div>
                    {op.record_id && <div><strong>ID записи:</strong> {op.record_id}</div>}
                    {op.created_at && (
                      <div><strong>Дата:</strong> {new Date(op.created_at).toLocaleString('ru-RU')}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

