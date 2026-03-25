import { Listing } from '../services/api';

export type RootStackParamList = {
  Main: undefined;
  ListingDetail: { listing: Listing };
  Listings: { area?: string; propertyType?: string };
};

export type TabParamList = {
  HomeTab: undefined;
  ListingsTab: undefined;
  AreasTab: undefined;
  BlogTab: undefined;
  SavedTab: undefined;
  SettingsTab: undefined;
};
