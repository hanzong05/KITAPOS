// api/health.js - Vercel serverless function for health checks
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for health check
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Basic health check response
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected', // You can implement actual DB check here
      server: {
        environment: process.env.NODE_ENV || 'production',
        region: process.env.VERCEL_REGION || 'unknown',
        deployment_url: process.env.VERCEL_URL || 'local'
      }
    };

    // If you have a database connection to test, add it here:
    // try {
    //   await testDatabaseConnection();
    //   healthData.database = 'connected';
    // } catch (dbError) {
    //   healthData.database = 'disconnected';
    //   healthData.status = 'degraded';
    // }

    return res.status(200).json(healthData);

  } catch (error) {
    console.error('Health check error:', error);
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'unknown',
      error: error.message,
      server: {
        environment: process.env.NODE_ENV || 'production',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    });
  }
}