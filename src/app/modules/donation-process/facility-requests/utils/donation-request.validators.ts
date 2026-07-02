import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const COUNTRY_CODE_3_PATTERN = /^[A-Z]{3}$/;
export const CURRENCY_CODE_3_PATTERN = /^[A-Z]{3}$/;

export function countryCode3Required(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim().toUpperCase();
    if (!value) {
      return { required: true };
    }
    return COUNTRY_CODE_3_PATTERN.test(value) ? null : { countryCode3: true };
  };
}

export function currencyCode3Validator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim().toUpperCase();
    if (!value) {
      return { required: true };
    }
    return CURRENCY_CODE_3_PATTERN.test(value) ? null : { currencyCode3: true };
  };
}

export function latitudeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return { required: true };
    }
    const value = Number(raw);
    if (Number.isNaN(value) || value < -90 || value > 90) {
      return { latitude: true };
    }
    return null;
  };
}

export function longitudeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return { required: true };
    }
    const value = Number(raw);
    if (Number.isNaN(value) || value < -180 || value > 180) {
      return { longitude: true };
    }
    return null;
  };
}

export function quantityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    if (Number.isNaN(value) || value <= 0) {
      return { quantity: true };
    }
    return null;
  };
}

export function estimatedCostValidator(): ValidatorFn {
  return Validators.min(0);
}
