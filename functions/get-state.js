const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  try {
    console.log('=== GET-STATE CALLED ===');
    
    // Try to read state from file
    const stateFile = path.join('/tmp', 'app-state.json');
    let state = {};
    
    try {
      if (fs.existsSync(stateFile)) {
        const data = fs.readFileSync(stateFile, 'utf8');
        state = JSON.parse(data);
        console.log('State loaded from file:', state);
      } else {
        console.log('No state file found, returning empty state');
      }
    } catch (fileError) {
      console.log('Error reading state file:', fileError.message);
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


