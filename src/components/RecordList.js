import {useEffect,useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { getRecordCards, deleteRecord, openShift } from "../service/api"
import Card  from "./Card";

// Функция для определения статуса записи
const getRecordStatus = (payment_status) => {
    const statusLower = payment_status?.toLowerCase();
    if (statusLower === 'отмена' || statusLower === 'cancelled' || statusLower === 'canceled') {
        return 'cancelled';
    } else if (statusLower === 'проведена' || statusLower === 'paid' || statusLower === 'completed') {
        return 'paid';
    } else if (statusLower === 'в работе' || statusLower === 'pending' || statusLower === 'in_progress' || statusLower === 'unpaid') {
        return 'pending';
    }
    return 'pending';
};

export default function CardList() 
{
    const [records,SetRecords] = useState([]);
    const [filter, setFilter] = useState('all'); // all, paid, cancelled, pending
    const [activeShift, setActiveShift] = useState(null);
    const [operator, setOperator] = useState(null);
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Загружаем данные оператора
        const operatorData = localStorage.getItem('operator');
        if (operatorData) {
            setOperator(JSON.parse(operatorData));
        }
        
        // Проверяем активную смену
        const shiftData = localStorage.getItem('activeShift');
        if (shiftData) {
            setActiveShift(JSON.parse(shiftData));
        } else {
            setActiveShift(null);
        }
    }, [location.pathname]);

    const loadRecords = () => {
        getRecordCards().then(
            (data) => { SetRecords(data) }
        );
    };

    useEffect(() => {
        loadRecords();
    }, [location.pathname]) // Обновляем список при изменении маршрута

    const handleOpenShift = async () => {
        if (!operator) {
            alert('Необходимо войти как оператор');
            navigate('/login');
            return;
        }

        if (activeShift) {
            alert('У вас уже есть открытая смена');
            return;
        }

        if (window.confirm('Открыть смену?')) {
            setLoading(true);
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
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDelete = async (recordId) => {
        // Проверяем активную смену перед удалением
        const shiftData = localStorage.getItem('activeShift');
        if (!shiftData) {
            alert('Необходимо открыть смену для удаления записей');
            navigate('/shift-management');
            return;
        }

        if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) {
            return;
        }

        const response = await deleteRecord(recordId);
        if (response.success) {
            // Обновляем список после удаления
            loadRecords();
        } else {
            alert('Ошибка при удалении записи: ' + (response.error || 'Неизвестная ошибка'));
        }
    };

    // Фильтрация записей
    const filteredRecords = records.filter(record => {
        if (filter === 'all') return true;
        const status = getRecordStatus(record.payment_status);
        return status === filter;
    });

    return (
    <div className="records-list">
        {!activeShift && operator && (
            <div style={{
                padding: '15px',
                marginBottom: '20px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                color: '#856404',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px'
            }}>
                <div>
                    ⚠️ <strong>Внимание:</strong> Смена не открыта. Для создания, редактирования и удаления записей необходимо открыть смену.
                </div>
                <button
                    onClick={handleOpenShift}
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#fff',
                        backgroundColor: loading ? '#6c757d' : '#28a745',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {loading ? 'Открытие...' : '⏰ Открыть смену'}
                </button>
            </div>
        )}
        <div className="records-header">
            <h2>Записи</h2>
            <div className="filter-buttons">
                <button 
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    Все
                </button>
                <button 
                    className={`filter-btn ${filter === 'paid' ? 'active' : ''}`}
                    onClick={() => setFilter('paid')}
                >
                    Проведенные
                </button>
                <button 
                    className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    В работе
                </button>
                <button 
                    className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setFilter('cancelled')}
                >
                    Отмененные
                </button>
            </div>
        </div>
        {
            filteredRecords.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
                    Записи не найдены
                </p>
            ) : (
                filteredRecords.map(
                    (r) => (
                        <Card key={r.id || Math.random()} {...r} onDelete={handleDelete} />
                    )
                )
            )
        }
    </div>
    )
}