# Инструкция по развертыванию приложения в облаке

Это приложение состоит из фронтенда (React) и бэкенда (Node.js/Express). Ниже описаны варианты развертывания.

## Вариант 1: Railway (Рекомендуется)

Railway - простой способ развернуть full-stack приложение.

### Шаги:

1. **Создайте аккаунт на Railway**
   - Перейдите на https://railway.app
   - Войдите через GitHub

2. **Подготовьте проект**
   ```bash
   # Установите зависимости бэкенда
   cd server
   npm install
   cd ..
   ```

3. **Деплой на Railway**
   - Нажмите "New Project" → "Deploy from GitHub repo"
   - Выберите ваш репозиторий
   - Railway автоматически определит проект

4. **Настройка переменных окружения**
   - В настройках проекта добавьте переменную:
     - `NODE_ENV=production`
     - `PORT` (Railway установит автоматически)

5. **Получите URL**
   - Railway предоставит URL вида: `https://your-app.railway.app`
   - Обновите `REACT_APP_API_URL` в `.env` файле (если нужно)

## Вариант 2: Vercel (Только фронтенд) + Railway (Бэкенд)

### Развертывание бэкенда на Railway:

1. Следуйте инструкциям из Варианта 1 для бэкенда

2. Получите URL бэкенда (например: `https://your-backend.railway.app`)

### Развертывание фронтенда на Vercel:

1. **Создайте аккаунт на Vercel**
   - Перейдите на https://vercel.com
   - Войдите через GitHub

2. **Подготовьте проект**
   ```bash
   # Создайте файл .env.local
   echo "REACT_APP_API_URL=https://your-backend.railway.app/api" > .env.local
   ```

3. **Деплой на Vercel**
   - Нажмите "New Project"
   - Импортируйте ваш GitHub репозиторий
   - Vercel автоматически определит React проект
   - Добавьте переменную окружения:
     - `REACT_APP_API_URL` = URL вашего бэкенда

## Вариант 3: Render

### Развертывание на Render:

1. **Создайте аккаунт на Render**
   - Перейдите на https://render.com
   - Войдите через GitHub

2. **Создайте Web Service для бэкенда**
   - New → Web Service
   - Подключите репозиторий
   - Настройки:
     - Build Command: `cd server && npm install`
     - Start Command: `cd server && npm start`
     - Environment: Node

3. **Создайте Static Site для фронтенда**
   - New → Static Site
   - Подключите репозиторий
   - Build Command: `npm run build`
   - Publish Directory: `build`
   - Environment Variables:
     - `REACT_APP_API_URL` = URL вашего бэкенда

## Локальная разработка

### Запуск бэкенда:
```bash
cd server
npm install
npm start
# Сервер запустится на http://localhost:5000
```

### Запуск фронтенда:
```bash
npm install
npm start
# Приложение откроется на http://localhost:3000
```

### Переменные окружения:

Создайте файл `.env` в корне проекта:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Структура проекта

```
auto-app/
├── server/              # Бэкенд (Node.js/Express)
│   ├── server.js       # Основной файл сервера
│   ├── package.json    # Зависимости бэкенда
│   └── data/           # Данные (создается автоматически)
├── src/                # Фронтенд (React)
│   └── service/
│       └── api.js      # API клиент
├── public/             # Статические файлы
└── package.json        # Зависимости фронтенда
```

## API Endpoints

- `GET /api/records` - Получить все записи
- `GET /api/records/:id` - Получить запись по ID
- `POST /api/records` - Создать новую запись
- `PUT /api/records/:id` - Обновить запись
- `DELETE /api/records/:id` - Удалить запись

## Важные замечания

1. **Данные хранятся в файле** `server/data/records.json`
   - В production убедитесь, что этот файл сохраняется
   - Railway и Render сохраняют файлы в файловой системе

2. **CORS настроен** для работы с фронтендом

3. **В production** бэкенд также обслуживает статические файлы React

## Поддержка

При возникновении проблем проверьте:
- Логи в консоли браузера
- Логи сервера в панели управления облачного сервиса
- Правильность URL API в переменных окружения

