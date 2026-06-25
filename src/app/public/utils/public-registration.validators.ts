import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const COUNTRY_CODE_3_PATTERN = /^[A-Z]{3}$/;
export const CURRENCY_CODE_3_PATTERN = /^[A-Z]{3}$/;

export const adminEmailValidators = [Validators.required, Validators.email];

export function countryCode3Required(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim().toUpperCase();
    if (!value) {
      return { required: true };
    }
    return COUNTRY_CODE_3_PATTERN.test(value) ? null : { countryCode3: true };
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

export function representativeFullNameValidator(firstNameKey: string, lastNameKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const formGroup = group as FormGroup;
    const first = String(formGroup.get(firstNameKey)?.value || '').trim();
    const last = String(formGroup.get(lastNameKey)?.value || '').trim();

    if (!first && !last) {
      return null;
    }

    const combined = `${first} ${last}`.trim();
    return /\S+\s+\S+/.test(combined) ? null : { representativeFullName: true };
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
