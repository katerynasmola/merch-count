import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export async function handler() {
  try {
    const { data, error } = await supabase
      .from('stock')
      .select('id, qty, variant, items ( sku, name )') // join по FK item_id → items.id
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
