exports.handler = async (event) => {
  try {
    console.log('set-state called with method:', event.httpMethod);
    console.log('set-state body:', event.body);
    
    if (event.httpMethod !== 'POST') {
      console.log('Method not allowed:', event.httpMethod);
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    const newState = JSON.parse(event.body);
    console.log('Parsed state:', newState);
    
    // For now, just return success without using Blobs
    // We'll add Blobs back once we confirm the function is being called
    return { 
      statusCode: 200, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'State received' })
    };
  } catch (error) {
    console.error('Error in set-state:', error);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};


