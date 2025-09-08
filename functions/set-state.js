const { getMutableJSON } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const newState = JSON.parse(event.body);
    const stateBlob = getMutableJSON('app-state', { siteID: process.env.SITE_ID || 'prod' });
    await stateBlob.set('current-state', newState);
    return { statusCode: 200, body: 'State saved' };
  } catch (error) {
    console.error('Error setting state:', error);
    return { statusCode: 500, body: 'Error saving state' };
  }
};


