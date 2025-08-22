import React, { useState, useCallback } from 'react'
import { FlatList, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../utils/authContext'
import DashboardLayout from './../components/DashboardLayout'
import AttendanceCard from '../modules/Attendance/AttendanceCard'

const AttendanceScreen = () => {
  const { logout, user: authUser } = useAuth()
  const router = useRouter()

  const [employees, setEmployees] = useState([
    { 
      id: 1, 
      name: "Alice Johnson", 
      role: "Cashier", 
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      currentAttendance: {
        timeIn: null,
        timeOut: null,
        breakIn: null,
        breakOut: null,
        isOnBreak: false,
        hasTimeIn: false,
        status: 'Not Started',
        location: null
      },
      dtrHistory: [
        {
          date: '2024-01-15',
          timeIn: '08:00 AM',
          breakOut: '12:00 PM',
          breakIn: '01:00 PM',
          timeOut: '05:00 PM',
          totalHours: '8h 0m',
          status: 'Present',
          locations: {
            timeInLocation: {
              latitude: 14.6507,
              longitude: 120.9763,
              address: "Tarlac City Hall, Tarlac"
            },
            timeOutLocation: {
              latitude: 14.6505,
              longitude: 120.9761,
              address: "Tarlac City Hall, Tarlac"
            }
          }
        }
      ]
    },
    { 
      id: 2, 
      name: "Bob Smith", 
      role: "Manager", 
      avatar: "https://randomuser.me/api/portraits/men/36.jpg",
      currentAttendance: {
        timeIn: null,
        timeOut: null,
        breakIn: null,
        breakOut: null,
        isOnBreak: false,
        hasTimeIn: false,
        status: 'Not Started',
        location: null
      },
      dtrHistory: []
    }
  ])

  // Memoize the navigation handler to prevent unnecessary re-renders
  const handleEmployeePress = useCallback((item) => {
    router.push({
      pathname: "./EmployeeAttendance",
      params: {
        id: item.id.toString(),
        name: item.name,
        role: item.role,
        avatar: item.avatar,
        status: item.currentAttendance.status
      }
    })
  }, [router])

  // Memoize the render function
  const renderEmployeeCard = useCallback(({ item }) => (
    <AttendanceCard
      name={item.name}
      role={item.role}
      avatar={item.avatar}
      status={item.currentAttendance.status}
      onPress={() => handleEmployeePress(item)}
    />
  ), [handleEmployeePress])

  // Memoize the key extractor
  const keyExtractor = useCallback((item) => item.id.toString(), [])

  return (
    <DashboardLayout style={styles.container}>
      <FlatList
        data={employees}
        keyExtractor={keyExtractor}
        renderItem={renderEmployeeCard}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </DashboardLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
})

export default AttendanceScreen