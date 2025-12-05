import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllShifts, getShiftById } from '../service/api';

export default function ShiftLogs() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftDetails, setShiftDetails] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const operatorData = localStorage.getItem('operator');
    if (!operatorData) {
      navigate('/login');
      return;
    }
    loadShifts();
  }, [navigate]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const data = await getAllShifts();
      setShifts(data);
    } catch (err) {
      setError('Ошибка при загрузке смен');
      console.error('Ошибка загрузки смен:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShiftClick = async (shift) => {
    if (selectedShift?.id === shift.id) {
      setSelectedShift(null);
      setShiftDetails(null);
      return;
    }

    setSelectedShift(shift);
    try {
      const details = await getShiftById(shift.id);
      setShiftDetails(details);
    } catch (err) {
      console.error('Ошибка загрузки деталей смены:', err);
      setShiftDetails(null);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'open') return '#28a745';
    if (status === 'closed') return '#6c757d';
    return '#ffc107';
  };

  const getStatusText = (status) => {
    if (status === 'open') return 'Открыта';
    if (status === 'closed') return 'Закрыта';
    return status;
  };

  const formatOperationType = (type) => {
    const types = {
      'shift_open': 'Открытие смены',
      'shift_close': 'Закрытие смены',
      'payment': 'Оплата',
      'cancellation': 'Отмена',
      'status_change': 'Изменение статуса'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        Загрузка логов смен...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>📊 Логи смен</h2>

      {error && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#f8d7da',
          border: '1px solid #dc3545',
          borderRadius: '8px',
          color: '#721c24'
        }}>
          {error}
        </div>
      )}

      {shifts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Смены не найдены
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {shifts.map(shift => (
            <div
              key={shift.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: selectedShift?.id === shift.id 
                  ? '0 4px 8px rgba(0,0,0,0.1)' 
                  : '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onClick={() => handleShiftClick(shift)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>Смена #{shift.id.substring(0, 8)}</h3>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      backgroundColor: getStatusColor(shift.status),
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {getStatusText(shift.status)}
                    </span>
                  </div>
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
                    <div><strong>Оператор:</strong> {shift.operator_name || 'Неизвестно'}</div>
                    <div><strong>Открыта:</strong> {new Date(shift.open_time).toLocaleString('ru-RU')}</div>
                    {shift.close_time && (
                      <div><strong>Закрыта:</strong> {new Date(shift.close_time).toLocaleString('ru-RU')}</div>
                    )}
                    {shift.notes && (
                      <div><strong>Примечания при открытии:</strong> {shift.notes}</div>
                    )}
                    {shift.close_notes && (
                      <div><strong>Примечания при закрытии:</strong> {shift.close_notes}</div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '24px', color: selectedShift?.id === shift.id ? '#007bff' : '#ccc' }}>
                  {selectedShift?.id === shift.id ? '▼' : '▶'}
                </div>
              </div>

              {selectedShift?.id === shift.id && shiftDetails && (
                <div style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #eee'
                }}>
                  <h4 style={{ marginBottom: '15px' }}>Логи операций смены:</h4>
                  {shiftDetails.logs && shiftDetails.logs.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {shiftDetails.logs.map((log, index) => (
                        <div
                          key={log.id || index}
                          style={{
                            padding: '12px',
                            marginBottom: '10px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            border: '1px solid #e9ecef'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold' }}>
                              {formatOperationType(log.operation_type)}
                            </div>
                            <div style={{ color: '#666', fontSize: '12px' }}>
                              {new Date(log.created_at).toLocaleString('ru-RU')}
                            </div>
                          </div>
                          {log.amount && (
                            <div><strong>Сумма:</strong> {log.amount} ₽</div>
                          )}
                          {log.previous_status && log.new_status && (
                            <div>
                              <strong>Изменение статуса:</strong> {log.previous_status} → {log.new_status}
                            </div>
                          )}
                          {log.reason && (
                            <div><strong>Причина/Комментарий:</strong> {log.reason}</div>
                          )}
                          {log.record_id && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              <strong>ID записи:</strong> {log.record_id}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      color: '#666'
                    }}>
                      Нет операций в этой смене
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

