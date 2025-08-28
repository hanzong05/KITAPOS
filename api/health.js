// api/health.js - Health check with Supabase connection test
import { supabase } from '../lib/supabase';

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
      database: 'disconnected',
      server: {
        environment: process.env.NODE_ENV || 'production',
        region: process.env.VERCEL_REGION || 'unknown',
        deployment_url: process.env.VERCEL_URL || 'local'
      }
    };

    // Test Supabase connection
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (!error) {
        healthData.database = 'connected';
        healthData.supabase = {
          connected: true,
          url: process.env.SUPABASE_URL ? 'configured' : 'missing'
        };
      } else {
        healthData.database = 'error';
        healthData.supabase = {
          connected: false,
          error: error.message
        };
      }
    } catch (dbError) {
      console.error('Database health check error:', dbError);
      healthData.database = 'error';
      healthData.supabase = {
        connected: false,
        error: dbError.message
      };
    }

    const statusCode = healthData.database === 'connected' ? 200 : 503;
    return res.status(statusCode).json(healthData);

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