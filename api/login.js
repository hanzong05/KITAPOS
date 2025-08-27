// api/auth/login.js - Login endpoint
export default async function handler(req, res) {
  // Set CORS headers
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Demo users for testing
    const demoUsers = [
      {
        id: 'demo-admin-1',
        email: 'admin@techcorp.com',
        name: 'Demo Admin',
        role: 'super_admin',
        phone: '+1-555-0100',
        password: 'password123'
      },
      {
        id: 'demo-manager-1', 
        email: 'manager@techcorp.com',
        name: 'Demo Manager',
        role: 'manager',
        phone: '+1-555-0101',
        password: 'password123'
      },
      {
        id: 'demo-cashier-1',
        email: 'cashier@techcorp.com', 
        name: 'Demo Cashier',
        role: 'cashier',
        phone: '+1-555-0102',
        password: 'password123'
      }
    ];

    // Find user by email and password
    const user = demoUsers.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === password
    );

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Generate a simple JWT-like token (for demo purposes)
    const token = `demo_token_${user.id}_${Date.now()}`;

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      user: userWithoutPassword,
      token,
      source: 'supabase'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

// api/auth/register.js - Registration endpoint
export function registerHandler(req, res) {
  // Set CORS headers
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

    // Check if email already exists (in a real app, check your database)
    if (email.toLowerCase() === 'admin@techcorp.com') {
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }

    // Create new user
    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      role: role || 'cashier'
    };

    // Generate token
    const token = `demo_token_${newUser.id}_${Date.now()}`;

    return res.status(201).json({
      user: newUser,
      token,
      source: 'supabase',
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

// api/auth/profile.js - Profile endpoint
export function profileHandler(req, res) {
  // Set CORS headers
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
      return res.status(401).json({ 
        error: 'Authorization token required' 
      });
    }

    // In a real app, validate the JWT token here
    const token = authHeader.substring(7);
    
    // For demo purposes, return user based on token
    const user = {
      id: 'demo-user-1',
      name: 'Demo User',
      email: 'demo@techcorp.com',
      role: 'cashier'
    };

    return res.status(200).json({
      user
    });

  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

// api/auth/logout.js - Logout endpoint
export function logoutHandler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // In a real app, you might want to invalidate the token
  return res.status(200).json({
    message: 'Logged out successfully'
  });
}