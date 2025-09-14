# Налаштування змінних середовища в Netlify

## Крок 1: Отримайте ключі з Supabase

1. Перейдіть до [вашого проєкту Supabase](https://supabase.com/dashboard/project/hqcupxzbhgcuchupgxgk)
2. Перейдіть до **Settings** → **API**
3. Скопіюйте наступні значення:

### Project URL
```
https://hqcupxzbhgcuchupgxgk.supabase.co
```

### Service Role Key (secret)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(це довгий ключ, який починається з eyJ...)*

### Anon Key (public)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(це також довгий ключ)*

## Крок 2: Додайте змінні в Netlify

1. Перейдіть до [Netlify Dashboard](https://app.netlify.com/)
2. Знайдіть ваш сайт `merch-count1`
3. Перейдіть до **Site settings** → **Environment variables**
4. Натисніть **Add variable** та додайте:

### Змінна 1:
- **Key**: `SUPABASE_URL`
- **Value**: `https://hqcupxzbhgcuchupgxgk.supabase.co`

### Змінна 2:
- **Key**: `SUPABASE_SERVICE_ROLE`
- **Value**: `ваш-service-role-key-з-supabase`

### Змінна 3:
- **Key**: `SUPABASE_ANON_KEY`
- **Value**: `ваш-anon-key-з-supabase`

## Крок 3: Перезапустіть сайт

1. Після додавання змінних, перейдіть до **Deploys**
2. Натисніть **Trigger deploy** → **Deploy site**
3. Дочекайтесь завершення деплою

## Крок 4: Перевірте роботу

1. Перейдіть до [https://merch-count1.netlify.app/](https://merch-count1.netlify.app/)
2. Відкрийте консоль браузера (F12)
3. Натисніть кнопку "🔄 Оновити дані"
4. Перевірте, чи з'являються повідомлення про завантаження з Supabase

## Крок 5: Створіть таблиці в Supabase

Виконайте SQL запити з README.md в [Supabase SQL Editor](https://supabase.com/dashboard/project/hqcupxzbhgcuchupgxgk/sql)

## Тестування

Використовуйте тестову сторінку: [http://localhost:8000/test-supabase.html](http://localhost:8000/test-supabase.html)
