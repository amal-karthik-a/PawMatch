import { Stack } from 'expo-router'
import React from 'react'

export default function S_layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='DeleteAcc' />
      <Stack.Screen name='ReportFun' />
      <Stack.Screen name='Security' />
      <Stack.Screen name='EditPro' />
      <Stack.Screen name='HelpandSupport' />
      <Stack.Screen name='chatbot' />
    </Stack>
  )
}