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

    const { data: box_id, error } = await supabase.rpc('create_box', { p_items: items });
    if (error) {
      const code = /Insufficient stock/i.test(error.message) ? 409 : 500;
      return { statusCode: code, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ box_id })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
