// api/auth/profile.js - Profile with Supabase
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
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    
    // Extract user ID from token (in production, verify JWT properly)
    const userId = token.split('_')[1];
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, store_id, last_login, created_at')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });

  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}