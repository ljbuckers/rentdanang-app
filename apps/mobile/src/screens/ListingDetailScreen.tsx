import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Linking,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { useApp } from '../hooks/AppContext';
import { formatPrice } from '../utils/currency';
import type { RootStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AMENITY_LABELS: Record<string, string> = {
  swimming_pool: '🏊 Pool',
  gym: '💪 Gym',
  balcony: '🌇 Balcony',
  ocean_view: '🌊 Ocean View',
  river_view: '🏞️ River View',
  parking: '🅿️ Parking',
  elevator: '🛗 Elevator',
  washing_machine: '👕 Laundry',
  kitchen: '🍳 Kitchen',
  air_conditioning: '❄️ A/C',
  water_heater: '🔥 Hot Water',
  wifi: '📶 WiFi',
  cleaning_service: '🧹 Cleaning',
  '24h_security': '🔒 24h Security',
  pet_friendly: '🐾 Pet Friendly',
};

export default function ListingDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ListingDetail'>>();
  const { listing } = route.params;
  const { currency, rates, isFavorite, toggleFavorite } = useApp();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const title = listing.title_en || listing.title || 'Property in Da Nang';
  const price = formatPrice(
    listing.price_vnd ? Number(listing.price_vnd) : null,
    listing.price_usd ? Number(listing.price_usd) : null,
    currency,
    rates
  );

  const images = listing.images?.length ? listing.images : (listing.thumbnail_url ? [listing.thumbnail_url] : []);

  return (
    <ScrollView style={styles.container} bounces={false}>
      {/* Image Carousel */}
      <View style={styles.carouselContainer}>
        {images.length > 0 ? (
          <>
            <FlatList
              ref={flatListRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(idx);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.carouselImage}
                  contentFit="cover"
                  transition={200}
                />
              )}
            />
            {images.length > 1 && (
              <View style={styles.pagination}>
                <Text style={styles.paginationText}>
                  {currentImageIndex + 1} / {images.length}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>No photos</Text>
          </View>
        )}

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(listing)}
        >
          <Text style={styles.favoriteIcon}>
            {isFavorite(listing.id) ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Details */}
      <View style={styles.details}>
        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.pricePeriod}>/{listing.price_period || 'month'}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Location */}
        {listing.area_name && (
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {listing.area_name}
              {listing.street_address ? `, ${listing.street_address}` : ''}
            </Text>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {listing.property_type && (
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>
                {listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)}
              </Text>
            </View>
          )}
          {listing.bedrooms != null && (
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>{listing.bedrooms} Bedrooms</Text>
            </View>
          )}
          {listing.bathrooms != null && (
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>{listing.bathrooms} Bathrooms</Text>
            </View>
          )}
          {listing.area_sqm != null && (
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>{Number(listing.area_sqm)} m²</Text>
            </View>
          )}
          {listing.furnished && (
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>
                {listing.furnished.charAt(0).toUpperCase() + listing.furnished.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Amenities */}
        {listing.amenities && listing.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {listing.amenities.map((amenity, i) => (
                <View key={i} style={styles.amenityChip}>
                  <Text style={styles.amenityText}>
                    {AMENITY_LABELS[amenity] || amenity}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        {listing.description_en && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description_en}</Text>
          </View>
        )}

        {/* Source */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing Source</Text>
          <View style={styles.sourceRow}>
            <Text style={styles.sourceText}>
              {listing.source_platform.charAt(0).toUpperCase() + listing.source_platform.slice(1)}
            </Text>
            {listing.source_url && (
              <TouchableOpacity
                style={styles.viewSourceButton}
                onPress={() => Linking.openURL(listing.source_url!)}
              >
                <Text style={styles.viewSourceText}>View Original →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Contact */}
        {listing.contact_phone && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL(`tel:${listing.contact_phone}`)}
            >
              <Text style={styles.contactButtonText}>📞 Call {listing.contact_phone}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPad} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 280,
    backgroundColor: Colors.gray100,
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paginationText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  noImage: {
    width: SCREEN_WIDTH,
    height: 200,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: Colors.gray400,
    fontSize: 16,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  details: {
    padding: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
  },
  pricePeriod: {
    fontSize: 16,
    color: Colors.gray400,
    marginLeft: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray800,
    marginTop: 8,
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  locationText: {
    fontSize: 14,
    color: Colors.gray500,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  statBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 13,
    color: Colors.gray700,
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 10,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: Colors.primary50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 13,
    color: Colors.primary,
  },
  description: {
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 22,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 14,
    color: Colors.gray600,
  },
  viewSourceButton: {
    paddingVertical: 6,
  },
  viewSourceText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: Colors.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  bottomPad: {
    height: 40,
  },
});
