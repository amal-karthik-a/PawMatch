import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

export default function E_layout() {
  return (
    <Stack screenOptions={{headerShown:false}}>
        <Stack.Screen name='AllEvents' />
    </Stack>
  )
}