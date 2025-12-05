import {useEffect,useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { getRecordCards, deleteRecord } from "../service/api"
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
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
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
        {!activeShift && (
            <div style={{
                padding: '15px',
                marginBottom: '20px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                color: '#856404'
            }}>
                ⚠️ <strong>Внимание:</strong> Смена не открыта. Для создания, редактирования и удаления записей необходимо открыть смену.
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