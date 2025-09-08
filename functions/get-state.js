const { getMutableJSON } = require('@netlify/blobs');

exports.handler = async () => {
  try {
    const stateBlob = getMutableJSON('app-state', { siteID: process.env.SITE_ID || 'prod' });
    const state = await stateBlob.get('current-state');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state || {}),
    };
  } catch (error) {
    console.error('Error getting state:', error);
    return { statusCode: 500, body: 'Error getting state' };
  }
};


