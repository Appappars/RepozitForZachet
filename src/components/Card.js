import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Card({id, client, car, master_name, master_phone, services, price, date, payment_status, cancel_reason, payment_amount, comment, onDelete}) {
    const navigate = useNavigate();
    const [activeShift, setActiveShift] = useState(null);

    useEffect(() => {
        const shiftData = localStorage.getItem('activeShift');
        if (shiftData) {
            setActiveShift(JSON.parse(shiftData));
        }
    }, []);

    // Функция для определения цвета статуса
    const getStatusColor = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === 'отмена' || statusLower === 'cancelled' || statusLower === 'canceled') {
            return 'red';
        } else if (statusLower === 'проведена' || statusLower === 'paid' || statusLower === 'completed') {
            return 'green';
        } else if (statusLower === 'в работе' || statusLower === 'pending' || statusLower === 'in_progress' || statusLower === 'unpaid') {
            return 'yellow';
        }
        return 'gray'; // По умолчанию
    };

    // Функция для получения текста статуса
    const getStatusText = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === 'отмена' || statusLower === 'cancelled' || statusLower === 'canceled') {
            return 'Отмена';
        } else if (statusLower === 'проведена' || statusLower === 'paid' || statusLower === 'completed') {
            return 'Проведена';
        } else if (statusLower === 'в работе' || statusLower === 'pending' || statusLower === 'in_progress' || statusLower === 'unpaid') {
            return 'В работе';
        }
        return status || 'Неизвестно';
    };

    const statusColor = getStatusColor(payment_status);
    const statusText = getStatusText(payment_status);

    const handleEdit = () => {
        const shiftData = localStorage.getItem('activeShift');
        if (!shiftData) {
            alert('Необходимо открыть смену для редактирования записей');
            navigate('/shift-management');
            return;
        }
        navigate(`/edit/${id}`);
    };

    const handleDelete = () => {
        const shiftData = localStorage.getItem('activeShift');
        if (!shiftData) {
            alert('Необходимо открыть смену для удаления записей');
            navigate('/shift-management');
            return;
        }
        if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
            if (onDelete) {
                onDelete(id);
            }
        }
    };

    return (
        <div className="record-card">
            <div className={`status-badge status-${statusColor}`}>
                <span className="status-icon"></span>
                <span className="status-text">{statusText}</span>
            </div>
            <div className="card-content">
                <div className="card-field">
                    <span className="field-label">Клиент:</span>
                    <span className="field-value">{client}</span>
                </div>
                <div className="card-field">
                    <span className="field-label">Автомобиль:</span>
                    <span className="field-value">{car}</span>
                </div>
                {master_name && (
                    <div className="card-field">
                        <span className="field-label">Мастер:</span>
                        <span className="field-value">
                            {master_name}
                            {master_phone && ` (${master_phone})`}
                        </span>
                    </div>
                )}
                {services && Array.isArray(services) && services.length > 0 && (
                    <div className="card-field">
                        <span className="field-label">Услуги:</span>
                        <div className="field-value" style={{ marginTop: '5px' }}>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {services.map((service, index) => (
                                    <li key={index}>
                                        {service.service_name || service.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
                <div className="card-field">
                    <span className="field-label">К оплате:</span>
                    <span className="field-value">{price} ₽</span>
                </div>
                <div className="card-field">
                    <span className="field-label">Дата:</span>
                    <span className="field-value">{date}</span>
                </div>
                {payment_amount && (
                    <div className="card-field payment-info">
                        <span className="field-label">Сумма оплаты:</span>
                        <span className="field-value">{payment_amount} ₽</span>
                    </div>
                )}
                {comment && (
                    <div className="card-field comment-info">
                        <span className="field-label">Комментарий:</span>
                        <span className="field-value">{comment}</span>
                    </div>
                )}
                {cancel_reason && (
                    <div className="card-field cancel-reason">
                        <span className="field-label">Причина отмены:</span>
                        <span className="field-value">{cancel_reason}</span>
                    </div>
                )}
            </div>
            <div className="card-actions">
                <button 
                    className="btn-edit" 
                    onClick={handleEdit}
                    disabled={!activeShift}
                    style={{ opacity: activeShift ? 1 : 0.5, cursor: activeShift ? 'pointer' : 'not-allowed' }}
                    title={!activeShift ? 'Необходимо открыть смену' : ''}
                >
                    ✏️ Редактировать
                </button>
                <button 
                    className="btn-delete" 
                    onClick={handleDelete}
                    disabled={!activeShift}
                    style={{ opacity: activeShift ? 1 : 0.5, cursor: activeShift ? 'pointer' : 'not-allowed' }}
                    title={!activeShift ? 'Необходимо открыть смену' : ''}
                >
                    🗑️ Удалить
                </button>
            </div>
        </div>
    );
}