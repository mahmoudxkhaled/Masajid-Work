import { AbstractControl } from '@angular/forms';

export class passwordMatchValidator {
    static MatchPassword(control: AbstractControl): void {
        const password = control.get('password')?.value;
        const confirmPassword = control.get('cPassword')?.value;

        if (password !== confirmPassword) {
            control.get('cPassword')?.setErrors({ ConfirmPassword: true });
        }
    }
}
