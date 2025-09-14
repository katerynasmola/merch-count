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

    // Симулюємо створення боксу (без Supabase)
    const box_id = `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Box created:', box_id, 'with items:', items);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ box_id, success: true })
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
