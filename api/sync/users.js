// api/sync/users.js - User sync endpoint for the mobile app
export default async function handler(req, res) {
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
    // Check authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authorization token required' 
      });
    }

    // Demo users data for sync
    const users = [
      {
        id: 'demo-admin-1',
        name: 'Demo Admin',
        email: 'admin@techcorp.com',
        password: 'password123', // In a real app, this would be hashed
        role: 'super_admin',
        phone: '+1-555-0100',
        is_active: true,
        last_login: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 'demo-manager-1',
        name: 'Demo Manager',
        email: 'manager@techcorp.com', 
        password: 'password123',
        role: 'manager',
        phone: '+1-555-0101',
        is_active: true,
        last_login: null,
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:00:00Z'
      },
      {
        id: 'demo-cashier-1',
        name: 'Demo Cashier',
        email: 'cashier@techcorp.com',
        password: 'password123', 
        role: 'cashier',
        phone: '+1-555-0102',
        is_active: true,
        last_login: null,
        created_at: '2024-01-17T10:00:00Z',
        updated_at: '2024-01-17T10:00:00Z'
      },
      {
        id: 'demo-cashier-2',
        name: 'Demo Cashier 2',
        email: 'cashier2@techcorp.com',
        password: 'password123',
        role: 'cashier', 
        phone: '+1-555-0103',
        is_active: true,
        last_login: null,
        created_at: '2024-01-18T10:00:00Z',
        updated_at: '2024-01-18T10:00:00Z'
      }
    ];

    // Get query parameters for filtering
    const { store_id, role, is_active, limit } = req.query;

    let filteredUsers = [...users];

    // Apply filters
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }

    if (is_active !== undefined) {
      const activeFilter = is_active === 'true';
      filteredUsers = filteredUsers.filter(user => user.is_active === activeFilter);
    }

    // Apply limit
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        filteredUsers = filteredUsers.slice(0, limitNum);
      }
    }

    // Return the users data
    return res.status(200).json({
      users: filteredUsers,
      count: filteredUsers.length,
      total: users.length,
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