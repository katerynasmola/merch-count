// Import the get-state module to access globalState
const getStateModule = require('./get-state');

exports.handler = async (event) => {
  try {
    console.log('=== SET-STATE CALLED ===');
    console.log('Method:', event.httpMethod);
    
    if (event.httpMethod !== 'POST') {
      console.log('Method not allowed:', event.httpMethod);
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    const newState = JSON.parse(event.body);
    console.log('Parsed state:', newState);
    
    // Update global state in get-state module
    getStateModule.updateGlobalState(newState);
    console.log('State saved to global storage');
    
    return { 
      statusCode: 200, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'State saved' })
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


