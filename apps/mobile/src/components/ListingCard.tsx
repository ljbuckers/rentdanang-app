import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../constants/colors';
import { Listing } from '../services/api';
import { useApp } from '../hooks/AppContext';
import { formatPrice } from '../utils/currency';

const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2;

interface Props {
  listing: Listing;
  onPress: () => void;
  variant?: 'grid' | 'featured';
}

export default function ListingCard({ listing, onPress, variant = 'grid' }: Props) {
  const { currency, rates, isFavorite, toggleFavorite } = useApp();

  const title = listing.title_en || listing.title || 'Property in Da Nang';
  const price = formatPrice(
    listing.price_vnd ? Number(listing.price_vnd) : null,
    listing.price_usd ? Number(listing.price_usd) : null,
    currency,
    rates
  );

  const isFeatured = variant === 'featured';
  const cardWidth = isFeatured ? Dimensions.get('window').width - 32 : CARD_WIDTH;

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: listing.thumbnail_url || undefined }}
          style={[styles.image, isFeatured && styles.featuredImage]}
          contentFit="cover"
          placeholder={require('../../assets/icon.png')}
          transition={200}
        />
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation?.();
            toggleFavorite(listing);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.favoriteIcon}>
            {isFavorite(listing.id) ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
        {listing.is_verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.price}>{price}<Text style={styles.period}>/mo</Text></Text>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.meta}>
          {listing.bedrooms != null && (
            <Text style={styles.metaText}>{listing.bedrooms} bd</Text>
          )}
          {listing.bathrooms != null && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{listing.bathrooms} ba</Text>
            </>
          )}
          {listing.area_sqm != null && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{Number(listing.area_sqm)}m²</Text>
            </>
          )}
        </View>
        {listing.area_name && (
          <Text style={styles.area} numberOfLines={1}>{listing.area_name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.gray100,
  },
  featuredImage: {
    height: 180,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 16,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  info: {
    padding: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  period: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.gray400,
  },
  title: {
    fontSize: 13,
    color: Colors.gray700,
    marginTop: 2,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  metaDot: {
    fontSize: 12,
    color: Colors.gray300,
    marginHorizontal: 4,
  },
  area: {
    fontSize: 11,
    color: Colors.accent,
    marginTop: 4,
    fontWeight: '500',
  },
});
