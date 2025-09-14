import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export async function handler() {
  try {
    console.log('Debugging database structure...');
    
    // Перевіряємо таблицю items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .order('id');
    
    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: JSON.stringify({ error: itemsError.message })
      };
    }
    
    // Перевіряємо таблицю stock
    const { data: stock, error: stockError } = await supabase
      .from('stock')
      .select('*')
      .order('id');
    
    if (stockError) {
      console.error('Error fetching stock:', stockError);
      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: JSON.stringify({ error: stockError.message })
      };
    }
    
    // Шукаємо конкретний товар (блокнот)
    const { data: notebookItem, error: notebookItemError } = await supabase
      .from('items')
      .select('*')
      .eq('sku', 'notebook')
      .single();
      
    let notebookStock = null;
    if (!notebookItemError && notebookItem) {
      const { data: stockData, error: stockDataError } = await supabase
        .from('stock')
        .select('*')
        .eq('item_id', notebookItem.id);
      
      if (!stockDataError) {
        notebookStock = stockData;
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
      body: JSON.stringify({
        items: items,
        stock: stock,
        notebook: {
          item: notebookItem,
          stock: notebookStock
        }
      })
    };
  } catch (error) {
    console.error('Debug error:', error);
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
