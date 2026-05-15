import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
export const TEXT_FIELD_PATTERN = /^[\p{L}\d\s'\-._]+$/u;
export const NAME_FIELD_PATTERN = /^[\p{L}\s'\-._]+$/u;
export const INVALID_FORMAT_MESSAGE = 'Only letters, numbers, spaces, hyphens (-), apostrophes (\'), dots (.), and underscores (_) are allowed.';
export const NAME_INVALID_FORMAT_MESSAGE = 'Only letters, spaces, hyphens (-), apostrophes (\'), dots (.), and underscores (_) are allowed.';

export function getTextFieldPattern(): RegExp {
    return TEXT_FIELD_PATTERN;
}
export function textFieldValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        // If control has no value, return null (let required validator handle empty values)
        if (!control.value) {
            return null;
        }

        const isValid = TEXT_FIELD_PATTERN.test(control.value);
        return isValid ? null : { invalidFormat: true };
    };
}

export function nameFieldValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) {
            return null;
        }

        const isValid = NAME_FIELD_PATTERN.test(control.value);
        return isValid ? null : { invalidFormat: true };
    };
}


export function getTextFieldError(
    control: AbstractControl | null | undefined,
    fieldName: string,
    showError: boolean
): string {
    if (!control || !showError) {
        return '';
    }

    if (control.errors?.['required']) {
        return `${fieldName} is required.`;
    }

    if (control.errors?.['invalidFormat']) {
        return INVALID_FORMAT_MESSAGE;
    }

    return '';
}

export function getNameFieldError(
    control: AbstractControl | null | undefined,
    fieldName: string,
    showError: boolean
): string {
    if (!control || !showError) {
        return '';
    }

    if (control.errors?.['required']) {
        return `${fieldName} is required.`;
    }

    if (control.errors?.['invalidFormat']) {
        return NAME_INVALID_FORMAT_MESSAGE;
    }

    return '';
}


