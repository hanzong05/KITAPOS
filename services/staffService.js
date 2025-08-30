// services/staffService.js - Complete fixed staff service with debugging
import staffDatabaseService from './staffDatabase'
import authService from './authService'

class StaffService {
  constructor() {
    this.baseURL = 'https://kitapos-middleware.vercel.app'
  }

  getAuthHeaders() {
    const token = authService.token
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
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
      // Manager filtering is handled on the server side based on JWT token

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Staff fetched from Supabase:', data.count)
      return data.staff || []

    } catch (error) {
      console.error('❌ Failed to fetch staff from Supabase:', error)
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

      const supabaseStaffData = {
        name: staffData.name,
        staff_id: staffData.staff_id,
        store_id: staffData.store_id,
        passcode: staffData.passcode,
        image_url: staffData.image_url || null,
        role: staffData.role || 'staff',
        hourly_rate: parseFloat(staffData.hourly_rate || 15.00)
      }

      console.log('📤 Sending to Supabase:', {
        ...supabaseStaffData,
        passcode: '***' // Hide passcode in logs
      });

      const response = await fetch(`${this.baseURL}/staff`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(supabaseStaffData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Supabase response error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Server error: ${response.status} - ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Staff created on Supabase:', result.staff?.staff_id)
      return result.staff

    } catch (error) {
      console.error('❌ Failed to create staff on Supabase:', {
        message: error.message,
        staffData: {
          name: staffData.name,
          staff_id: staffData.staff_id,
          store_id: staffData.store_id,
          role: staffData.role
        }
      });
      throw error
    }
  }

  // ENHANCED: Delete staff from Supabase with better error handling and debugging
  async deleteStaffFromSupabase(staffId, currentUser) {
    try {
      console.log('🗑️ Deleting staff from Supabase:', {
        staffId,
        userRole: currentUser?.role,
        userStoreId: currentUser?.store_id
      })
      
      // First, let's try to get the staff member details for debugging
      try {
        const staffDetails = await this.getStaffDetailsFromSupabase(staffId)
        console.log('📋 Staff details before deletion:', staffDetails)
      } catch (detailsError) {
        console.log('⚠️ Could not fetch staff details:', detailsError.message)
      }
      
      const response = await fetch(`${this.baseURL}/staff/${staffId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      })

      // Log the full response for debugging
      console.log('🌐 Delete response status:', response.status)
      console.log('🌐 Delete response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let errorData = {}
        const responseText = await response.text()
        
        try {
          errorData = JSON.parse(responseText)
        } catch (parseError) {
          errorData = { rawResponse: responseText }
        }
        
        console.error('❌ Supabase delete error details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: `${this.baseURL}/staff/${staffId}`,
          method: 'DELETE',
          headers: this.getAuthHeaders()
        });
        
        // Provide more specific error messages
        let errorMessage = 'Unknown deletion error'
        
        if (response.status === 400) {
          errorMessage = errorData.error?.error || errorData.message || 'Bad request - Invalid staff ID or permissions'
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized - Please log in again'
        } else if (response.status === 403) {
          errorMessage = 'Forbidden - You do not have permission to delete this staff member'
        } else if (response.status === 404) {
          errorMessage = 'Staff member not found on server'
        } else if (response.status === 500) {
          errorMessage = 'Server error - Please try again later'
        } else {
          errorMessage = errorData.error?.error || errorData.message || `Server error: ${response.status}`
        }
        
        // If it's a 404, treat it as success since the staff doesn't exist
        if (response.status === 404) {
          console.log('⚠️ Staff not found on Supabase (might already be deleted)')
          return { success: true, message: 'Staff not found on server (already deleted)' }
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('✅ Staff deleted from Supabase successfully:', result)
      return result

    } catch (error) {
      console.error('❌ Failed to delete staff from Supabase:', error.message)
      throw error
    }
  }

  // ADDED: Method to get staff details for debugging
  async getStaffDetailsFromSupabase(staffId) {
    try {
      const response = await fetch(`${this.baseURL}/staff/${staffId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch staff details: ${response.status}`)
      }

      const result = await response.json()
      return result.staff || result
    } catch (error) {
      throw new Error(`Could not fetch staff details: ${error.message}`)
    }
  }

  // ENHANCED: Alternative deletion method using staff_id instead of UUID
  async deleteStaffByStaffId(staff_id, currentUser) {
    try {
      console.log('🗑️ Attempting deletion by staff_id:', staff_id)
      
      const response = await fetch(`${this.baseURL}/staff/by-staff-id/${staff_id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.error || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Staff deleted by staff_id successfully:', result)
      return result
    } catch (error) {
      console.error('❌ Failed to delete staff by staff_id:', error.message)
      throw error
    }
  }

  // Update staff on Supabase
  async updateStaffOnSupabase(staffId, updateData, currentUser) {
    try {
      console.log('📝 Updating staff on Supabase:', staffId)
      
      // For managers, ensure they can only update staff in their store
      if (currentUser?.role === 'manager' && currentUser.store_id) {
        // Get the current staff member to check store ownership
        const currentStaff = await staffDatabaseService.getStaffById(staffId)
        if (currentStaff && currentStaff.store_id !== currentUser.store_id) {
          throw new Error('Access denied: Staff not in your store')
        }
      }

      const supabaseUpdateData = {
        name: updateData.name,
        role: updateData.role,
        hourly_rate: parseFloat(updateData.hourly_rate || 15.00),
        is_active: updateData.is_active ? true : false,
        image_url: updateData.image_url || null
      }

      // Remove undefined values
      Object.keys(supabaseUpdateData).forEach(key => {
        if (supabaseUpdateData[key] === undefined) {
          delete supabaseUpdateData[key]
        }
      })

      const response = await fetch(`${this.baseURL}/staff/${staffId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(supabaseUpdateData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Staff updated on Supabase:', result.staff?.staff_id)
      return result.staff

    } catch (error) {
      console.error('❌ Failed to update staff on Supabase:', error.message)
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
            id: staff.id,
            staff_id: staff.staff_id,
            name: staff.name,
            store_id: staff.store_id,
            passcode: staff.passcode,
            role: staff.role || staff.position || 'staff',
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

  // Create staff with dual persistence
  async createStaff(staffData, currentUser) {
    try {
      console.log('📝 Creating staff:', staffData.name)
      
      if (!currentUser) {
        throw new Error('User context required')
      }

      // Check for existing staff_id before creation
      await staffDatabaseService.initializeStaffDatabase()
      
      const existing = await staffDatabaseService.db.getFirstAsync(
        'SELECT id, staff_id FROM staff WHERE staff_id = ? AND is_active = 1',
        [staffData.staff_id.toUpperCase()]
      );

      if (existing) {
        throw new Error(`Staff ID "${staffData.staff_id}" already exists. Please use a different ID.`)
      }

      let createdStaff = null

      // Try Supabase first
      try {
        createdStaff = await this.createStaffOnSupabase(staffData, currentUser)
        
        // Sync to local if Supabase succeeded
        if (createdStaff) {
          const localData = {
            id: createdStaff.id,
            staff_id: createdStaff.staff_id,
            name: createdStaff.name,
            store_id: createdStaff.store_id,
            passcode: createdStaff.passcode,
            role: createdStaff.role || createdStaff.position || 'staff',
            hourly_rate: parseFloat(createdStaff.hourly_rate || 15.00),
            image_url: createdStaff.image_url,
            is_active: 1,
            created_by: createdStaff.created_by || currentUser.id,
            created_at: createdStaff.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          await staffDatabaseService.initializeStaffDatabase()
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
        }

        return createdStaff
      } catch (supabaseError) {
        console.log('⚠️ Supabase creation failed, trying local only:', supabaseError.message)
        
        // Fallback to local only
        try {
          // Clear any deleted staff with same ID first
          await staffDatabaseService.initializeStaffDatabase()
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
      }

    } catch (error) {
      console.error('❌ Staff creation failed:', error)
      throw error
    }
  }

  // ADDED: Manual deletion method as fallback
  async manualDeleteStaff(staffDetails, currentUser) {
    try {
      console.log('🔧 Attempting manual deletion for:', staffDetails.staff_id)
      
      // Try soft delete approach
      const response = await fetch(`${this.baseURL}/staff/${staffDetails.id}`, {
        method: 'PATCH', // Use PATCH for soft delete
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.id
        })
      })

      if (!response.ok) {
        throw new Error(`Manual deletion failed: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, method: 'soft_delete', data: result }
    } catch (error) {
      throw new Error(`Manual deletion failed: ${error.message}`)
    }
  }

  // ENHANCED: Delete with multiple strategies
  async deleteStaff(staffId, currentUser) {
    try {
      console.log('🗑️ Starting staff deletion process:', {
        staffId,
        userRole: currentUser?.role,
        userStoreId: currentUser?.store_id
      })
      
      if (!currentUser) {
        throw new Error('User context required')
      }

      // Get staff details from local database first
      let staffDetails = null
      try {
        staffDetails = await staffDatabaseService.getStaffById(staffId)
        console.log('📋 Local staff details:', {
          id: staffDetails?.id,
          staff_id: staffDetails?.staff_id,
          name: staffDetails?.name,
          store_id: staffDetails?.store_id,
          is_active: staffDetails?.is_active
        })
      } catch (localError) {
        console.log('⚠️ Could not get local staff details:', localError.message)
      }

      let supabaseDeleted = false
      let localDeleted = false
      let errors = []

      // Strategy 1: Try to delete from Supabase using UUID
      try {
        await this.deleteStaffFromSupabase(staffId, currentUser)
        supabaseDeleted = true
        console.log('✅ Staff deleted from Supabase (Strategy 1: UUID)')
      } catch (supabaseError) {
        console.log('⚠️ Supabase deletion failed (Strategy 1):', supabaseError.message)
        errors.push(`UUID method: ${supabaseError.message}`)
        
        // Strategy 2: Try using staff_id if we have it
        if (staffDetails?.staff_id) {
          try {
            await this.deleteStaffByStaffId(staffDetails.staff_id, currentUser)
            supabaseDeleted = true
            console.log('✅ Staff deleted from Supabase (Strategy 2: staff_id)')
          } catch (staffIdError) {
            console.log('⚠️ Supabase deletion failed (Strategy 2):', staffIdError.message)
            errors.push(`staff_id method: ${staffIdError.message}`)
          }
        }
        
        // Strategy 3: Manual API call with more details
        if (!supabaseDeleted && staffDetails) {
          try {
            const manualDeleteResult = await this.manualDeleteStaff(staffDetails, currentUser)
            if (manualDeleteResult.success) {
              supabaseDeleted = true
              console.log('✅ Staff deleted from Supabase (Strategy 3: manual)')
            }
          } catch (manualError) {
            console.log('⚠️ Manual deletion failed:', manualError.message)
            errors.push(`manual method: ${manualError.message}`)
          }
        }
      }

      // Always try to delete from local database
      try {
        await staffDatabaseService.deleteStaff(staffId, currentUser)
        localDeleted = true
        console.log('✅ Staff deleted from local database')
      } catch (localError) {
        console.error('❌ Local deletion failed:', localError)
        errors.push(`Local: ${localError.message}`)
      }

      // Verify deletion after a delay
      if (staffDetails?.staff_id) {
        this.verifyDeletion(staffId, staffDetails.staff_id)
      }

      // Determine success based on what was deleted
      if (localDeleted) {
        if (supabaseDeleted) {
          console.log('🎉 Staff successfully deleted from both Supabase and local database')
          return { success: true, deletedFrom: ['supabase', 'local'] }
        } else {
          console.log('⚠️ Staff deleted locally, but Supabase deletion failed')
          console.log('🔧 Supabase errors:', errors.filter(e => !e.includes('Local')))
          return { 
            success: true, 
            deletedFrom: ['local'], 
            warnings: errors.filter(e => !e.includes('Local')),
            recommendation: 'Staff deleted locally. Please check Supabase manually or contact support.'
          }
        }
      } else if (supabaseDeleted) {
        console.log('⚠️ Staff deleted from Supabase, but local deletion failed')
        return { 
          success: true, 
          deletedFrom: ['supabase'], 
          warnings: [errors.find(e => e.includes('Local'))]
        }
      } else {
        throw new Error(`Complete deletion failure: ${errors.join(' | ')}`)
      }

    } catch (error) {
      console.error('❌ Staff deletion process failed:', error)
      throw error
    }
  }

  // Update staff in both Supabase and local database
  async updateStaff(staffId, updateData, currentUser) {
    try {
      console.log('📝 Updating staff:', staffId)
      
      if (!currentUser) {
        throw new Error('User context required')
      }

      let supabaseUpdated = false
      let localUpdated = false
      let errors = []

      // Try to update in Supabase first
      try {
        await this.updateStaffOnSupabase(staffId, updateData, currentUser)
        supabaseUpdated = true
        console.log('✅ Staff updated in Supabase')
      } catch (supabaseError) {
        console.log('⚠️ Supabase update failed:', supabaseError.message)
        errors.push(`Supabase: ${supabaseError.message}`)
      }

      // Update in local database
      try {
        const updatedStaff = await staffDatabaseService.updateStaff(staffId, updateData, currentUser)
        localUpdated = true
        console.log('✅ Staff updated in local database')
        
        // Return the updated staff data
        if (supabaseUpdated) {
          console.log('🎉 Staff successfully updated in both Supabase and local database')
          return updatedStaff
        } else {
          console.log('⚠️ Staff updated locally, but Supabase update failed')
          return {
            ...updatedStaff,
            warnings: [`Supabase update failed: ${errors.find(e => e.includes('Supabase'))}`]
          }
        }
      } catch (localError) {
        console.error('❌ Local update failed:', localError)
        errors.push(`Local: ${localError.message}`)
        
        if (supabaseUpdated) {
          throw new Error(`Local update failed but Supabase succeeded: ${localError.message}`)
        } else {
          throw new Error(`Update failed: ${errors.join(', ')}`)
        }
      }

    } catch (error) {
      console.error('❌ Staff update failed:', error)
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

  // ADDED: Debug method to check staff status on both databases
  async debugStaffStatus(staffId) {
    console.log('🔍 DEBUG: Checking staff status on both databases')
    
    // Check local database
    try {
      const localStaff = await staffDatabaseService.getStaffById(staffId)
      console.log('📱 Local Database:', localStaff ? {
        id: localStaff.id,
        staff_id: localStaff.staff_id,
        name: localStaff.name,
        is_active: localStaff.is_active
      } : 'Not found')
    } catch (localError) {
      console.log('❌ Local Database Error:', localError.message)
    }
    
    // Check Supabase
    try {
      const supabaseStaff = await this.getStaffDetailsFromSupabase(staffId)
      console.log('☁️ Supabase:', supabaseStaff ? {
        id: supabaseStaff.id,
        staff_id: supabaseStaff.staff_id,
        name: supabaseStaff.name,
        is_active: supabaseStaff.is_active
      } : 'Not found')
    } catch (supabaseError) {
      console.log('❌ Supabase Error:', supabaseError.message)
    }
  }

  // ADDED: Method to verify deletion worked
  async verifyDeletion(staffId, staffIdCode) {
    console.log('✅ Verifying deletion...')
    
    setTimeout(async () => {
      console.log('🔍 Checking if staff still exists after deletion...')
      await this.debugStaffStatus(staffId)
      
      if (staffIdCode) {
        try {
          const supabaseCheck = await this.getStaffDetailsFromSupabase(staffIdCode)
          if (supabaseCheck) {
            console.log('⚠️ WARNING: Staff still exists on Supabase after deletion!')
          } else {
            console.log('✅ Confirmed: Staff successfully deleted from Supabase')
          }
        } catch (error) {
          if (error.message.includes('404') || error.message.includes('not found')) {
            console.log('✅ Confirmed: Staff successfully deleted from Supabase')
          } else {
            console.log('❓ Could not verify Supabase deletion:', error.message)
          }
        }
      }
    }, 2000) // Check after 2 seconds
  }

  // ADDED: Utility method to force sync after operations
  async syncAfterOperation(currentUser, operation) {
    try {
      console.log(`🔄 Syncing after ${operation} operation...`)
      await this.syncStaffFromSupabase(currentUser)
      console.log(`✅ Sync completed after ${operation}`)
    } catch (error) {
      console.log(`⚠️ Sync failed after ${operation}:`, error.message)
      // Don't throw error as the main operation might have succeeded
    }
  }

  // ADDED: Bulk operations for staff management
  async bulkDeleteStaff(staffIds, currentUser) {
    try {
      console.log('🗑️ Starting bulk staff deletion:', staffIds.length)
      
      const results = {
        success: [],
        failed: [],
        warnings: []
      }

      for (const staffId of staffIds) {
        try {
          const deleteResult = await this.deleteStaff(staffId, currentUser)
          results.success.push({
            id: staffId,
            result: deleteResult
          })
        } catch (error) {
          results.failed.push({
            id: staffId,
            error: error.message
          })
        }
      }

      console.log(`🎉 Bulk deletion completed: ${results.success.length} success, ${results.failed.length} failed`)
      return results

    } catch (error) {
      console.error('❌ Bulk deletion failed:', error)
      throw error
    }
  }

  // ADDED: Get staff by staff_id (alternative lookup)
  async getStaffByStaffId(staffId, currentUser) {
    try {
      await staffDatabaseService.initializeStaffDatabase()
      
      const staff = await staffDatabaseService.db.getFirstAsync(`
        SELECT s.*, st.name as store_name 
        FROM staff s
        LEFT JOIN stores st ON s.store_id = st.id
        WHERE s.staff_id = ? AND s.is_active = 1
      `, [staffId.toUpperCase()])
      
      // Check if user has permission to view this staff
      if (staff && currentUser?.role === 'manager' && currentUser.store_id) {
        if (staff.store_id !== currentUser.store_id) {
          throw new Error('Access denied: Staff not in your store')
        }
      }
      
      return staff
    } catch (error) {
      console.error('❌ Failed to get staff by staff_id:', error)
      throw error
    }
  }

  // ADDED: Search staff by name or staff_id
  async searchStaff(searchTerm, currentUser) {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        throw new Error('Search term must be at least 2 characters')
      }

      await staffDatabaseService.initializeStaffDatabase()
      
      let query = `
        SELECT s.*, st.name as store_name 
        FROM staff s
        LEFT JOIN stores st ON s.store_id = st.id
        WHERE s.is_active = 1 
        AND (s.name LIKE ? OR s.staff_id LIKE ?)
      `
      let params = [`%${searchTerm}%`, `%${searchTerm.toUpperCase()}%`]

      // Apply user-based filtering
      if (currentUser?.role === 'manager' && currentUser.store_id) {
        query += ` AND s.store_id = ?`
        params.push(currentUser.store_id)
      }

      query += ` ORDER BY s.name ASC LIMIT 50`

      const results = await staffDatabaseService.db.getAllAsync(query, params)
      
      console.log(`🔍 Search results for "${searchTerm}": ${results?.length || 0} staff found`)
      return results || []

    } catch (error) {
      console.error('❌ Staff search failed:', error)
      throw error
    }
  }

  // ADDED: Export staff data for reporting
  async exportStaffData(currentUser, format = 'json') {
    try {
      console.log('📊 Exporting staff data...')
      
      const staff = await this.getStaff(currentUser)
      
      if (format === 'csv') {
        return this.convertToCSV(staff)
      } else {
        return {
          timestamp: new Date().toISOString(),
          exported_by: currentUser.name,
          total_records: staff.length,
          staff: staff
        }
      }
    } catch (error) {
      console.error('❌ Staff export failed:', error)
      throw error
    }
  }

  // ADDED: Convert staff data to CSV format
  convertToCSV(staff) {
    if (!staff || staff.length === 0) {
      return 'No data to export'
    }

    const headers = [
      'Staff ID',
      'Name', 
      'Store ID',
      'Store Name',
      'Role',
      'Hourly Rate',
      'Status',
      'Created At',
      'Updated At'
    ]

    const rows = staff.map(s => [
      s.staff_id,
      s.name,
      s.store_id,
      s.store_name || '',
      s.role,
      s.hourly_rate,
      s.is_active ? 'Active' : 'Inactive',
      s.created_at,
      s.updated_at
    ])

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n')
  }

  // ADDED: Validate staff data before operations
  validateStaffData(staffData) {
    const errors = []

    if (!staffData.name || staffData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters')
    }

    if (!staffData.staff_id || staffData.staff_id.trim().length < 3) {
      errors.push('Staff ID must be at least 3 characters')
    }

    if (!staffData.store_id || staffData.store_id.trim().length === 0) {
      errors.push('Store ID is required')
    }

    if (!staffData.passcode || staffData.passcode.trim().length < 4) {
      errors.push('Passcode must be at least 4 characters')
    }

    if (staffData.role && !['staff', 'supervisor'].includes(staffData.role)) {
      errors.push('Role must be either "staff" or "supervisor"')
    }

    if (staffData.hourly_rate && (isNaN(staffData.hourly_rate) || parseFloat(staffData.hourly_rate) < 0)) {
      errors.push('Hourly rate must be a positive number')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ADDED: Health check for staff service
  async healthCheck() {
    try {
      console.log('🏥 Running staff service health check...')
      
      const health = {
        timestamp: new Date().toISOString(),
        local_database: false,
        supabase_connection: false,
        services_status: 'unhealthy'
      }

      // Test local database
      try {
        await staffDatabaseService.initializeStaffDatabase()
        const testQuery = await staffDatabaseService.db.getFirstAsync('SELECT COUNT(*) as count FROM staff')
        health.local_database = true
        health.local_staff_count = testQuery?.count || 0
        console.log('✅ Local database: Healthy')
      } catch (localError) {
        console.log('❌ Local database: Unhealthy -', localError.message)
        health.local_error = localError.message
      }

      // Test Supabase connection
      try {
        const connectionTest = await this.checkConnectionStatus()
        health.supabase_connection = connectionTest
        console.log('✅ Supabase connection:', connectionTest ? 'Healthy' : 'Unhealthy')
      } catch (supabaseError) {
        console.log('❌ Supabase connection: Unhealthy -', supabaseError.message)
        health.supabase_error = supabaseError.message
      }

      // Overall status
      if (health.local_database && health.supabase_connection) {
        health.services_status = 'healthy'
      } else if (health.local_database) {
        health.services_status = 'degraded' // Local works but not Supabase
      } else {
        health.services_status = 'critical' // Neither works
      }

      console.log('🏥 Health check completed:', health.services_status)
      return health

    } catch (error) {
      console.error('❌ Health check failed:', error)
      return {
        timestamp: new Date().toISOString(),
        services_status: 'critical',
        error: error.message
      }
    }
  }

  // ADDED: Clear cache and force refresh
  async clearCacheAndRefresh(currentUser) {
    try {
      console.log('🧹 Clearing cache and refreshing staff data...')
      
      // Force sync from Supabase
      await this.syncStaffFromSupabase(currentUser)
      
      // Get fresh data
      const freshData = await this.getStaff(currentUser, { forceRefresh: true })
      
      console.log('✅ Cache cleared and data refreshed')
      return freshData

    } catch (error) {
      console.error('❌ Cache clear and refresh failed:', error)
      throw error
    }
  }

  // ADDED: Get staff statistics with detailed breakdown
  async getDetailedStaffStats(currentUser) {
    try {
      const basicStats = await this.getStaffStats(currentUser)
      const allStaff = await this.getStaff(currentUser)
      
      // Additional calculations
      const roleBreakdown = allStaff.reduce((acc, staff) => {
        acc[staff.role] = (acc[staff.role] || 0) + 1
        return acc
      }, {})

      const storeBreakdown = allStaff.reduce((acc, staff) => {
        const storeKey = staff.store_name || staff.store_id
        acc[storeKey] = (acc[storeKey] || 0) + 1
        return acc
      }, {})

      const averageHourlyRate = allStaff.length > 0 
        ? allStaff.reduce((sum, staff) => sum + (parseFloat(staff.hourly_rate) || 0), 0) / allStaff.length
        : 0

      return {
        ...basicStats,
        role_breakdown: roleBreakdown,
        store_breakdown: storeBreakdown,
        average_hourly_rate: parseFloat(averageHourlyRate.toFixed(2)),
        last_updated: new Date().toISOString()
      }

    } catch (error) {
      console.error('❌ Failed to get detailed staff stats:', error)
      return {
        ...await this.getStaffStats(currentUser),
        error: error.message
      }
    }
  }
}

// Export singleton instance
export const staffService = new StaffService()
export default staffService