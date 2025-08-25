// services/staffService.js - Fixed version with proper Supabase deletion
import staffDatabaseService from './staffDatabase'
import authService from './authService'

class StaffService {
  constructor() {
  this.baseURL = 'https://kitapos-two.vercel.app'
    // Cache to map local IDs to Supabase IDs
    this.idMappingCache = new Map()
  }

  getAuthHeaders() {
    const token = authService.token
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  // Test connection and auth
  async testConnection() {
    try {
      console.log('🔍 Testing connection to Supabase...')
      
      const response = await fetch(`${this.baseURL}/staff`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })
      
      console.log('🔍 Connection test response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Connection successful, staff count:', data.staff?.length || 0)
        
        // Cache ID mappings when fetching staff
        if (data.staff && Array.isArray(data.staff)) {
          data.staff.forEach(staff => {
            if (staff.id && staff.staff_id) {
              this.idMappingCache.set(staff.staff_id, staff.id)
            }
          })
        }
        
        return { success: true, count: data.staff?.length || 0 }
      } else {
        const errorText = await response.text()
        console.error('❌ Connection failed:', errorText)
        return { success: false, error: errorText }
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error)
      return { success: false, error: error.message }
    }
  }

  // Get Supabase ID from staff_id
  async getSupabaseIdFromStaffId(staffId) {
    try {
      // First check cache
      if (this.idMappingCache.has(staffId)) {
        return this.idMappingCache.get(staffId)
      }

      // If not in cache, fetch from Supabase
      console.log('🔍 Looking up Supabase ID for staff_id:', staffId)
      
      const response = await fetch(`${this.baseURL}/staff?staff_id=${staffId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        if (data.staff && data.staff.length > 0) {
          const supabaseId = data.staff[0].id
          // Cache the mapping
          this.idMappingCache.set(staffId, supabaseId)
          console.log('✅ Found Supabase ID:', supabaseId)
          return supabaseId
        }
      }
      
      console.log('⚠️ No Supabase ID found for staff_id:', staffId)
      return null
    } catch (error) {
      console.error('❌ Failed to get Supabase ID:', error)
      return null
    }
  }

  // Fetch staff from Supabase with store filtering
  async fetchStaffFromSupabase(currentUser = null) {
    try {
      console.log('🔄 Fetching staff from Supabase for user:', currentUser?.role, currentUser?.store_id)
      
      let url = `${this.baseURL}/staff`
      
      // Add store filter for super admin if needed
      if (currentUser?.role === 'super_admin' && currentUser?.store_id) {
        url += `?store_id=${currentUser.store_id}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Staff fetched from Supabase:', data.count || data.staff?.length || 0)
      
      // Cache ID mappings
      if (data.staff && Array.isArray(data.staff)) {
        data.staff.forEach(staff => {
          if (staff.id && staff.staff_id) {
            this.idMappingCache.set(staff.staff_id, staff.id)
          }
        })
      }
      
      return data.staff || []

    } catch (error) {
      console.error('❌ Failed to fetch staff from Supabase:', error)
      throw error
    }
  }

  // Delete staff from Supabase using the correct ID
  async deleteStaffFromSupabase(staffId, staffData = null) {
    try {
      console.log('🗑️ Preparing to delete staff from Supabase:', staffId)

      // Determine the correct Supabase ID to use
      let supabaseId = staffId
      
      // If we have staff data, use staff_id to lookup the Supabase ID
      if (staffData && staffData.staff_id) {
        const mappedId = await this.getSupabaseIdFromStaffId(staffData.staff_id)
        if (mappedId) {
          supabaseId = mappedId
          console.log('📍 Using mapped Supabase ID:', supabaseId)
        } else {
          console.log('⚠️ Could not find Supabase ID, attempting with local ID')
        }
      }
      // If the ID looks like a local ID (starts with 'staff-'), try to find the Supabase ID
      else if (staffId.startsWith('staff-')) {
        console.log('⚠️ Local ID detected, cannot delete from Supabase without staff_id')
        throw new Error('Cannot delete from Supabase: missing staff_id for mapping')
      }

      console.log('🗑️ Deleting from Supabase with ID:', supabaseId)

      const response = await fetch(`${this.baseURL}/staff/${supabaseId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      })

      const responseText = await response.text()
      console.log('📨 Supabase delete response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      })

      if (!response.ok) {
        let errorData = {}
        
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { error: responseText || `HTTP ${response.status}` }
        }
        
        console.error('❌ Supabase delete error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        })
        
        throw new Error(errorData.error || errorData.message || `Delete failed: ${response.status}`)
      }

      let result = {}
      try {
        result = JSON.parse(responseText)
      } catch {
        result = { success: true }
      }

      console.log('✅ Staff deleted from Supabase')
      
      // Clear from cache
      if (staffData && staffData.staff_id) {
        this.idMappingCache.delete(staffData.staff_id)
      }
      
      return result

    } catch (error) {
      console.error('❌ Failed to delete staff from Supabase:', error)
      throw error
    }
  }

  // Delete staff with dual persistence - FIXED VERSION
  async deleteStaff(staffId, currentUser) {
    try {
      console.log('🗑️ Deleting staff with ID:', staffId)
      
      if (!currentUser) {
        throw new Error('User context required')
      }

      // First, get the full staff data from local database
      await staffDatabaseService.initializeStaffDatabase()
      const staffData = await staffDatabaseService.getStaffById(staffId)
      
      if (!staffData) {
        throw new Error('Staff member not found')
      }

      console.log('📋 Staff data found:', {
        id: staffData.id,
        staff_id: staffData.staff_id,
        name: staffData.name
      })

      let supabaseDeleted = false
      let localDeleted = false

      // Try to delete from Supabase first
      try {
        const connectionTest = await this.testConnection()
        if (connectionTest.success) {
          // Pass both the ID and the staff data for proper mapping
          await this.deleteStaffFromSupabase(staffId, staffData)
          supabaseDeleted = true
          console.log('✅ Staff deleted from Supabase')
        } else {
          console.log('⚠️ No Supabase connection, deleting locally only')
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase deletion failed:', supabaseError.message)
        // Continue with local deletion even if Supabase fails
      }

      // Delete from local database
      try {
        await staffDatabaseService.deleteStaff(staffId, currentUser)
        localDeleted = true
        console.log('✅ Staff deleted locally')
      } catch (localError) {
        console.error('❌ Local deletion failed:', localError)
        throw localError
      }

      return { 
        success: true, 
        supabaseDeleted, 
        localDeleted,
        message: supabaseDeleted ? 
          'Staff deleted from both Supabase and local database' : 
          'Staff deleted locally (Supabase unavailable)'
      }

    } catch (error) {
      console.error('❌ Staff deletion failed:', error)
      throw error
    }
  }

  // Sync staff from Supabase to local database
  async syncStaffFromSupabase(currentUser) {
    try {
      console.log('🔄 Syncing staff from Supabase...')
      
      await staffDatabaseService.initializeStaffDatabase()
      
      const supabaseStaff = await this.fetchStaffFromSupabase(currentUser)
      
      if (supabaseStaff.length === 0) {
        console.log('ℹ️ No staff found on Supabase')
        return { synced: 0, total: 0 }
      }

      let synced = 0

      for (const staff of supabaseStaff) {
        try {
          const localStaffData = {
            id: staff.id, // Keep the Supabase ID
            staff_id: staff.staff_id,
            name: staff.name,
            store_id: staff.store_id,
            passcode: staff.passcode,
            role: staff.position || staff.role || 'staff',
            hourly_rate: parseFloat(staff.hourly_rate || 15.00),
            image_url: staff.image_url,
            is_active: staff.is_active ? 1 : 0,
            created_by: staff.created_by,
            created_at: staff.created_at,
            updated_at: staff.updated_at || staff.created_at
          }

          await staffDatabaseService.db.runAsync(`
            INSERT OR REPLACE INTO staff (id, staff_id, name, store_id, passcode, role, hourly_rate, image_url, is_active, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            localStaffData.id,
            localStaffData.staff_id,
            localStaffData.name,
            localStaffData.store_id,
            localStaffData.passcode,
            localStaffData.role,
            localStaffData.hourly_rate,
            localStaffData.image_url,
            localStaffData.is_active,
            localStaffData.created_by,
            localStaffData.created_at,
            localStaffData.updated_at
          ])

          synced++
        } catch (error) {
          console.error(`❌ Failed to sync staff ${staff.staff_id}:`, error)
        }
      }

      console.log(`🎉 Sync completed: ${synced}/${supabaseStaff.length} synced`)
      return { synced, total: supabaseStaff.length }

    } catch (error) {
      console.error('❌ Staff sync failed:', error)
      throw error
    }
  }

  // Create staff with dual persistence
  async createStaff(staffData, currentUser) {
    try {
      console.log('📝 Creating staff:', staffData.name)
      
      if (!currentUser) {
        throw new Error('User context required')
      }

      // Test connection first
      const connectionTest = await this.testConnection()
      if (!connectionTest.success) {
        console.log('⚠️ No Supabase connection, creating locally only')
      }

      // Check for existing staff_id before creation
      await staffDatabaseService.initializeStaffDatabase()
      
      const existing = await staffDatabaseService.db.getFirstAsync(
        'SELECT id, staff_id FROM staff WHERE staff_id = ? AND is_active = 1',
        [staffData.staff_id.toUpperCase()]
      )

      if (existing) {
        throw new Error(`Staff ID "${staffData.staff_id}" already exists. Please use a different ID.`)
      }

      let createdStaff = null

      // Try Supabase first if connection is good
      if (connectionTest.success) {
        try {
          createdStaff = await this.createStaffOnSupabase(staffData, currentUser)
          
          // Sync to local if Supabase succeeded
          if (createdStaff) {
            // Cache the ID mapping
            this.idMappingCache.set(createdStaff.staff_id, createdStaff.id)
            
            const localData = {
              id: createdStaff.id, // Use Supabase ID
              staff_id: createdStaff.staff_id,
              name: createdStaff.name,
              store_id: createdStaff.store_id,
              passcode: createdStaff.passcode,
              role: createdStaff.position || createdStaff.role || 'staff',
              hourly_rate: parseFloat(createdStaff.hourly_rate || 15.00),
              image_url: createdStaff.image_url,
              is_active: 1,
              created_by: createdStaff.created_by || currentUser.id,
              created_at: createdStaff.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            await staffDatabaseService.db.runAsync(`
              INSERT OR REPLACE INTO staff (id, staff_id, name, store_id, passcode, role, hourly_rate, image_url, is_active, created_by, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              localData.id,
              localData.staff_id,
              localData.name,
              localData.store_id,
              localData.passcode,
              localData.role,
              localData.hourly_rate,
              localData.image_url,
              localData.is_active,
              localData.created_by,
              localData.created_at,
              localData.updated_at
            ])

            console.log('✅ Staff synced to local database')
            return createdStaff
          }
        } catch (supabaseError) {
          console.log('⚠️ Supabase creation failed, trying local only:', supabaseError.message)
          // Continue to local creation below
        }
      }
      
      // Fallback to local only creation
      try {
        // Clear any deleted staff with same ID first
        await staffDatabaseService.db.runAsync(
          'DELETE FROM staff WHERE staff_id = ? AND is_active = 0',
          [staffData.staff_id.toUpperCase()]
        )

        // Create new staff locally
        const newStaff = {
          id: `staff-${Date.now()}`,
          staff_id: String(staffData.staff_id).toUpperCase().trim(),
          name: String(staffData.name).trim(),
          store_id: String(staffData.store_id),
          passcode: String(staffData.passcode).trim(),
          role: String(staffData.role || 'staff'),
          hourly_rate: parseFloat(staffData.hourly_rate || 15.00),
          image_url: staffData.image_url || null,
          is_active: 1,
          created_by: currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        await staffDatabaseService.db.runAsync(`
          INSERT INTO staff (id, staff_id, name, store_id, passcode, role, hourly_rate, image_url, is_active, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newStaff.id,
          newStaff.staff_id,
          newStaff.name,
          newStaff.store_id,
          newStaff.passcode,
          newStaff.role,
          newStaff.hourly_rate,
          newStaff.image_url,
          newStaff.is_active,
          newStaff.created_by,
          newStaff.created_at,
          newStaff.updated_at
        ])

        console.log('✅ Staff created locally (offline mode)')
        return newStaff
      } catch (localError) {
        console.error('❌ Local creation also failed:', localError)
        throw new Error(`Creation failed: ${localError.message}`)
      }

    } catch (error) {
      console.error('❌ Staff creation failed:', error)
      throw error
    }
  }

  // Create staff on Supabase
  async createStaffOnSupabase(staffData, currentUser) {
    try {
      console.log('📝 Creating staff on Supabase:', staffData.name)
      
      // For managers, ensure store_id is set to their store
      if (currentUser?.role === 'manager' && currentUser.store_id) {
        staffData.store_id = currentUser.store_id
      }

      // Map local 'role' to Supabase 'position' field
      const supabaseStaffData = {
        name: staffData.name,
        staff_id: staffData.staff_id,
        store_id: staffData.store_id,
        passcode: staffData.passcode,
        image_url: staffData.image_url || null,
        position: staffData.role || 'staff',
        hourly_rate: parseFloat(staffData.hourly_rate || 15.00),
        is_active: true
      }

      console.log('📤 Sending to Supabase:', {
        ...supabaseStaffData,
        passcode: '***'
      })

      const response = await fetch(`${this.baseURL}/staff`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(supabaseStaffData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData = {}
        
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` }
        }
        
        console.error('❌ Supabase response error:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorData
        })
        
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status} - ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Staff created on Supabase:', result.staff?.staff_id)
      return result.staff

    } catch (error) {
      console.error('❌ Failed to create staff on Supabase:', {
        message: error.message,
        stack: error.stack,
        staffData: {
          name: staffData.name,
          staff_id: staffData.staff_id,
          store_id: staffData.store_id,
          role: staffData.role
        }
      })
      throw error
    }
  }

  // Update staff on Supabase
  async updateStaffOnSupabase(staffId, updateData) {
    try {
      console.log('📝 Updating staff on Supabase:', staffId)

      // Map local 'role' to Supabase 'position' field
      const supabaseUpdateData = { ...updateData }
      if (updateData.role) {
        supabaseUpdateData.position = updateData.role
        delete supabaseUpdateData.role
      }

      const response = await fetch(`${this.baseURL}/staff/${staffId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(supabaseUpdateData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData = {}
        
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` }
        }
        
        throw new Error(errorData.error || errorData.message || `Update failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Staff updated on Supabase')
      return result.staff

    } catch (error) {
      console.error('❌ Failed to update staff on Supabase:', error)
      throw error
    }
  }

  // Update staff with dual persistence
  async updateStaff(staffId, updateData, currentUser) {
    try {
      console.log('📝 Updating staff:', staffId)
      
      if (!currentUser) {
        throw new Error('User context required')
      }

      let supabaseUpdated = false
      let localUpdated = false

      // Try to update on Supabase first
      try {
        const connectionTest = await this.testConnection()
        if (connectionTest.success) {
          await this.updateStaffOnSupabase(staffId, updateData)
          supabaseUpdated = true
          console.log('✅ Staff updated on Supabase')
        } else {
          console.log('⚠️ No Supabase connection, updating locally only')
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase update failed:', supabaseError.message)
        // Continue with local update even if Supabase fails
      }

      // Update local database
      try {
        const updatedStaff = await staffDatabaseService.updateStaff(staffId, updateData, currentUser)
        localUpdated = true
        console.log('✅ Staff updated locally')
        return updatedStaff
      } catch (localError) {
        console.error('❌ Local update failed:', localError)
        throw localError
      }

    } catch (error) {
      console.error('❌ Staff update failed:', error)
      throw error
    }
  }

  // Get staff with proper user context
  async getStaff(currentUser, options = {}) {
    try {
      const { forceRefresh = false } = options
      
      if (!currentUser) {
        throw new Error('User context required')
      }

      await staffDatabaseService.initializeStaffDatabase()
      
      // Try local first unless force refresh
      if (!forceRefresh) {
        const localStaff = await staffDatabaseService.getStaffByUserAccess(currentUser)
        
        if (localStaff.length > 0) {
          console.log(`📊 Retrieved ${localStaff.length} staff from local database`)
          return localStaff
        }
      }
      
      // Fallback to Supabase and sync
      console.log('🔄 Fetching from Supabase and syncing...')
      await this.syncStaffFromSupabase(currentUser)
      
      // Return local data after sync
      const syncedStaff = await staffDatabaseService.getStaffByUserAccess(currentUser)
      console.log(`📊 Retrieved ${syncedStaff.length} staff after sync`)
      return syncedStaff

    } catch (error) {
      console.error('❌ Failed to get staff:', error)
      throw error
    }
  }

  // Get staff stats
  async getStaffStats(currentUser) {
    try {
      if (!currentUser) {
        return { total: 0, active: 0, inactive: 0, supervisors: 0, staff: 0 }
      }

      await staffDatabaseService.initializeStaffDatabase()
      
      if (currentUser.role === 'super_admin') {
        return await staffDatabaseService.getAllStaffStats()
      } else if (currentUser.store_id) {
        return await staffDatabaseService.getStaffStatsByStore(currentUser.store_id)
      } else {
        return { total: 0, active: 0, inactive: 0, supervisors: 0, staff: 0 }
      }
    } catch (error) {
      console.error('❌ Failed to get staff stats:', error)
      return { total: 0, active: 0, inactive: 0, supervisors: 0, staff: 0 }
    }
  }

  // Get stores
  async getStores(currentUser) {
    try {
      await staffDatabaseService.initializeStaffDatabase()
      const allStores = await staffDatabaseService.getAllStores()
      
      // Managers can only see their assigned store
      if (currentUser?.role === 'manager' && currentUser.store_id) {
        return allStores.filter(store => store.id === currentUser.store_id)
      }
      
      return allStores
    } catch (error) {
      console.error('❌ Failed to get stores:', error)
      return []
    }
  }

  // Check connection status
  async checkConnectionStatus() {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        timeout: 5000
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
}

// Export singleton instance
export const staffService = new StaffService()
export default staffService