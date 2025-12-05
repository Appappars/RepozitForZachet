import { useState, useEffect } from 'react';
import { getAllServices, getMastersByService } from '../service/api';

export default function ServicesView() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [masters, setMasters] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await getAllServices();
      setServices(data);
    } catch (err) {
      setError('Ошибка при загрузке услуг');
      console.error('Ошибка загрузки услуг:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceClick = async (service) => {
    if (selectedService?.id === service.id) {
      setSelectedService(null);
      setMasters([]);
      return;
    }

    setSelectedService(service);
    setLoadingMasters(true);
    setMasters([]);

    try {
      const mastersData = await getMastersByService(service.id);
      setMasters(mastersData);
    } catch (err) {
      console.error('Ошибка загрузки мастеров:', err);
      setMasters([]);
    } finally {
      setLoadingMasters(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        Загрузка услуг...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        color: '#dc3545'
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>🛠️ Услуги</h2>

      {services.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#666'
        }}>
          Услуги не найдены
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {services.map(service => (
            <div
              key={service.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: selectedService?.id === service.id 
                  ? '0 4px 8px rgba(0,0,0,0.1)' 
                  : '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onClick={() => handleServiceClick(service)}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '10px'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                    {service.name}
                  </h3>
                  {service.description && (
                    <p style={{ color: '#666', margin: '0 0 10px 0' }}>
                      {service.description}
                    </p>
                  )}
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: '#007bff'
                  }}>
                    {service.price} ₽
                  </div>
                </div>
                <div style={{ 
                  fontSize: '24px',
                  color: selectedService?.id === service.id ? '#007bff' : '#ccc'
                }}>
                  {selectedService?.id === service.id ? '▼' : '▶'}
                </div>
              </div>

              {selectedService?.id === service.id && (
                <div style={{ 
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #eee'
                }}>
                  <h4 style={{ marginBottom: '15px' }}>Мастера, предоставляющие эту услугу:</h4>
                  {loadingMasters ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      Загрузка мастеров...
                    </div>
                  ) : masters.length === 0 ? (
                    <div style={{ 
                      color: '#666',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px'
                    }}>
                      Нет мастеров, предоставляющих эту услугу
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {masters.map(master => (
                        <div
                          key={master.id}
                          style={{
                            padding: '12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            border: '1px solid #e9ecef'
                          }}
                        >
                          <div style={{ fontWeight: 'bold' }}>{master.name}</div>
                          {master.phone && (
                            <div style={{ color: '#666', fontSize: '14px' }}>
                              📞 {master.phone}
                            </div>
                          )}
                        </div>
                      ))}
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

