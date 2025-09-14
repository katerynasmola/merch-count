import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items } = JSON.parse(event.body || '{}'); // [{stock_id, qty}]
    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: 'No items' };
    }
    for (const i of items) {
      if (!i?.stock_id || !Number.isInteger(i?.qty) || i.qty <= 0) {
        return { statusCode: 400, body: 'Bad item payload' };
      }
    }

    // Спочатку спробуємо створити бокс в Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE) {
      try {
        const { data: box_id, error } = await supabase.rpc('create_box', { p_items: items });
        if (error) {
          const code = /Insufficient stock/i.test(error.message) ? 409 : 500;
          return { statusCode: code, body: JSON.stringify({ error: error.message }) };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ box_id, success: true, source: 'supabase' })
        };
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
        // Fallback to simulation
      }
    }

    // Симулюємо створення боксу (якщо Supabase не налаштований)
    const box_id = `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Box created (simulated):', box_id, 'with items:', items);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ box_id, success: true, source: 'simulation' })
    };
  } catch (e) {
    console.error('Box creation error:', e);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }) 
    };
  }
}
