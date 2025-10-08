export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const HAPTIC_PATTERNS = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
  selection: [5],
};

export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (!('vibrate' in navigator)) {
    return;
  }

  try {
    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    navigator.vibrate(vibrationPattern);
  } catch (error) {
    console.warn('Haptic feedback not supported:', error);
  }
}

export function canVibrate(): boolean {
  return 'vibrate' in navigator;
}

export const haptics = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  selection: () => triggerHaptic('selection'),
};
