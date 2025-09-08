exports.handler = async (event) => {
  try {
    console.log('=== GET-STATE CALLED ===');
    
    // Try to get state from environment variable
    const stateJson = process.env.APP_STATE || '{}';
    let state = {};
    
    try {
      state = JSON.parse(stateJson);
      console.log('State loaded from environment:', state);
    } catch (parseError) {
      console.log('Error parsing state from environment:', parseError.message);
      state = {};
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
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


