import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { Area } from '../services/api';
import { useApp } from '../hooks/AppContext';
import { formatCurrency, convertFromVND } from '../utils/currency';

interface Props {
  area: Area;
  onPress: () => void;
}

export default function AreaCard({ area, onPress }: Props) {
  const { currency, rates } = useApp();

  const avgPrice = area.avg_price_1br
    ? formatCurrency(convertFromVND(area.avg_price_1br, currency, rates), currency)
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.name}>{area.name}</Text>
        {area.name_vn && <Text style={styles.nameVn}>{area.name_vn}</Text>}
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{area.listing_count}</Text>
          <Text style={styles.statLabel}>listings</Text>
        </View>
        {avgPrice && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{avgPrice}</Text>
            <Text style={styles.statLabel}>avg 1BR</Text>
          </View>
        )}
      </View>

      {area.lifestyle_tags && area.lifestyle_tags.length > 0 && (
        <View style={styles.tags}>
          {area.lifestyle_tags.slice(0, 3).map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  header: {
    marginBottom: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.gray900,
  },
  nameVn: {
    fontSize: 13,
    color: Colors.gray400,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
});
