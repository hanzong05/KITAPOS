import React, { useState, useEffect } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useAuth } from '../../utils/authContext'

import UserCardDetails from '../modules/Attendance/UserCardDetails'
import LocationCard from '../modules/Attendance/LocationCard'
import TimeDisplayCard from '../modules/Attendance/TimeDisplayCard'
import TimeButtonCard from '../modules/Attendance/TimeButtonCard'
import TimelineCard from '../modules/Attendance/TimelineCard'
import Header from '../components/Header'   // ✅ fixed path (no ./../)

const EmployeeAttendance = () => {
  const { user } = useAuth() // Get current user from auth context
  const [timeEntries, setTimeEntries] = useState([]) // State for timeline entries
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Mock employees data - replace with your actual data source
  const employees = [
    { id: 1, name: 'John Doe', position: 'Developer', avatar: 'https://via.placeholder.com/50' },
    { id: 2, name: 'Jane Smith', position: 'Designer', avatar: 'https://via.placeholder.com/50' },
  ]

  const getEmployeeById = (id) => {
    return employees.find(emp => emp.id === parseInt(id))
  }

  const handleTimeAction = (action) => {
    const newEntry = {
      id: Date.now(),
      action,
      time: new Date(),
      location: 'Current Location'
    }
    setTimeEntries(prev => [newEntry, ...prev])
  }

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <Header 
            onBackPress={() => console.log('Back pressed')}
          />
        }
        data={[
          { id: 'userCard', component: 'UserCardDetails' },
          { id: 'location', component: 'LocationCard' },
          { id: 'timeDisplay', component: 'TimeDisplayCard' },
          { id: 'timeButton', component: 'TimeButtonCard' },
          { id: 'timeline', component: 'TimelineCard' }
        ]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          switch (item.component) {
            case 'UserCardDetails':
              return (
                <UserCardDetails 
                  user={user || getEmployeeById(1)} 
                />
              )
            case 'LocationCard':
              return (
                <LocationCard 
                  location="Office Building, Main Floor"
                  accuracy="5m"
                />
              )
            case 'TimeDisplayCard':
              return (
                <TimeDisplayCard 
                  currentTime={currentTime}
                  workingHours="8.5"
                  overtimeHours="0.5"
                />
              )
            case 'TimeButtonCard':
              return (
                <TimeButtonCard 
                  onTimeIn={() => handleTimeAction('TIME_IN')}
                  onTimeOut={() => handleTimeAction('TIME_OUT')}
                  onBreakStart={() => handleTimeAction('BREAK_START')}
                  onBreakEnd={() => handleTimeAction('BREAK_END')}
                />
              )
            case 'TimelineCard':
              return (
                <TimelineCard 
                  timeEntries={timeEntries}
                />
              )
            default:
              return null
          }
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  }
})

export default EmployeeAttendance
