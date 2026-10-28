import { isApprovedCarrier } from '../constants';
import type { CategorySlug } from '../types';
import { CATEGORY_MAP } from '../constants';

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UK_PHONE_RE = /^(?:\+44\s?|0)(?:\d\s?){9,10}$/;
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
const IMEI_RE = /^\d{15}$/;

export function requiredText(value: string | undefined | null, label: string): string | undefined {
  return value && value.trim().length > 0 ? undefined : `${label} is required`;
}

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Email address is required';
  return EMAIL_RE.test(value) ? undefined : 'Enter a valid email address';
}

export function validateUkPhone(value: string): string | undefined {
  if (!value.trim()) return 'Phone number is required';
  return UK_PHONE_RE.test(value.replace(/[()-]/g, ''))
    ? undefined
    : 'Enter a valid UK phone number';
}

export function validatePostcode(value: string): string | undefined {
  if (!value.trim()) return 'Postcode is required';
  return UK_POSTCODE_RE.test(value.trim()) ? undefined : 'Enter a valid UK postcode';
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Password is required';
  if (value.length < 10) return 'Use at least 10 characters';
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return 'Include upper and lower case letters';
  if (!/\d/.test(value)) return 'Include at least one number';
  return undefined;
}

/**
 * IMEI check — 15 digits plus a Luhn checksum. Suppliers mistype these often
 * enough that catching it client-side saves a round trip.
 */
export function validateImei(value: string): string | undefined {
  const raw = value.replace(/\s/g, '');
  if (!raw) return 'IMEI is required';
  if (!IMEI_RE.test(raw)) return 'IMEI must be exactly 15 digits';
  let sum = 0;
  for (let i = 0; i < 15; i += 1) {
    let digit = Number(raw[14 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0 ? undefined : 'IMEI checksum is invalid — please re-check';
}

export function validateSerialNumber(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return 'Serial number is required';
  if (raw.length < 6) return 'Serial number looks too short';
  return undefined;
}

export function validateBatteryHealth(value: number | string | undefined): string | undefined {
  if (value === '' || value === undefined || value === null) return 'Battery health is required';
  const num = Number(value);
  if (Number.isNaN(num)) return 'Enter a number';
  if (num < 0 || num > 100) return 'Must be between 0 and 100';
  return undefined;
}

export function validateQuantity(value: number | string | undefined): string | undefined {
  const num = Number(value);
  if (!value && value !== 0) return 'Quantity is required';
  if (!Number.isInteger(num)) return 'Enter a whole number';
  if (num < 1) return 'Quantity must be at least 1';
  if (num > 999) return 'Quantity cannot exceed 999';
  return undefined;
}

/** Carrier selections are always validated against the approved list. */
export function validateCarrier(code: string | null | undefined): string | undefined {
  return isApprovedCarrier(code) ? undefined : 'Select a carrier from the approved list';
}

export function validateTrackingNumber(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return 'Tracking number is required';
  if (raw.length < 6) return 'Tracking number looks too short';
  return undefined;
}

/** Validates a whole stock submission against its category's rules. */
export function validateStockSubmission(
  category: CategorySlug,
  values: Record<string, unknown>,
): FieldErrors {
  const errors: FieldErrors = {};
  const def = CATEGORY_MAP[category];

  if (def.identifier === 'IMEI') {
    const error = validateImei(String(values.imei ?? ''));
    if (error) errors.imei = error;
  } else {
    const error = validateSerialNumber(String(values.serialNumber ?? ''));
    if (error) errors.serialNumber = error;
  }

  if (!values.conditionGrade) errors.conditionGrade = 'Condition grade is required';

  if ((category === 'mobile-phones' || category === 'tablets') && !values.colour) {
    errors.colour = 'Colour is required';
  }

  if (def.requiresBatteryHealth) {
    const error = validateBatteryHealth(values.batteryHealthPercent as number);
    if (error) errors.batteryHealthPercent = error;
  }

  const quantityError = validateQuantity(values.quantity as number);
  if (quantityError) errors.quantity = quantityError;

  const box = values.whatsInTheBox;
  if (!Array.isArray(box) || box.length === 0) {
    errors.whatsInTheBox = "Select at least one item for 'What's in the Box'";
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
