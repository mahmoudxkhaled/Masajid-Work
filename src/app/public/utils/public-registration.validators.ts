import { AbstractControl, FormArray, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const PUBLIC_PHONE_PATTERN = /^[+]?[\d\s()-]{7,20}$/;

export const publicPhoneValidators = [Validators.required, Validators.pattern(PUBLIC_PHONE_PATTERN)];

export function atLeastOneCategorySelected(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const array = control as FormArray;
    if (!array?.controls?.length) {
      return { atLeastOneCategory: true };
    }
    const selected = array.controls.some((c) => c.value === true);
    return selected ? null : { atLeastOneCategory: true };
  };
}

export function requiredFileSelected(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as File | null;
    return value instanceof File ? null : { requiredFile: true };
  };
}
