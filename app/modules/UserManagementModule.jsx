// components/UserManagementModule.jsx - Complete dashboard module with enhanced staff integration
import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import databaseService from '../../services/database'
import staffService from '../../services/staffService'
import { styles, theme } from '../components/DashboardLayout'

const UserManagementModule = ({ userRole, userStoreId, currentUser }) => {
  const [users, setUsers] = useState([])
  const [staff, setStaff] = useState([])
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [stats, setStats] = useState({
    users: { total: 0, active: 0 },
    staff: { total: 0, active: 0 }
  })
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()

  useEffect(() => {
    // Only load for authorized roles
    if (userRole === 'super_admin' || userRole === 'manager') {
      loadData()
      checkConnection()
    }
  }, [userRole, userStoreId])

  const checkConnection = async () => {
    try {
      const result = await staffService.testConnection()
      setConnectionStatus(result)
    } catch (error) {
      setConnectionStatus({ success: false, error: error.message })
    }
  }

  const loadData = async () => {
    try {
      await Promise.all([loadUsers(), loadStaff()])
    } catch (error) {
      console.error('Error loading user management data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      // Initialize database
      await databaseService.initializeDatabase()
      
      // Get recent users (limit 5 for dashboard display)
      const allUsers = await databaseService.getAllUsers()
      const recentUsers = allUsers.slice(0, 5)
      setUsers(recentUsers)

      // Calculate stats
      const userStats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.is_active).length
      }
      
      setStats(prev => ({ ...prev, users: userStats }))
      
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    }
  }

  const loadStaff = async () => {
    try {
      // Use staffService to get staff with proper filtering
      const staffData = await staffService.getStaff(currentUser || {
        role: userRole,
        store_id: userStoreId
      })
      
      setStaff(staffData.slice(0, 5)) // Limit to 5 for dashboard display

      // Get staff stats
      const staffStats = await staffService.getStaffStats(currentUser || {
        role: userRole,
        store_id: userStoreId
      })
      
      setStats(prev => ({ ...prev, staff: staffStats }))
      
    } catch (error) {
      console.error('Error loading staff:', error)
      setStaff([])
    }
  }

  const handleQuickAction = (action) => {
    switch (action) {
      case 'manage_all':
        router.push('/user-management')
        break
        
      case 'add_user':
        Alert.alert(
          'Add New User',
          'This feature would typically navigate to a user creation form.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Registration', onPress: () => router.push('/register') }
          ]
        )
        break
        
      case 'manage_staff':
        router.push('/user-management')
        break
        
      case 'sync_data':
        Alert.alert(
          'Sync Data',
          'This will sync user and staff data from Supabase.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sync Now', onPress: handleDataSync }
          ]
        )
        break

      case 'test_connection':
        handleConnectionTest()
        break
    }
  }

  const handleDataSync = async () => {
    try {
      setLoading(true)
      
      // Force refresh staff data from Supabase
      if (currentUser) {
        await staffService.getStaff(currentUser, { forceRefresh: true })
      }
      
      Alert.alert('Success', 'Data sync completed successfully!')
      loadData() // Refresh data after sync
    } catch (error) {
      Alert.alert('Error', 'Failed to sync data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectionTest = async () => {
    try {
      const result = await staffService.testConnection()
      Alert.alert(
        'Connection Test', 
        result.success ? 
          `✅ Connected to Supabase\nStaff count: ${result.count}` : 
          `❌ Connection failed\nError: ${result.error}`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      Alert.alert('Connection Error', error.message)
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return '#dc2626'
      case 'manager': return '#ea580c'
      case 'cashier': return '#0891b2'
      default: return '#6b7280'
    }
  }

  const getPositionColor = (position) => {
    switch (position?.toLowerCase()) {
      case 'supervisor': 
      case 'manager': 
        return '#ea580c'
      case 'cashier': 
      case 'staff':
        return '#0891b2'
      case 'sales associate': 
        return '#7c3aed'
      default: 
        return '#6b7280'
    }
  }

  // 🚫 ONLY FOR AUTHORIZED ROLES
  if (userRole !== 'super_admin' && userRole !== 'manager') {
    return (
      <View style={[styles.module, { opacity: 0.6 }]}>
        <View style={styles.moduleHeader}>
          <Ionicons name="lock-closed" size={20} color={theme.textLight} />
          <Text style={styles.moduleTitle}>User Management</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Access restricted to managers and admins</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.module}>
      {/* Module Header */}
      <View style={styles.moduleHeader}>
        <View style={styles.moduleHeaderLeft}>
          <Ionicons name="people" size={20} color={theme.primary} />
          <Text style={styles.moduleTitle}>User Management</Text>
          
          {/* Connection Status Indicator */}
          <View style={[styles.connectionDot, { 
            backgroundColor: connectionStatus?.success ? '#10b981' : '#ef4444',
            marginLeft: 8
          }]} />
        </View>
        <View style={styles.moduleActionsHeader}>
          <TouchableOpacity 
            style={styles.moduleAction}
            onPress={() => handleQuickAction('sync_data')}
          >
            <Ionicons name="sync" size={16} color={theme.primary} />
          </TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.moduleAction}
              onPress={() => handleQuickAction('test_connection')}
            >
              <Ionicons name="wifi" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.users.total}</Text>
          <Text style={styles.statLabel}>Users</Text>
          <Text style={styles.statSubtext}>{stats.users.active} active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.staff.total}</Text>
          <Text style={styles.statLabel}>Staff</Text>
          <Text style={styles.statSubtext}>
            {stats.staff.active} active
            {userRole !== 'super_admin' && userStoreId && (
              <Text style={{ fontSize: 10, color: theme.textLight }}> (Store {userStoreId})</Text>
            )}
          </Text>
        </View>
      </View>

      {/* Connection Status */}
      <View style={styles.connectionStatus}>
        <Text style={[styles.connectionText, {
          color: connectionStatus?.success ? '#10b981' : '#ef4444'
        }]}>
          {connectionStatus?.success ? '🟢 Online' : '🔴 Offline Mode'}
        </Text>
      </View>

      {/* Recent Users List */}
      {users.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Users</Text>
          <View style={styles.list}>
            {users.map((user, index) => (
              <View key={user.id || index} style={styles.listItem}>
                <View style={[styles.avatar, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                  <Text style={[styles.avatarText, { color: getRoleColor(user.role) }]}>
                    {user.name?.charAt(0) || 'U'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{user.name}</Text>
                  <Text style={styles.itemSubtitle}>{user.role.replace('_', ' ').toUpperCase()}</Text>
                  <Text style={styles.captionText}>{user.email}</Text>
                </View>
                <View style={[styles.statusBadge, { 
                  backgroundColor: user.is_active ? theme.success + '20' : theme.error + '20'
                }]}>
                  <Text style={[styles.statusText, {
                    color: user.is_active ? theme.success : theme.error
                  }]}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recent Staff List */}
      {staff.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Staff</Text>
          <View style={styles.list}>
            {staff.map((staffMember, index) => (
              <View key={staffMember.id || index} style={styles.listItem}>
                <View style={[styles.avatar, { backgroundColor: getPositionColor(staffMember.role || staffMember.position) + '20' }]}>
                  <Text style={[styles.avatarText, { color: getPositionColor(staffMember.role || staffMember.position) }]}>
                    {staffMember.name?.charAt(0) || 'S'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{staffMember.name}</Text>
                  <Text style={styles.itemSubtitle}>{staffMember.role || staffMember.position || 'Staff'}</Text>
                  <Text style={styles.captionText}>
                    ID: {staffMember.staff_id} | Store: {staffMember.store_id}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { 
                  backgroundColor: staffMember.is_active ? theme.success + '20' : theme.error + '20'
                }]}>
                  <Text style={[styles.statusText, {
                    color: staffMember.is_active ? theme.success : theme.error
                  }]}>
                    {staffMember.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {users.length === 0 && staff.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={theme.textLight} />
          <Text style={styles.emptyText}>No users or staff found</Text>
          <Text style={styles.emptySubtext}>
            {userRole === 'super_admin' ? 
              'No users registered in the system' :
              `No data for store ${userStoreId || 'your store'}`
            }
          </Text>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading management data...</Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.moduleActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => handleQuickAction('manage_all')}
        >
          <Ionicons name="settings" size={16} color={theme.white} />
          <Text style={styles.primaryActionText}>Manage All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryAction]}
          onPress={() => handleQuickAction('add_user')}
        >
          <Ionicons name="person-add" size={16} color={theme.primary} />
          <Text style={styles.secondaryActionText}>Add User</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// Additional styles for the updated module
const moduleStyles = {
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  moduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleActionsHeader: {
    flexDirection: 'row',
    gap: 8,
  },
  moduleAction: {
    padding: 4,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionStatus: {
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.cardSecondary || '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.border || '#e2e8f0',
    marginHorizontal: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text || '#1f2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary || '#6b7280',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 10,
    color: theme.textLight || '#9ca3af',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text || '#1f2937',
    marginBottom: 8,
  },
  list: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border || '#e2e8f0',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text || '#1f2937',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary || '#6b7280',
    marginBottom: 2,
  },
  captionText: {
    fontSize: 10,
    color: theme.textLight || '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moduleActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  primaryAction: {
    backgroundColor: theme.primary || '#3b82f6',
  },
  secondaryAction: {
    backgroundColor: theme.background || '#fff',
    borderWidth: 1,
    borderColor: theme.primary || '#3b82f6',
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.white || '#fff',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary || '#3b82f6',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 12,
    color: theme.textLight || '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary || '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 11,
    color: theme.textLight || '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
}

// Merge with existing styles if they exist
if (styles && typeof styles === 'object') {
  Object.assign(styles, moduleStyles)
} else {
  // If styles don't exist, create them
  const styles = moduleStyles
}

export default UserManagementModule