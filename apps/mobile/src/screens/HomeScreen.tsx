import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { getListings, getAreas, Listing, Area } from '../services/api';
import ListingCard from '../components/ListingCard';
import LoadingView from '../components/LoadingView';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [totalListings, setTotalListings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [listingsRes, areasRes] = await Promise.all([
        getListings({ per_page: 6, sort: 'newest' }),
        getAreas(),
      ]);
      setListings(listingsRes.listings);
      setTotalListings(listingsRes.total);
      setAreas(areasRes);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) return <LoadingView />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Find your home in</Text>
        <Text style={styles.heroTitleAccent}>Da Nang</Text>
        <Text style={styles.heroSubtitle}>
          {totalListings.toLocaleString()} active rental listings
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search area, property type..."
            placeholderTextColor={Colors.gray400}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => {
              navigation.navigate('ListingsTab' as any);
            }}
          />
        </View>
      </View>

      {/* Quick Area Links */}
      {areas.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Areas</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AreasTab' as any)}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaChips}>
            {areas.slice(0, 6).map((area) => (
              <TouchableOpacity
                key={area.id}
                style={styles.areaChip}
                onPress={() => navigation.navigate('Listings', { area: area.name })}
              >
                <Text style={styles.areaChipText}>{area.name}</Text>
                <Text style={styles.areaChipCount}>{area.listing_count}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured Listings */}
      {listings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Listings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ListingsTab' as any)}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={listings}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.featuredCardWrap}>
                <ListingCard
                  listing={item}
                  variant="featured"
                  onPress={() => navigation.navigate('ListingDetail', { listing: item })}
                />
              </View>
            )}
          />
        </View>
      )}

      {/* Property Type Quick Filters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by Type</Text>
        <View style={styles.typeGrid}>
          {[
            { type: 'apartment', emoji: '🏢', label: 'Apartments' },
            { type: 'house', emoji: '🏠', label: 'Houses' },
            { type: 'villa', emoji: '🏡', label: 'Villas' },
            { type: 'studio', emoji: '🛏️', label: 'Studios' },
          ].map(({ type, emoji, label }) => (
            <TouchableOpacity
              key={type}
              style={styles.typeCard}
              onPress={() => navigation.navigate('Listings', { propertyType: type })}
            >
              <Text style={styles.typeEmoji}>{emoji}</Text>
              <Text style={styles.typeLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    paddingBottom: 20,
  },
  hero: {
    backgroundColor: Colors.gray900,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.white,
  },
  heroTitleAccent: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.accentLight,
    marginTop: -2,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.gray400,
    marginTop: 6,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray800,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray900,
  },
  viewAll: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  areaChips: {
    gap: 8,
    paddingRight: 16,
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 6,
  },
  areaChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray700,
  },
  areaChipCount: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: Colors.primary50,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  featuredList: {
    gap: 12,
    paddingRight: 16,
  },
  featuredCardWrap: {
    width: 280,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  typeEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray700,
  },
  bottomPad: {
    height: 20,
  },
});
