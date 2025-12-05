# Быстрый старт - Развертывание в облаке

## Самый простой способ - Railway (Рекомендуется)

### Шаг 1: Подготовка проекта

1. Убедитесь, что все файлы закоммичены в Git:
   ```bash
   git add .
   git commit -m "Подготовка к деплою с PostgreSQL"
   ```

2. Загрузите проект на GitHub (если еще не загружен):
   ```bash
   git remote add origin https://github.com/ваш-username/auto-app.git
   git push -u origin main
   ```

### Шаг 2: Развертывание на Railway

1. Перейдите на https://railway.app
2. Войдите через GitHub
3. Нажмите "New Project" → "Deploy from GitHub repo"
4. Выберите ваш репозиторий `auto-app`
5. Railway автоматически определит проект и начнет деплой

### Шаг 3: Добавление PostgreSQL базы данных

1. В вашем проекте Railway нажмите "+ New" → "Database" → "Add PostgreSQL"
2. Railway автоматически создаст PostgreSQL базу данных
3. Railway автоматически добавит переменную `DATABASE_URL` в ваш Web Service

### Шаг 4: Настройка переменных окружения

1. В настройках вашего Web Service откройте "Variables"
2. Убедитесь, что `DATABASE_URL` присутствует (Railway добавит автоматически)
3. Добавьте переменную (если нужно):
   - `NODE_ENV=production` (Railway может установить автоматически)

### Шаг 5: Получение URL

1. После успешного деплоя Railway предоставит URL вида: `https://your-app.railway.app`
2. База данных будет автоматически инициализирована при первом запуске
3. Ваше приложение будет доступно по этому адресу!

**Важно:** При первом запуске приложение автоматически создаст таблицу `records` в базе данных.

## Альтернатива: Render

### Шаг 1: Создайте Web Service

1. Перейдите на https://render.com
2. Войдите через GitHub
3. Нажмите "New" → "Web Service"
4. Подключите ваш репозиторий

### Шаг 2: Настройки

- **Name:** auto-app
- **Environment:** Node
- **Build Command:** `cd server && npm install && cd .. && npm run build`
- **Start Command:** `cd server && npm start`
- **Root Directory:** (оставьте пустым)

### Шаг 3: Деплой

Нажмите "Create Web Service" и дождитесь завершения деплоя.

## Локальное тестирование перед деплоем

### Запуск бэкенда:
```bash
cd server
npm install
npm start
```

### Запуск фронтенда (в новом терминале):
```bash
npm install
npm start
```

Приложение будет доступно на http://localhost:3000

## Важные замечания

1. **Данные сохраняются** в файле `server/data/records.json`
2. **В production** бэкенд также обслуживает статические файлы React
3. **CORS настроен** для работы с фронтендом

## Проблемы?

- Проверьте логи в панели управления Railway/Render
- Убедитесь, что все зависимости установлены
- Проверьте, что порт настроен правильно (Railway/Render установят автоматически)

