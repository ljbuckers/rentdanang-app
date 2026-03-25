import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { getListings, Listing, ListingFilters } from '../services/api';
import ListingCard from '../components/ListingCard';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PROPERTY_TYPES = [
  { key: '', label: 'All' },
  { key: 'apartment', label: 'Apartment' },
  { key: 'house', label: 'House' },
  { key: 'villa', label: 'Villa' },
  { key: 'studio', label: 'Studio' },
  { key: 'room', label: 'Room' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price ↑' },
  { key: 'price_desc', label: 'Price ↓' },
];

export default function ListingsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Listings'>>();

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [selectedType, setSelectedType] = useState(route.params?.propertyType || '');
  const [selectedSort, setSelectedSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [areaFilter, setAreaFilter] = useState(route.params?.area || '');

  const fetchListings = useCallback(async (pageNum: number, append = false) => {
    try {
      if (!append) setError(false);
      const filters: ListingFilters = {
        page: pageNum,
        sort: selectedSort,
      };
      if (selectedType) filters.property_types = selectedType;
      if (areaFilter) filters.areas = areaFilter;

      const result = await getListings(filters);
      if (append) {
        setListings(prev => [...prev, ...result.listings]);
      } else {
        setListings(result.listings);
      }
      setTotal(result.total);
    } catch {
      if (!append) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedType, selectedSort, areaFilter]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchListings(1);
  }, [fetchListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchListings(1);
  }, [fetchListings]);

  const onEndReached = useCallback(() => {
    if (loadingMore || listings.length >= total) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchListings(nextPage, true);
  }, [loadingMore, listings.length, total, page, fetchListings]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView onRetry={() => fetchListings(1)} />;

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {PROPERTY_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[styles.filterChip, selectedType === type.key && styles.filterChipActive]}
              onPress={() => setSelectedType(type.key)}
            >
              <Text style={[styles.filterChipText, selectedType === type.key && styles.filterChipTextActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort + Count */}
      <View style={styles.toolbar}>
        <Text style={styles.count}>{total.toLocaleString()} listings</Text>
        <View style={styles.sortButtons}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSelectedSort(opt.key as any)}
              style={[styles.sortChip, selectedSort === opt.key && styles.sortChipActive]}
            >
              <Text style={[styles.sortText, selectedSort === opt.key && styles.sortTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {areaFilter ? (
        <View style={styles.activeFilter}>
          <Text style={styles.activeFilterText}>📍 {areaFilter}</Text>
          <TouchableOpacity onPress={() => setAreaFilter('')}>
            <Text style={styles.clearFilter}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Listing Grid */}
      <FlatList
        data={listings}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() => navigation.navigate('ListingDetail', { listing: item })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <LoadingView message="Loading more..." /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No listings found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  filterBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray600,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  count: {
    fontSize: 13,
    color: Colors.gray500,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sortChipActive: {
    backgroundColor: Colors.warm100,
  },
  sortText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  sortTextActive: {
    color: Colors.accent,
    fontWeight: '600',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.primary50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  activeFilterText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  clearFilter: {
    fontSize: 14,
    color: Colors.gray400,
    padding: 4,
  },
  row: {
    paddingHorizontal: 12,
    gap: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.gray400,
  },
});
