// lib/supabase.js - Complete Supabase client for Vercel functions
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET || 'your-fallback-secret-key';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Regular client for read operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Service role client for admin operations (if needed)
export const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey)
  : supabase;

// Password hashing utilities
export const hashPassword = async (password) => {
  try {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Password hashing failed');
  }
};

export const verifyPassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

// JWT token utilities
export const generateToken = (userId, email, role) => {
  try {
    const payload = {
      userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    return jwt.sign(payload, jwtSecret);
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Token generation failed');
  }
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// Database helper functions
export const createUser = async (userData) => {
  try {
    const { name, email, password, phone, role } = userData;
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Insert user
    const { data, error } = await supabase
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
      console.error('User creation error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
};

export const findUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Find user error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Find user by email error:', error);
    throw error;
  }
};

export const findUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, store_id, last_login, created_at')
      .eq('id', userId)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Find user by ID error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Find user by ID error:', error);
    throw error;
  }
};

export const updateUserLastLogin = async (userId) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) {
      console.error('Update last login error:', error);
      // Don't throw here, as this is not critical
    }
  } catch (error) {
    console.error('Update last login error:', error);
    // Don't throw here, as this is not critical
  }
};

export const getAllUsers = async (filters = {}) => {
  try {
    let query = supabase
      .from('users')
      .select('id, name, email, role, phone, store_id, is_active, last_login, created_at, updated_at');
    
    // Apply filters
    if (filters.store_id) {
      query = query.eq('store_id', filters.store_id);
    }
    
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    } else {
      query = query.eq('is_active', true); // Default to active users
    }
    
    // Apply limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    // Order by creation date
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Get all users error:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Get all users error:', error);
    throw error;
  }
};

// Test database connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
};

// Error handler utility
export const handleDatabaseError = (error, operation = 'database operation') => {
  console.error(`Database error during ${operation}:`, error);
  
  // Common Supabase error codes
  switch (error.code) {
    case 'PGRST116':
      return { error: 'Record not found', status: 404 };
    case '23505':
      return { error: 'Record already exists', status: 409 };
    case '23503':
      return { error: 'Referenced record not found', status: 400 };
    case '42501':
      return { error: 'Insufficient permissions', status: 403 };
    default:
      return { error: 'Database operation failed', status: 500 };
  }
};