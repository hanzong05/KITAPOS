import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TimelineCard = ({ currentStatus = 'timeIn', attendanceData = [] }) => {
  const timeRef = useRef({ work: 0, break: 0, total: 0 });
  const forceUpdateRef = useRef(0);

  // Force component re-render function
  const forceUpdate = () => {
    forceUpdateRef.current += 1;
    // Trigger re-render by updating a ref that's used in render
  };

  // Calculate time spent
  const calculateTimeSpent = () => {
    if (!attendanceData || attendanceData.length === 0) {
      return { work: 0, break: 0, total: 0 };
    }

    let workTime = 0;
    let breakTime = 0;
    let totalTime = 0;
    let lastTimeIn = null;
    let lastBreakOut = null;

    attendanceData.forEach((event) => {
      const eventTime = new Date(event.timestamp);
      
      switch (event.type) {
        case 'timeIn':
          lastTimeIn = eventTime;
          break;
        case 'breakOut':
          if (lastTimeIn) {
            workTime += eventTime - lastTimeIn;
          }
          lastBreakOut = eventTime;
          break;
        case 'breakIn':
          if (lastBreakOut) {
            breakTime += eventTime - lastBreakOut;
            lastBreakOut = null;
          }
          lastTimeIn = eventTime;
          break;
        case 'timeOut':
          if (lastTimeIn) {
            workTime += eventTime - lastTimeIn;
          }
          if (lastBreakOut) {
            breakTime += eventTime - lastBreakOut;
          }
          break;
      }
    });

    // Calculate ongoing time for current status
    const now = new Date();
    if (currentStatus !== 'timeOut' && attendanceData.length > 0) {
      const firstTimeIn = attendanceData.find(event => event.type === 'timeIn');
      if (firstTimeIn) {
        totalTime = now - new Date(firstTimeIn.timestamp);
        
        if (currentStatus === 'timeIn' || currentStatus === 'breakIn') {
          if (lastTimeIn) {
            workTime += now - lastTimeIn;
          }
        } else if (currentStatus === 'breakOut') {
          if (lastBreakOut) {
            breakTime += now - lastBreakOut;
          }
        }
      }
    }

    return {
      work: Math.max(0, workTime),
      break: Math.max(0, breakTime),
      total: Math.max(0, totalTime)
    };
  };

  // Update calculations and force re-render
  useEffect(() => {
    const updateTimeSpent = () => {
      timeRef.current = calculateTimeSpent();
      forceUpdate();
    };

    // Initial calculation
    updateTimeSpent();

    // Set up timers
    let clockTimer = null;
    let updateTimer = null;

    // Update clock every second for visual feedback
    clockTimer = setInterval(() => {
      forceUpdate();
    }, 1000);

    // Update calculations every 5 seconds for active sessions
    if (currentStatus !== 'timeOut') {
      updateTimer = setInterval(updateTimeSpent, 5000);
    }

    return () => {
      if (clockTimer) clearInterval(clockTimer);
      if (updateTimer) clearInterval(updateTimer);
    };
  }, [attendanceData, currentStatus]);

  // Get current time for display (calculated on each render)
  const currentTime = new Date();
  
  // Get current time spent values
  const timeSpent = timeRef.current;

  const formatDuration = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'timeIn':
      case 'breakIn': return '#4285f4';
      case 'breakOut': return '#ff9800';
      case 'timeOut': return '#4caf50';
      default: return '#e5e7eb';
    }
  };

  const getProgressPercentage = () => {
    const standardWorkDay = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    return Math.min(100, (timeSpent.total / standardWorkDay) * 100);
  };

  const getWorkProgressPercentage = () => {
    const standardWorkHours = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    return Math.min(100, (timeSpent.work / standardWorkHours) * 100);
  };

  // Memoize expensive calculations
  const progressPercentage = useMemo(() => getProgressPercentage(), [timeSpent.total]);
  const workProgressPercentage = useMemo(() => getWorkProgressPercentage(), [timeSpent.work]);

  return (
    <>
      {/* Header */}
      <Text style={styles.title}>Today's Timeline</Text>
      
      {/* Current Status Indicator */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(currentStatus) }]} />
        <Text style={styles.statusText}>
          {currentStatus === 'timeIn' || currentStatus === 'breakIn' ? 'Working' :
           currentStatus === 'breakOut' ? 'On Break' : 
           currentStatus === 'timeOut' ? 'Day Completed' : 'Not Started'}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${progressPercentage}%`,
                backgroundColor: getStatusColor(currentStatus)
              }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {progressPercentage.toFixed(1)}% of standard day
        </Text>
      </View>

      {/* Time Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#4285f4' }]} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Work Time</Text>
            <Text style={styles.summaryValue}>
              {formatDuration(timeSpent.work)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#ff9800' }]} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Break Time</Text>
            <Text style={styles.summaryValue}>
              {formatDuration(timeSpent.break)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#4caf50' }]} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Time</Text>
            <Text style={styles.summaryValue}>
              {formatDuration(timeSpent.total)}
            </Text>
          </View>
        </View>
      </View>

      {/* Work Progress Bar */}
      <View style={styles.workProgressContainer}>
        <Text style={styles.workProgressLabel}>Work Hours Progress</Text>
        <View style={styles.progressBackground}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${workProgressPercentage}%`,
                backgroundColor: '#4285f4'
              }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {formatDuration(timeSpent.work)} / 8h ({workProgressPercentage.toFixed(1)}%)
        </Text>
      </View>

      {/* Timeline Events */}
      {attendanceData && attendanceData.length > 0 && (
        <View style={styles.eventsContainer}>
          <Text style={styles.eventsTitle}>Today's Events</Text>
          {attendanceData.map((event, index) => (
            <View key={index} style={styles.eventItem}>
              <View style={[styles.eventDot, { backgroundColor: getStatusColor(event.type) }]} />
              <View style={styles.eventInfo}>
                <Text style={styles.eventType}>
                  {event.type === 'timeIn' ? 'Time In' :
                   event.type === 'breakOut' ? 'Break Out' :
                   event.type === 'breakIn' ? 'Break In' : 'Time Out'}
                </Text>
                <Text style={styles.eventTime}>
                  {new Date(event.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    marginBottom: 25,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  summaryContainer: {
    gap: 12,
    marginBottom: 25,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  workProgressContainer: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
  },
  workProgressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  eventsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  eventTime: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default TimelineCard;