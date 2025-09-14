import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export async function handler() {
  try {
    // Спочатку спробуємо завантажити з Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE) {
      try {
        const { data, error } = await supabase
          .from('stock')
          .select('id, qty, variant, items ( sku, name )')
          .order('id', { ascending: true });

        if (error) throw error;

        const inventory = (data || []).map(r => ({
          stock_id: r.id,
          sku: r.items?.sku,
          name: r.items?.name,
          variant: r.variant,
          qty: r.qty
        }));

        return {
          statusCode: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
          },
          body: JSON.stringify({ inventory, source: 'supabase' })
        };
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
        // Fallback to test data
      }
    }
    
    // Повертаємо тестові дані, якщо Supabase не налаштований або є помилка
    const inventory = [
      { stock_id: 1, sku: 'NOTEBOOK', name: 'Блокнот', variant: null, qty: 88 },
      { stock_id: 2, sku: 'WATER_BOTTLE', name: 'Пляшка для води', variant: null, qty: 11 },
      { stock_id: 3, sku: 'PEN', name: 'Ручка', variant: null, qty: 102 },
      { stock_id: 4, sku: 'PEN_PAD', name: 'Підкладка під ручку', variant: null, qty: 43 },
      { stock_id: 5, sku: 'BOX', name: 'Бокс', variant: null, qty: 7 },
      { stock_id: 6, sku: 'LANYARD', name: 'Стрічка для пропуска', variant: null, qty: 98 },
      { stock_id: 7, sku: 'BADGE', name: 'Бейдж для пропуска', variant: null, qty: 57 },
      { stock_id: 8, sku: 'STICKERS', name: 'Стікерпак', variant: null, qty: 100 },
      { stock_id: 9, sku: 'POSTCARDS', name: 'Листівки', variant: null, qty: 35 },
      { stock_id: 10, sku: 'TSHIRT_WHITE_MALE', name: 'Футболка біла чоловіча', variant: 'S', qty: 15 },
      { stock_id: 11, sku: 'TSHIRT_WHITE_MALE', name: 'Футболка біла чоловіча', variant: 'M', qty: 14 },
      { stock_id: 12, sku: 'TSHIRT_WHITE_MALE', name: 'Футболка біла чоловіча', variant: 'L', qty: 9 },
      { stock_id: 13, sku: 'TSHIRT_WHITE_MALE', name: 'Футболка біла чоловіча', variant: 'XL', qty: 9 },
      { stock_id: 14, sku: 'TSHIRT_WHITE_MALE', name: 'Футболка біла чоловіча', variant: 'XXL', qty: 6 },
      { stock_id: 15, sku: 'TSHIRT_BLACK_MALE', name: 'Футболка чорна чоловіча', variant: 'S', qty: 14 },
      { stock_id: 16, sku: 'TSHIRT_BLACK_MALE', name: 'Футболка чорна чоловіча', variant: 'M', qty: 12 },
      { stock_id: 17, sku: 'TSHIRT_BLACK_MALE', name: 'Футболка чорна чоловіча', variant: 'L', qty: 15 },
      { stock_id: 18, sku: 'TSHIRT_BLACK_MALE', name: 'Футболка чорна чоловіча', variant: 'XL', qty: 5 },
      { stock_id: 19, sku: 'TSHIRT_BLACK_MALE', name: 'Футболка чорна чоловіча', variant: 'XXL', qty: 11 },
      { stock_id: 20, sku: 'TSHIRT_WHITE_FEMALE', name: 'Футболка біла жіноча', variant: 'XS', qty: 16 },
      { stock_id: 21, sku: 'TSHIRT_WHITE_FEMALE', name: 'Футболка біла жіноча', variant: 'S', qty: 16 },
      { stock_id: 22, sku: 'TSHIRT_WHITE_FEMALE', name: 'Футболка біла жіноча', variant: 'M', qty: 8 },
      { stock_id: 23, sku: 'TSHIRT_WHITE_FEMALE', name: 'Футболка біла жіноча', variant: 'L', qty: 15 },
      { stock_id: 24, sku: 'TSHIRT_WHITE_FEMALE', name: 'Футболка біла жіноча', variant: 'XL', qty: 10 },
      { stock_id: 25, sku: 'TSHIRT_WHITE_FEMALE', name: 'Футболка біла жіноча', variant: 'XXL', qty: 10 },
      { stock_id: 26, sku: 'TSHIRT_BLACK_FEMALE', name: 'Футболка чорна жіноча', variant: 'XS', qty: 19 },
      { stock_id: 27, sku: 'TSHIRT_BLACK_FEMALE', name: 'Футболка чорна жіноча', variant: 'S', qty: 14 },
      { stock_id: 28, sku: 'TSHIRT_BLACK_FEMALE', name: 'Футболка чорна жіноча', variant: 'M', qty: 7 },
      { stock_id: 29, sku: 'TSHIRT_BLACK_FEMALE', name: 'Футболка чорна жіноча', variant: 'L', qty: 14 },
      { stock_id: 30, sku: 'TSHIRT_BLACK_FEMALE', name: 'Футболка чорна жіноча', variant: 'XL', qty: 7 },
      { stock_id: 31, sku: 'TSHIRT_BLACK_FEMALE', name: 'Футболка чорна жіноча', variant: 'XXL', qty: 11 }
    ];

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ inventory })
    };
  } catch (e) {
    console.error('Inventory error:', e);
    return { 
      statusCode: 500, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ error: e.message }) 
    };
  }
}
