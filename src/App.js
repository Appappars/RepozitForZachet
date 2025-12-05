import './App.css';
import RecordList from './components/RecordList';
import CreateCard from  './components/RecordForm';
import EditRecord from './components/EditRecord';
import OperatorLogin from './components/OperatorLogin';
import ShiftManagement from './components/ShiftManagement';
import ServicesView from './components/ServicesView';
import UserRegistration from './components/UserRegistration';
import ShiftLogs from './components/ShiftLogs';
import MastersManagement from './components/MastersManagement';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { openShift, closeShift } from './service/api';

function Navigation() {
  const [operator, setOperator] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Загружаем данные оператора из localStorage
    const operatorData = localStorage.getItem('operator');
    const shiftData = localStorage.getItem('activeShift');
    
    if (operatorData) {
      setOperator(JSON.parse(operatorData));
    }
    
    if (shiftData) {
      setActiveShift(JSON.parse(shiftData));
    }

    // Обновляем данные при изменении localStorage (для синхронизации между вкладками)
    const handleStorageChange = () => {
      const newOperatorData = localStorage.getItem('operator');
      const newShiftData = localStorage.getItem('activeShift');
      if (newOperatorData) {
        setOperator(JSON.parse(newOperatorData));
      }
      if (newShiftData) {
        setActiveShift(JSON.parse(newShiftData));
      } else {
        setActiveShift(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      localStorage.removeItem('operator');
      localStorage.removeItem('activeShift');
      setOperator(null);
      setActiveShift(null);
      navigate('/login');
    }
  };

  const handleQuickOpenShift = async () => {
    if (!operator) return;
    
    if (activeShift) {
      alert('У вас уже есть открытая смена');
      navigate('/shift-management');
      return;
    }

    if (window.confirm('Открыть смену?')) {
      try {
        const response = await openShift(operator.id, '');
        if (response.success && response.shift) {
          localStorage.setItem('activeShift', JSON.stringify(response.shift));
          setActiveShift(response.shift);
          // Обновляем страницу для синхронизации состояния
          window.location.reload();
        } else {
          alert('Ошибка при открытии смены: ' + (response.error || 'Неизвестная ошибка'));
        }
      } catch (err) {
        alert('Ошибка при открытии смены');
        console.error(err);
      }
    }
  };

  const handleQuickCloseShift = async () => {
    if (!activeShift) return;

    if (window.confirm('Вы уверены, что хотите закрыть смену?')) {
      try {
        const response = await closeShift(activeShift.id, '');
        if (response.success) {
          localStorage.removeItem('activeShift');
          setActiveShift(null);
          // Обновляем страницу для синхронизации состояния
          window.location.reload();
        } else {
          alert('Ошибка при закрытии смены: ' + (response.error || 'Неизвестная ошибка'));
        }
      } catch (err) {
        alert('Ошибка при закрытии смены');
        console.error(err);
      }
    }
  };

  return (
    <nav style={{ 
      padding: '15px 20px', 
      borderBottom: '2px solid #007bff',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        {operator ? (
          <>
            <Link 
              to="/records" 
              style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
            >
              📋 Записи
            </Link>
            <Link 
              to="/create" 
              style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
            >
              ➕ Создать запись
            </Link>
            <Link 
              to="/services" 
              style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
            >
              🛠️ Услуги
            </Link>
            <Link 
              to="/masters" 
              style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
            >
              👨‍🔧 Мастера
            </Link>
            <Link 
              to="/shift-management" 
              style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
            >
              ⏰ Смена
            </Link>
            <Link 
              to="/shift-logs" 
              style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
            >
              📊 Логи смен
            </Link>
          </>
        ) : (
          <>
            <Link 
              to="/login" 
              style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
            >
              🔐 Вход оператора
            </Link>
            <Link 
              to="/register" 
              style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
            >
              📝 Регистрация клиента
            </Link>
          </>
        )}
      </div>
      
      {operator && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <strong>{operator.name}</strong>
            {activeShift ? (
              <span style={{ 
                marginLeft: '10px', 
                padding: '4px 8px', 
                backgroundColor: '#4caf50', 
                color: '#fff', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                Смена открыта
              </span>
            ) : (
              <span style={{ 
                marginLeft: '10px', 
                padding: '4px 8px', 
                backgroundColor: '#ff9800', 
                color: '#fff', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                Нет смены
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!activeShift ? (
              <button
                onClick={handleQuickOpenShift}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  color: '#fff',
                  backgroundColor: '#28a745',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Открыть смену
              </button>
            ) : (
              <button
                onClick={handleQuickCloseShift}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  color: '#fff',
                  backgroundColor: '#dc3545',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Закрыть смену
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                color: '#fff',
                backgroundColor: '#606970ff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}


function App() {
  return (
    <Router>
      <div>
        <Navigation />
        
        <Routes>
          <Route path="/" element={<OperatorLogin />} />
          <Route path="/login" element={<OperatorLogin />} />
          <Route path="/register" element={<UserRegistration />} />
          <Route path="/records" element={<RecordList />} />
          <Route path="/create" element={<CreateCard />} />
          <Route path="/edit/:id" element={<EditRecord />} />
          <Route path="/shift-management" element={<ShiftManagement />} />
          <Route path="/shift-logs" element={<ShiftLogs />} />
          <Route path="/services" element={<ServicesView />} />
          <Route path="/masters" element={<MastersManagement />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;