import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import TabNavigator from './TabNavigator';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import ListingsScreen from '../screens/ListingsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.gray900 },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{
          title: 'Listing Details',
          headerTransparent: true,
          headerTintColor: Colors.white,
          headerTitle: '',
        }}
      />
      <Stack.Screen
        name="Listings"
        component={ListingsScreen}
        options={({ route }) => ({
          title: route.params?.area || 'Listings',
        })}
      />
    </Stack.Navigator>
  );
}
