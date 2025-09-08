const fs = require('fs');
const path = require('path');

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
    
    // Save state to file
    const stateFile = path.join('/tmp', 'app-state.json');
    try {
      fs.writeFileSync(stateFile, JSON.stringify(newState, null, 2));
      console.log('State saved to file successfully');
    } catch (fileError) {
      console.error('Error saving state file:', fileError.message);
      return { 
        statusCode: 500, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to save state file' })
      };
    }
    
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


