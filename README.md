# Трекер комплектуючих

Веб-додаток для відстеження інвентарю мерчу з можливістю складання боксів.

## Налаштування Supabase

### 1. Отримайте ключі з вашого проєкту

Перейдіть до [вашого проєкту Supabase](https://supabase.com/dashboard/project/hqcupxzbhgcuchupgxgk) та отримайте:

- **Project URL** (з Settings → API)
- **Service Role Key** (з Settings → API)
- **Anon Key** (з Settings → API)

### 2. Налаштуйте змінні середовища в Netlify

1. Перейдіть до [Netlify Dashboard](https://app.netlify.com/)
2. Виберіть ваш сайт
3. Перейдіть до **Site settings** → **Environment variables**
4. Додайте наступні змінні:

```
SUPABASE_URL=https://hqcupxzbhgcuchupgxgk.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Створіть таблиці в Supabase

Виконайте наступні SQL запити в Supabase SQL Editor:

```sql
-- Таблиця товарів
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблиця складських залишків
CREATE TABLE stock (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  variant VARCHAR(50),
  qty INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблиця боксів
CREATE TABLE boxes (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблиця компонентів боксу
CREATE TABLE box_items (
  id SERIAL PRIMARY KEY,
  box_id INTEGER REFERENCES boxes(id) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stock(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Додайте товари
INSERT INTO items (sku, name) VALUES
('NOTEBOOK', 'Блокнот'),
('WATER_BOTTLE', 'Пляшка для води'),
('PEN', 'Ручка'),
('PEN_PAD', 'Підкладка під ручку'),
('BOX', 'Бокс'),
('LANYARD', 'Стрічка для пропуска'),
('BADGE', 'Бейдж для пропуска'),
('STICKERS', 'Стікерпак'),
('POSTCARDS', 'Листівки'),
('TSHIRT_WHITE_MALE', 'Футболка біла чоловіча'),
('TSHIRT_WHITE_FEMALE', 'Футболка біла жіноча'),
('TSHIRT_BLACK_MALE', 'Футболка чорна чоловіча'),
('TSHIRT_BLACK_FEMALE', 'Футболка чорна жіноча');

-- Додайте складські залишки
INSERT INTO stock (item_id, variant, qty) VALUES
(1, NULL, 88),  -- Блокнот
(2, NULL, 11),  -- Пляшка для води
(3, NULL, 102), -- Ручка
(4, NULL, 43),  -- Підкладка під ручку
(5, NULL, 7),   -- Бокс
(6, NULL, 98),  -- Стрічка для пропуска
(7, NULL, 57),  -- Бейдж для пропуска
(8, NULL, 100), -- Стікерпак
(9, NULL, 35),  -- Листівки
-- Футболки чоловічі білі
(10, 'S', 15), (10, 'M', 14), (10, 'L', 9), (10, 'XL', 9), (10, 'XXL', 6),
-- Футболки чоловічі чорні
(11, 'S', 14), (11, 'M', 12), (11, 'L', 15), (11, 'XL', 5), (11, 'XXL', 11),
-- Футболки жіночі білі
(12, 'XS', 16), (12, 'S', 16), (12, 'M', 8), (12, 'L', 15), (12, 'XL', 10), (12, 'XXL', 10),
-- Футболки жіночі чорні
(13, 'XS', 19), (13, 'S', 14), (13, 'M', 7), (13, 'L', 14), (13, 'XL', 7), (13, 'XXL', 11);

-- Створіть функцію для створення боксу
CREATE OR REPLACE FUNCTION create_box(p_items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  box_id INTEGER;
  item JSONB;
  stock_item RECORD;
BEGIN
  -- Створюємо новий бокс
  INSERT INTO boxes DEFAULT VALUES RETURNING id INTO box_id;
  
  -- Обробляємо кожен товар
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Перевіряємо наявність товару
    SELECT * INTO stock_item 
    FROM stock 
    WHERE id = (item->>'stock_id')::INTEGER;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock item not found: %', item->>'stock_id';
    END IF;
    
    -- Перевіряємо достатність кількості
    IF stock_item.qty < (item->>'qty')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for item %: available %, requested %', 
        stock_item.id, stock_item.qty, (item->>'qty')::INTEGER;
    END IF;
    
    -- Додаємо товар до боксу
    INSERT INTO box_items (box_id, stock_id, qty) 
    VALUES (box_id, (item->>'stock_id')::INTEGER, (item->>'qty')::INTEGER);
    
    -- Зменшуємо кількість на складі
    UPDATE stock 
    SET qty = qty - (item->>'qty')::INTEGER,
        updated_at = NOW()
    WHERE id = (item->>'stock_id')::INTEGER;
  END LOOP;
  
  RETURN box_id;
END;
$$;
```

### 4. Перевірте роботу

Після налаштування:

1. Перейдіть до [https://merch-count1.netlify.app/](https://merch-count1.netlify.app/)
2. Натисніть кнопку "🔄 Оновити дані"
3. Перевірте, чи завантажуються дані з Supabase

## Функціонал

- ✅ Відстеження кількості товарів
- ✅ Складання боксів з перевіркою наявності
- ✅ Система відкату операцій
- ✅ Сповіщення через Slack при низьких запасах
- ✅ Збереження стану в localStorage
- ✅ Інтеграція з Supabase

## Технології

- Frontend: Vanilla JavaScript, HTML, CSS
- Backend: Netlify Functions
- База даних: Supabase (PostgreSQL)
- Сповіщення: Slack webhooks
