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
    const { updates } = JSON.parse(event.body || '{}');
    if (!Array.isArray(updates) || updates.length === 0) {
      return { statusCode: 400, body: 'No updates provided' };
    }

    console.log('Updating inventory with:', updates);

    // Оновлюємо кожен товар в Supabase
    for (const update of updates) {
      const { sku, variant, qty } = update;
      
      if (!sku || typeof qty !== 'number') {
        console.warn('Invalid update:', update);
        continue;
      }

      try {
        // Знаходимо товар за SKU та variant
        const { data: items, error: itemsError } = await supabase
          .from('items')
          .select('id')
          .eq('sku', sku)
          .single();

        if (itemsError) {
          console.error('Error finding item:', itemsError);
          continue;
        }

        // Оновлюємо кількість в stock
        const { error: stockError } = await supabase
          .from('stock')
          .update({ 
            qty: qty,
            updated_at: new Date().toISOString()
          })
          .eq('item_id', items.id)
          .eq('variant', variant);

        if (stockError) {
          console.error('Error updating stock:', stockError);
        } else {
          console.log(`Updated ${sku} ${variant}: ${qty}`);
        }
      } catch (itemError) {
        console.error('Error processing update:', itemError);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, updated: updates.length })
    };
  } catch (error) {
    console.error('Update inventory error:', error);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }) 
    };
  }
}
