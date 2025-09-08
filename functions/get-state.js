exports.handler = async () => {
  try {
    console.log('get-state called');
    
    // For now, just return empty state without using Blobs
    // We'll add Blobs back once we confirm the function is being called
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    };
  } catch (error) {
    console.error('Error in get-state:', error);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};


