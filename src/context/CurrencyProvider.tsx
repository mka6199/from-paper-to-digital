import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CurrencyCode =
  | 'AED'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'SAR'
  | 'INR'
  | 'PKR'
  | 'CAD'
  | 'AUD'
  | 'JPY';

type Rates = Record<string, number>;

type CurrencyContextType = {
  currency: CurrencyCode;
  rates: Rates | null;
  lastUpdated: number | null;
  setCurrency: (c: CurrencyCode) => void;
  convertFromAED: (amountAED: number, to?: CurrencyCode) => number;
  format: (amountAED: number, to?: CurrencyCode) => string;
  supported: CurrencyCode[];
  symbols: Record<CurrencyCode, string>;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = '@currency_settings_v1';
const ONE_HOUR = 60 * 60 * 1000;
const THROTTLE_WARN_MS = 60_000; // warn at most once per minute
const QUIET_RETRY_MS = 30 * 60 * 1000; // if we already have rates, retry quietly every 30m
const BACKOFF_STEPS = [10_000, 30_000, 60_000, 120_000, 300_000]; // 10s -> 5m

const SUPPORTED: CurrencyCode[] = [
  'AED',
  'USD',
  'EUR',
  'GBP',
  'SAR',
  'INR',
  'PKR',
  'CAD',
  'AUD',
  'JPY',
];

const SYMBOLS: Record<CurrencyCode, string> = {
  AED: 'AED',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: 'SAR',
  INR: '₹',
  PKR: '₨',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
};

/** Seed so UI keeps working even if network is down. */
const FALLBACK_RATES: Rates = {
  AED: 1,
  USD: 0.27225,
  EUR: 0.247,
  GBP: 0.211,
  SAR: 1.02,
  INR: 22.7,
  PKR: 75,
  CAD: 0.37,
  AUD: 0.41,
  JPY: 44,
};

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => {
      clearTimeout(id);
      resolve(v);
    }).catch((e) => {
      clearTimeout(id);
      reject(e);
    });
  });
}

/** Try primary endpoint; if it fails, try backup. */
async function fetchRatesMulti(): Promise<{ rates: Rates; ts: number }> {
  // 1) Primary
  try {
    const res = await withTimeout(
      fetch('https://api.exchangerate.host/latest?base=AED'),
      7000
    );
    const json = await res.json();
    if (json?.rates) {
      return { rates: json.rates as Rates, ts: Date.now() };
    }
  } catch {}

  // 2) Backup
  const backupUrl = 'https://open.er-api.com/v6/latest/AED';
  const res2 = await withTimeout(fetch(backupUrl), 7000);
  const json2 = await res2.json();
  if (json2?.result === 'success' && json2?.rates) {
    return { rates: json2.rates as Rates, ts: Date.now() };
  }
  throw new Error('Failed to load rates');
}

/** Single-leader guard so only one provider instance does network work. */
const LEADER_FLAG = '__CURRENCY_PROVIDER_LEADER__';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('AED');
  const [rates, setRates] = useState<Rates | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const loadingRef = useRef(false);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const failCountRef = useRef(0);
  const lastWarnAtRef = useRef(0);

  const isLeaderRef = useRef(false);

  // Elect a single leader instance
  useEffect(() => {
    if (!(globalThis as any)[LEADER_FLAG]) {
      (globalThis as any)[LEADER_FLAG] = true;
      isLeaderRef.current = true;
    } else {
      isLeaderRef.current = false;
    }
    return () => {
      if (isLeaderRef.current) {
        (globalThis as any)[LEADER_FLAG] = false;
      }
    };
  }, []);

  // Load persisted state + seed fallback so UI converts immediately.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.currency) setCurrencyState(parsed.currency);
          if (parsed.rates) setRates(parsed.rates);
          if (parsed.lastUpdated) setLastUpdated(parsed.lastUpdated);
        }
      } catch {}
      setRates((prev) => prev ?? { ...FALLBACK_RATES });
      setLastUpdated((prev) => prev ?? Date.now());

      // Try a refresh once on mount (only leader does this)
      if (isLeaderRef.current) refreshRates(true);
    })();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    async (data: Partial<{ currency: CurrencyCode; rates: Rates; lastUpdated: number }>) => {
      try {
        const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const next = { ...existing, ...data };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
    },
    []
  );

  const computeDelayMs = useCallback(() => {
    const idx = Math.min(failCountRef.current, BACKOFF_STEPS.length - 1);
    return BACKOFF_STEPS[idx];
  }, []);

  const scheduleRetry = useCallback(
    (quietIfHaveRates: boolean) => {
      if (!isLeaderRef.current) return;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

      // If we already have rates, just try again in 30 minutes (quietly)
      if (quietIfHaveRates && rates) {
        retryTimerRef.current = setTimeout(() => refreshRates(true), QUIET_RETRY_MS);
        return;
      }

      const delay = computeDelayMs();
      retryTimerRef.current = setTimeout(() => refreshRates(false), delay);
    },
    [computeDelayMs, rates] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const refreshRates = useCallback(
    async (respectStaleness: boolean) => {
      if (!isLeaderRef.current) return; // only leader fetches
      if (loadingRef.current) return;

      const isStale = !lastUpdated || Date.now() - lastUpdated > ONE_HOUR || !rates;
      if (respectStaleness && !isStale) return;

      loadingRef.current = true;
      try {
        const { rates: r, ts } = await fetchRatesMulti();
        // Keep only supported (with AED baseline)
        const pruned: Rates = { AED: 1 };
        SUPPORTED.forEach((c) => {
          if (r[c]) pruned[c] = r[c];
        });
        setRates(pruned);
        setLastUpdated(ts);
        await persist({ rates: pruned, lastUpdated: ts });
        failCountRef.current = 0; // success → reset backoff

        // schedule a quiet refresh later
        scheduleRetry(true);
      } catch (e) {
        const now = Date.now();
        if (now - lastWarnAtRef.current > THROTTLE_WARN_MS) {
          console.warn('[Currency] refresh failed:', e);
          lastWarnAtRef.current = now;
        }

        if (!rates) {
          setRates({ ...FALLBACK_RATES });
          setLastUpdated(Date.now());
        }

        failCountRef.current += 1;
        // If we already have rates, don't hammer — try again quietly in 30m.
        scheduleRetry(!!rates);
      } finally {
        loadingRef.current = false;
      }
    },
    [lastUpdated, persist, rates, scheduleRetry]
  );

  const setCurrency = useCallback(
    (c: CurrencyCode) => {
      setCurrencyState(c);
      persist({ currency: c });
    },
    [persist]
  );

  const convertFromAED = useCallback(
    (amountAED: number, to: CurrencyCode = currency) => {
      const r = rates ?? FALLBACK_RATES;
      if (to === 'AED') return amountAED;
      const rate = r[to];
      if (!rate || !isFinite(rate)) return amountAED;
      return amountAED * rate;
    },
    [currency, rates]
  );

  const format = useCallback(
    (amountAED: number, to: CurrencyCode = currency) => {
      const value = convertFromAED(amountAED, to);
      const symbol = SYMBOLS[to] ?? '';
      const rounded = Math.round(value).toLocaleString();
      if (to === 'AED' || to === 'SAR') return `${rounded} ${to}`;
      return `${symbol}${rounded}`;
    },
    [convertFromAED, currency]
  );

  const value = useMemo<CurrencyContextType>(
    () => ({
      currency,
      rates,
      lastUpdated,
      setCurrency,
      convertFromAED,
      format,
      supported: SUPPORTED,
      symbols: SYMBOLS,
    }),
    [convertFromAED, currency, format, lastUpdated, rates]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
