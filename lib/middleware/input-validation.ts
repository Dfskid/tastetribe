import { z } from 'zod';

export const sanitizeString = (input: string): string => {
  if (!input) return '';

  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, 5000);
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const sanitizePhoneNumber = (phone: string): string => {
  return phone.replace(/[^\d+]/g, '');
};

export const profileSchema = z.object({
  displayName: z.string().min(1).max(100).transform(sanitizeString),
  avatarUrl: z.string().url().optional(),
  tasteProfile: z.record(z.any()).optional(),
});

export const ratingSchema = z.object({
  itemId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  review: z.string().max(1000).transform(sanitizeString).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const invitationSchema = z.object({
  email: z.string().email().transform(sanitizeEmail).optional(),
  phone: z.string().transform(sanitizePhoneNumber).optional(),
  message: z.string().max(500).transform(sanitizeString).optional(),
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone must be provided',
});

export const searchSchema = z.object({
  query: z.string().min(1).max(200).transform(sanitizeString),
  category: z.string().max(50).optional(),
  filters: z.record(z.any()).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().min(1).max(100).optional(),
});

export const friendRequestSchema = z.object({
  friendId: z.string().uuid(),
  message: z.string().max(200).transform(sanitizeString).optional(),
});

export const blockUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(500).transform(sanitizeString).optional(),
});

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'friends', 'private']),
  showRatings: z.boolean(),
  showFavorites: z.boolean(),
  allowFriendRequests: z.boolean(),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

export function getValidationErrorMessage(errors: z.ZodError): string {
  const firstError = errors.errors[0];
  return firstError?.message || 'Validation failed';
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'File must be a JPEG, PNG, WebP, or GIF image' };
  }

  return { valid: true };
}

export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function validateRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 200);
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .slice(0, 255);
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function assertNonEmpty<T>(value: T | null | undefined, fieldName: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
}

export function assertValidEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email address', 'email');
  }
}

export function assertValidUUID(id: string, fieldName: string = 'id'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError(`Invalid ${fieldName}`, fieldName);
  }
}