// Simple in-memory storage (will reset on function restart)
let globalState = {};

exports.handler = async (event) => {
  try {
    console.log('=== GET-STATE CALLED ===');
    console.log('Current state:', globalState);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(globalState),
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

// Function to update state (called by set-state)
exports.updateGlobalState = (newState) => {
  globalState = newState;
  console.log('Global state updated:', globalState);
};


