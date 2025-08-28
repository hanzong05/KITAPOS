// api/sync/users.js - User sync with Supabase
import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authorization token required' 
      });
    }

    // Get query parameters for filtering
    const { store_id, role, is_active, limit } = req.query;

    // Build query
    let query = supabase
      .from('users')
      .select('id, name, email, role, phone, store_id, is_active, last_login, created_at, updated_at');

    // Apply filters
    if (store_id) {
      query = query.eq('store_id', store_id);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    } else {
      // Default to active users only
      query = query.eq('is_active', true);
    }

    // Apply limit
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query = query.limit(limitNum);
      }
    }

    // Order by created date
    query = query.order('created_at', { ascending: false });

    // Execute query
    const { data: users, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    // Transform data to match expected format (add password for compatibility)
    const transformedUsers = users.map(user => ({
      ...user,
      password: 'password123' // For demo compatibility with local auth
    }));

    // Return the users data
    return res.status(200).json({
      users: transformedUsers,
      count: transformedUsers.length,
      total: count || transformedUsers.length,
      sync_timestamp: new Date().toISOString(),
      filters: {
        store_id: store_id || null,
        role: role || null,
        is_active: is_active || null,
        limit: limit || null
      }
    });

  } catch (error) {
    console.error('User sync error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}