import React from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity 
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'


const UserCardDetails = () => {
  const { id, name, role, avatar } = useLocalSearchParams()
  const router = useRouter()

  return (
    <View style={styles.container}>
      {/* Employee Info Section */}
      <View style={styles.headerSection}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <Text style={styles.nameText}>{name}</Text>
        <Text style={styles.roleText}>{role}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    paddingVertical: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  headerSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  roleText: {
    fontSize: 16,
    color: '#666',
  },
})

export default UserCardDetails