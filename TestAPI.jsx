// TestAPI.jsx - Complete React Native component to test API connection
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import authService from '../services/authService';
import authInitializer from '../services/authInitializer';

const TestAPI = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentToken, setCurrentToken] = useState(null);

  const addResult = (test, success, data = null, error = null) => {
    setResults(prev => [...prev, {
      id: Date.now(),
      test,
      success,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testHealthCheck = async () => {
    try {
      console.log('🔍 Testing health check...');
      const health = await authService.checkHealth(2);
      addResult('Health Check', health.status === 'healthy', {
        status: health.status,
        database: health.database,
        supabase: health.supabase
      });
    } catch (error) {
      addResult('Health Check', false, null, error.message);
    }
  };

  const testServiceInitialization = async () => {
    try {
      console.log('🚀 Testing service initialization...');
      const activeService = await authInitializer.initialize();
      const status = authInitializer.getStatus();
      
      addResult('Service Initialization', status.isInitialized, {
        activeService,
        isHealthy: status.isHealthy,
        serverUrl: status.serverUrl
      });
    } catch (error) {
      addResult('Service Initialization', false, null, error.message);
    }
  };

  const testLogin = async () => {
    try {
      console.log('🔐 Testing login...');
      const user = await authService.login('admin@techcorp.com', 'password123');
      setCurrentToken(user.token);
      
      addResult('Login', true, { 
        name: user.user.name, 
        role: user.user.role, 
        email: user.user.email,
        source: user.source 
      });
    } catch (error) {
      addResult('Login', false, null, error.message);
    }
  };

  const testGetProfile = async () => {
    try {
      console.log('👤 Testing get profile...');
      const profile = await authService.getProfile();
      addResult('Get Profile', true, { 
        name: profile.name, 
        role: profile.role,
        email: profile.email
      });
    } catch (error) {
      addResult('Get Profile', false, null, error.message);
    }
  };

  const testGetUsers = async () => {
    try {
      console.log('👥 Testing get users...');
      const users = await authService.getUsers();
      addResult('Get Users', true, { 
        count: users.length, 
        users: users.slice(0, 3).map(u => ({ name: u.name, role: u.role, email: u.email }))
      });
    } catch (error) {
      addResult('Get Users', false, null, error.message);
    }
  };

  const testRegistration = async () => {
    try {
      console.log('📝 Testing registration...');
      const userData = {
        name: 'Test User',
        email: `testuser${Date.now()}@example.com`,
        password: 'testpass123',
        phone: '+1234567890',
        role: 'cashier'
      };
      
      const result = await authService.register(userData);
      addResult('Registration', true, {
        name: result.user.name,
        email: result.user.email,
        role: result.user.role
      });
    } catch (error) {
      addResult('Registration', false, null, error.message);
    }
  };

  const testLogout = async () => {
    try {
      console.log('🚪 Testing logout...');
      await authService.logout();
      setCurrentToken(null);
      addResult('Logout', true, { message: 'Logged out successfully' });
    } catch (error) {
      addResult('Logout', false, null, error.message);
    }
  };

  const testSyncUsers = async () => {
    try {
      console.log('🔄 Testing user sync...');
      const syncResult = await authService.forceSync();
      addResult('User Sync', syncResult.synced, {
        synced: syncResult.counts?.users || 0,
        total: syncResult.counts?.total || 0,
        syncTime: syncResult.syncTime
      });
    } catch (error) {
      addResult('User Sync', false, null, error.message);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    clearResults();
    
    const tests = [
      { name: 'Service Initialization', fn: testServiceInitialization },
      { name: 'Health Check', fn: testHealthCheck },
      { name: 'Login', fn: testLogin },
      { name: 'Get Profile', fn: testGetProfile },
      { name: 'Get Users', fn: testGetUsers },
      { name: 'User Sync', fn: testSyncUsers },
      { name: 'Registration', fn: testRegistration },
      { name: 'Logout', fn: testLogout }
    ];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      console.log(`\n🔄 Running test ${i + 1}/${tests.length}: ${test.name}`);
      
      try {
        await test.fn();
      } catch (error) {
        console.error(`❌ Test ${test.name} failed:`, error);
      }
      
      // Add delay between tests
      if (i < tests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setLoading(false);
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    Alert.alert(
      'Tests Complete',
      `${successCount}/${totalCount} tests passed`,
      [
        { text: 'OK' },
        { 
          text: 'View Details', 
          onPress: () => console.log('Test Results:', results) 
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await testHealthCheck();
    setRefreshing(false);
  };

  const getAuthStatus = () => {
    const status = authService.getAuthStatus();
    const serviceInfo = authInitializer.getServiceInfo();
    
    return {
      isAuthenticated: status.isAuthenticated,
      activeService: serviceInfo.activeService,
      serverUrl: serviceInfo.serverUrl,
      isOffline: status.isOfflineMode,
      lastSync: status.lastSyncTime
    };
  };

  const authStatus = getAuthStatus();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Connection Test</Text>
      
      {/* Status Information */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Current Status</Text>
        <Text style={[styles.statusText, { color: authStatus.isAuthenticated ? '#10b981' : '#6b7280' }]}>
          Auth: {authStatus.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
        </Text>
        <Text style={styles.statusText}>
          Service: {authStatus.activeService === 'supabase' ? '🌐 Online (Supabase)' : '💾 Offline (Local)'}
        </Text>
        <Text style={styles.statusText}>
          Server: {authStatus.serverUrl}
        </Text>
        {currentToken && (
          <Text style={styles.statusText} numberOfLines={1}>
            Token: {currentToken.substring(0, 20)}...
          </Text>
        )}
      </View>
      
      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runAllTests}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          ) : null}
          <Text style={styles.buttonText}>
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={clearResults}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {/* Individual Test Buttons */}
      <View style={styles.individualTestsContainer}>
        <Text style={styles.sectionTitle}>Individual Tests</Text>
        <View style={styles.testButtonsGrid}>
          <TouchableOpacity style={styles.testButton} onPress={testHealthCheck} disabled={loading}>
            <Text style={styles.testButtonText}>Health</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testButton} onPress={testLogin} disabled={loading}>
            <Text style={styles.testButtonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testButton} onPress={testGetProfile} disabled={loading}>
            <Text style={styles.testButtonText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testButton} onPress={testGetUsers} disabled={loading}>
            <Text style={styles.testButtonText}>Users</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      <ScrollView 
        style={styles.resultsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {results.length === 0 && !loading && (
          <View style={styles.emptyResults}>
            <Text style={styles.emptyResultsText}>No tests run yet</Text>
            <Text style={styles.emptyResultsSubtext}>Tap "Run All Tests" to start</Text>
          </View>
        )}

        {results.map((result) => (
          <View key={result.id} style={[
            styles.resultItem,
            result.success ? styles.successItem : styles.errorItem
          ]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>
                {result.success ? '✅' : '❌'} {result.test}
              </Text>
              <Text style={styles.timestamp}>{result.timestamp}</Text>
            </View>
            
            {result.data && (
              <View style={styles.resultDataContainer}>
                <Text style={styles.resultDataTitle}>Response:</Text>
                <Text style={styles.resultData}>
                  {JSON.stringify(result.data, null, 2)}
                </Text>
              </View>
            )}
            
            {result.error && (
              <View style={styles.resultErrorContainer}>
                <Text style={styles.resultErrorTitle}>Error:</Text>
                <Text style={styles.resultError}>
                  {result.error}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  secondaryButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  individualTestsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  testButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  testButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  emptyResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyResultsText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  emptyResultsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  successItem: {
    borderLeftColor: '#10b981',
  },
  errorItem: {
    borderLeftColor: '#ef4444',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  resultDataContainer: {
    marginTop: 8,
  },
  resultDataTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  resultData: {
    fontSize: 11,
    color: '#059669',
    fontFamily: 'monospace',
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  resultErrorContainer: {
    marginTop: 8,
  },
  resultErrorTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  resultError: {
    fontSize: 11,
    color: '#dc2626',
    fontFamily: 'monospace',
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
});

export default TestAPI;