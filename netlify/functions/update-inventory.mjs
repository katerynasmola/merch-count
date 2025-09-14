import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export async function handler(event) {
  // Обробляємо OPTIONS запити для CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: 'Method Not Allowed' 
    };
  }

  try {
    const { updates } = JSON.parse(event.body || '{}');
    if (!Array.isArray(updates) || updates.length === 0) {
      return { statusCode: 400, body: 'No updates provided' };
    }

    console.log('Updating inventory with:', updates);

    // Оновлюємо кожен товар в Supabase
    for (const update of updates) {
      const { sku, variant = 'default', qty } = update;
      
      console.log(`Processing update: sku=${sku}, variant=${variant}, qty=${qty}`);
      
      if (!sku || typeof qty !== 'number') {
        console.warn('Invalid update:', update);
        continue;
      }

      try {
        console.log(`Looking for item: sku=${sku}, variant=${variant}`);
        
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
        
        console.log(`Found item with id: ${items.id}`);

        // Спочатку перевіряємо, чи існує запис для оновлення
        const { data: existingStock, error: findError } = await supabase
          .from('stock')
          .select('*')
          .eq('item_id', items.id)
          .eq('variant', variant);
          
        if (findError) {
          console.error('Error finding stock record:', findError);
          continue;
        }
        
        if (!existingStock || existingStock.length === 0) {
          console.error(`No stock record found for item_id=${items.id}, variant=${variant}`);
          continue;
        }
        
        console.log(`Found ${existingStock.length} stock record(s):`, existingStock);
        
        // Оновлюємо кількість в stock
        console.log(`Updating stock: item_id=${items.id}, variant=${variant}, qty=${qty}`);
        
        const { data: updateResult, error: stockError } = await supabase
          .from('stock')
          .update({ 
            qty: qty,
            updated_at: new Date().toISOString()
          })
          .eq('item_id', items.id)
          .eq('variant', variant)
          .select();

        if (stockError) {
          console.error('Error updating stock:', stockError);
        } else {
          console.log(`✅ Successfully updated ${sku} ${variant}: ${qty}`);
          console.log('Update result:', updateResult);
        }
        
        // Перевіряємо, чи запис дійсно оновився
        const { data: checkData, error: checkError } = await supabase
          .from('stock')
          .select('qty')
          .eq('item_id', items.id)
          .eq('variant', variant)
          .single();
          
        if (checkError) {
          console.error('Error checking updated record:', checkError);
        } else {
          console.log(`Verified: ${sku} ${variant} now has qty: ${checkData.qty}`);
        }
      } catch (itemError) {
        console.error('Error processing update:', itemError);
      }
    }

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ success: true, updated: updates.length })
    };
  } catch (error) {
    console.error('Update inventory error:', error);
    return { 
      statusCode: 500, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ error: error.message }) 
    };
  }
}
