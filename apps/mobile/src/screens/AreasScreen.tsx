import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { getAreas, Area } from '../services/api';
import AreaCard from '../components/AreaCard';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AreasScreen() {
  const navigation = useNavigation<Nav>();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAreas = useCallback(async () => {
    try {
      setError(false);
      const result = await getAreas();
      setAreas(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAreas();
  }, [loadAreas]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView onRetry={loadAreas} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={areas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Area Guides</Text>
            <Text style={styles.subtitle}>Explore neighborhoods in Da Nang</Text>
          </View>
        }
        renderItem={({ item }) => (
          <AreaCard
            area={item}
            onPress={() => navigation.navigate('Listings', { area: item.name })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.gray900,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray500,
    marginTop: 4,
  },
});
