// api/auth/register.js - Registration with Supabase
import { supabase, hashPassword } from '../../lib/supabase';

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
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email, and password are required' 
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }

    // Hash password (use bcrypt in production)
    const passwordHash = hashPassword(password);

    // Insert new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        phone: phone || null,
        role: role || 'cashier',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    // Generate token
    const token = `jwt_${newUser.id}_${Date.now()}`;

    // Return user data without password
    const { password_hash, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      user: userWithoutPassword,
      token,
      source: 'supabase',
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}