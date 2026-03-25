import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useApp } from '../hooks/AppContext';
import { locales, localeNames, Locale, CurrencyCode, currencyLabels } from '../i18n';

const CURRENCIES: CurrencyCode[] = ['VND', 'USD', 'GBP', 'EUR', 'KRW', 'CNY', 'JPY', 'RUB'];

export default function SettingsScreen() {
  const { locale, currency, setLocale, setCurrency, clearFavorites, favorites } = useApp();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleClearSaved = () => {
    if (favorites.length === 0) return;
    Alert.alert(
      'Clear Saved Listings',
      `This will remove ${favorites.length} saved listing${favorites.length !== 1 ? 's' : ''}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearFavorites },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Settings</Text>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <TouchableOpacity style={styles.row} onPress={() => setShowLanguagePicker(true)}>
          <Text style={styles.rowLabel}>Language</Text>
          <Text style={styles.rowValue}>{localeNames[locale]} →</Text>
        </TouchableOpacity>
      </View>

      {/* Currency */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Currency</Text>
        <TouchableOpacity style={styles.row} onPress={() => setShowCurrencyPicker(true)}>
          <Text style={styles.rowLabel}>Display Currency</Text>
          <Text style={styles.rowValue}>{currencyLabels[currency]} →</Text>
        </TouchableOpacity>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity style={styles.row} onPress={handleClearSaved}>
          <Text style={styles.rowLabel}>Clear Saved Listings</Text>
          <Text style={[styles.rowValue, favorites.length > 0 && styles.destructive]}>
            {favorites.length} saved
          </Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Website</Text>
          <Text style={styles.rowValue}>rentdanang.app</Text>
        </View>
      </View>

      {/* Language Picker Modal */}
      <Modal visible={showLanguagePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={locales as unknown as Locale[]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, locale === item && styles.pickerItemActive]}
                  onPress={() => {
                    setLocale(item);
                    setShowLanguagePicker(false);
                  }}
                >
                  <Text style={[styles.pickerText, locale === item && styles.pickerTextActive]}>
                    {localeNames[item]}
                  </Text>
                  {locale === item && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, currency === item && styles.pickerItemActive]}
                  onPress={() => {
                    setCurrency(item);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={[styles.pickerText, currency === item && styles.pickerTextActive]}>
                    {currencyLabels[item]}
                  </Text>
                  {currency === item && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    padding: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gray900,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 2,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.gray800,
  },
  rowValue: {
    fontSize: 14,
    color: Colors.gray400,
  },
  destructive: {
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.gray900,
  },
  modalClose: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  pickerItemActive: {
    backgroundColor: Colors.primary50,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.gray700,
  },
  pickerTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
});
