export type CurrencyISO = 'AED' | 'USD' | 'EUR' | 'GBP';

export interface OwnerSettings {
  ownerId: string;
  businessName?: string;
  ownerDisplayName?: string;
  currency: CurrencyISO;
  notificationsEnabled: boolean;
  showIntroOnStart: boolean;
  startingBalance?: number; 
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_SETTINGS: OwnerSettings = {
  ownerId: '',
  businessName: '',
  ownerDisplayName: '',
  currency: 'AED',
  notificationsEnabled: true,
  showIntroOnStart: true,
  startingBalance: 0,
  createdAt: 0,
  updatedAt: 0,
};
