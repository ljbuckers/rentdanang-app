import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Listing } from '../services/api';

const FAVORITES_KEY = '@rentdanang_favorites';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed: Listing[] = JSON.parse(stored);
        setFavorites(parsed);
        setFavoriteIds(new Set(parsed.map(l => l.id)));
      }
    } catch {
      // silent fail
    } finally {
      setLoaded(true);
    }
  }, []);

  const toggleFavorite = useCallback(async (listing: Listing) => {
    setFavorites(prev => {
      const exists = prev.some(l => l.id === listing.id);
      let updated: Listing[];
      if (exists) {
        updated = prev.filter(l => l.id !== listing.id);
      } else {
        updated = [listing, ...prev];
      }
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated)).catch(() => {});
      setFavoriteIds(new Set(updated.map(l => l.id)));
      return updated;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  const clearAll = useCallback(async () => {
    setFavorites([]);
    setFavoriteIds(new Set());
    await AsyncStorage.removeItem(FAVORITES_KEY);
  }, []);

  return { favorites, favoriteIds, isFavorite, toggleFavorite, clearAll, loaded };
}
