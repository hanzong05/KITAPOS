import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TimeDisplayCard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <Text style={styles.time}>{formatTime(currentTime)}</Text>
      <Text style={styles.date}>{formatDate(currentTime)}</Text>
    </>
  );
};

const styles = StyleSheet.create({
  time: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4285f4',
    marginBottom: 8,
    textAlign: 'center',
  },
  date: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 30,
  },
});

export default TimeDisplayCard;