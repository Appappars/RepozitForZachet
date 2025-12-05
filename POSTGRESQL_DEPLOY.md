# Развертывание PostgreSQL на Railway

## Шаг 1: Создание PostgreSQL базы данных на Railway

1. **Войдите в ваш проект на Railway**
   - Откройте https://railway.app
   - Выберите ваш проект

2. **Добавьте PostgreSQL сервис**
   - Нажмите "+ New" → "Database" → "Add PostgreSQL"
   - Railway автоматически создаст PostgreSQL базу данных

3. **Получите DATABASE_URL**
   - После создания базы данных, Railway автоматически создаст переменную окружения `DATABASE_URL`
   - Эта переменная будет доступна всем сервисам в проекте
   - Вы можете увидеть её в настройках базы данных → "Variables"

## Шаг 2: Настройка переменных окружения

1. **В настройках вашего Web Service (бэкенд):**
   - Откройте "Variables"
   - Убедитесь, что `DATABASE_URL` присутствует (Railway добавит автоматически)
   - Добавьте другие переменные, если нужно:
     - `NODE_ENV=production`
     - `PORT` (Railway установит автоматически)

2. **Проверка подключения:**
   - Railway автоматически связывает сервисы в одном проекте
   - `DATABASE_URL` будет доступен вашему бэкенду

## Шаг 3: Деплой

1. **Закоммитьте изменения:**
   ```bash
   git add .
   git commit -m "Добавлена поддержка PostgreSQL"
   git push
   ```

2. **Railway автоматически пересоберет проект:**
   - При push в GitHub Railway начнет новый деплой
   - База данных будет автоматически инициализирована при первом запуске

## Шаг 4: Проверка работы

1. **Проверьте логи:**
   - В Railway откройте ваш Web Service
   - Перейдите в "Deployments" → выберите последний деплой → "View Logs"
   - Должно быть сообщение: "База данных инициализирована успешно"

2. **Проверьте работу приложения:**
   - Откройте ваше приложение
   - Попробуйте создать новую запись
   - Проверьте, что запись сохраняется

## Локальная разработка с PostgreSQL

### Вариант 1: Локальная установка PostgreSQL

1. **Установите PostgreSQL:**
   - Windows: https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`

2. **Создайте базу данных:**
   ```bash
   createdb auto_app
   ```

3. **Создайте файл `.env` в папке `server/`:**
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/auto_app
   ```
   Замените `username` и `password` на ваши данные

4. **Запустите сервер:**
   ```bash
   cd server
   npm install
   npm start
   ```

### Вариант 2: Использование Docker

1. **Запустите PostgreSQL в Docker:**
   ```bash
   docker run --name postgres-auto-app -e POSTGRES_PASSWORD=password -e POSTGRES_DB=auto_app -p 5432:5432 -d postgres
   ```

2. **Создайте файл `.env` в папке `server/`:**
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/auto_app
   ```

3. **Запустите сервер:**
   ```bash
   cd server
   npm install
   npm start
   ```

### Вариант 3: Использование Railway локально

1. **Установите Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Войдите в Railway:**
   ```bash
   railway login
   ```

3. **Подключите локальный проект:**
   ```bash
   railway link
   ```

4. **Получите переменные окружения:**
   ```bash
   railway variables
   ```

5. **Запустите сервер:**
   ```bash
   cd server
   npm install
   DATABASE_URL=$(railway variables --json | jq -r '.DATABASE_URL') npm start
   ```

## Миграция данных из файла (опционально)

Если у вас есть данные в JSON файле и вы хотите их перенести:

1. **Установите переменную окружения:**
   ```
   MIGRATE_FROM_FILE=true
   ```

2. **Убедитесь, что файл существует:**
   - Файл должен быть в `server/data/records.json`

3. **Перезапустите сервер:**
   - При следующем запуске данные будут автоматически мигрированы

## Управление базой данных

### Через Railway Dashboard:

1. Откройте ваш PostgreSQL сервис в Railway
2. Нажмите "Query" для выполнения SQL запросов
3. Или используйте "Connect" для подключения через внешний клиент

### Через psql (локально):

```bash
# Подключение к Railway базе данных
psql $DATABASE_URL

# Или через Railway CLI
railway connect postgres
```

### Полезные SQL запросы:

```sql
-- Просмотр всех записей
SELECT * FROM records ORDER BY created_at DESC;

-- Подсчет записей по статусам
SELECT payment_status, COUNT(*) FROM records GROUP BY payment_status;

-- Удаление всех записей (осторожно!)
DELETE FROM records;
```

## Решение проблем

### Ошибка подключения к базе данных:

1. **Проверьте DATABASE_URL:**
   - Убедитесь, что переменная установлена
   - Проверьте формат: `postgresql://user:password@host:port/database`

2. **Проверьте логи:**
   - В Railway откройте логи вашего сервиса
   - Ищите ошибки подключения

3. **Проверьте сеть:**
   - Убедитесь, что сервисы находятся в одном проекте Railway

### Ошибка "relation does not exist":

- База данных не была инициализирована
- Перезапустите сервер - таблица создастся автоматически

### Данные не сохраняются:

1. Проверьте логи на наличие ошибок
2. Убедитесь, что транзакции коммитятся
3. Проверьте права доступа к базе данных

## Резервное копирование

Railway автоматически создает резервные копии PostgreSQL базы данных. Вы можете:

1. Открыть ваш PostgreSQL сервис в Railway
2. Перейти в "Backups"
3. Скачать резервную копию или восстановить из неё

## Масштабирование

Railway автоматически масштабирует PostgreSQL. Для больших нагрузок:

1. Откройте настройки PostgreSQL сервиса
2. Выберите более мощный план (если нужно)
3. Railway автоматически обновит ресурсы

