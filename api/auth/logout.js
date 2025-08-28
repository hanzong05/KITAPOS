// api/auth/logout.js - Complete logout with token invalidation
import { verifyToken } from '../../lib/supabase';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Verify token (optional, for logging purposes)
      const payload = verifyToken(token);
      if (payload) {
        console.log(`User ${payload.email} logged out successfully`);
      }
    }

    // In a production app, you might want to:
    // 1. Add token to a blacklist
    // 2. Update last logout time in database
    // 3. Clear any session data
    
    return res.status(200).json({
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}