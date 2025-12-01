import { logger } from './logger';

export async function apiCall<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    logger.error('API Error:', error);
    return { data: fallback ?? null, error: error as Error };
  }
}

export function handleApiError(error: Error, fallbackMessage = 'An error occurred'): string {
  if (error.message.includes('network')) {
    return 'Network error. Please check your connection.';
  }
  if (error.message.includes('permission')) {
    return 'Permission denied. Please contact support.';
  }
  return error.message || fallbackMessage;
}
