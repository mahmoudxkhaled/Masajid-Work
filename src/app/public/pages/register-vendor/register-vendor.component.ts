import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { AUTH_LOGIN_PATH } from '../../data/public-landing.data';
import type { VendorRegistrationRequest } from '../../models/public-registration.model';
import { PublicRegistrationService } from '../../services/public-registration.service';
import {
  adminEmailValidators,
  countryCode3Required,
  latitudeValidator,
  longitudeValidator,
  representativeFullNameValidator,
} from '../../utils/public-registration.validators';

@Component({
  standalone: false,
  selector: 'app-register-vendor',
  templateUrl: './register-vendor.component.html',
  styleUrl: './register-vendor.component.scss',
})
export class VendorRegistrationComponent implements OnInit {
  readonly loginPath = AUTH_LOGIN_PATH;

  countries: CountryLookup[] = [];
  isArabic = false;
  submitted = false;
  submitting = false;
  submitErrorKey = '';

  form = this.fb.group(
    {
      vendorName: ['', Validators.required],
      representativeFirstName: ['', Validators.required],
      representativeLastName: ['', Validators.required],
      representativeEmail: ['', adminEmailValidators],
      countryCode: ['', countryCode3Required()],
      city: ['', Validators.required],
      latitude: ['', latitudeValidator()],
      longitude: ['', longitudeValidator()],
    },
    { validators: representativeFullNameValidator('representativeFirstName', 'representativeLastName') },
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly registrationService: PublicRegistrationService,
    readonly lookupService: PublicLookupService,
    private readonly translate: TranslateService,
  ) {
    this.isArabic = this.translate.currentLang === 'ar';
  }

  ngOnInit(): void {
    this.lookupService.getCountries().subscribe((countries) => {
      this.countries = this.lookupService.sortCountriesByLabel(countries, this.isArabic);
    });
    this.translate.onLangChange.subscribe((event) => {
      this.isArabic = event.lang === 'ar';
      this.countries = this.lookupService.sortCountriesByLabel(this.countries, this.isArabic);
    });
  }

  onSubmit(): void {
    if (this.submitted || this.submitting) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.submitErrorKey = '';

    this.registrationService.registerVendor(this.buildDto()).subscribe({
      next: (result) => {
        if (result.outcome === 'error') {
          this.submitErrorKey = result.messageKey;
          this.submitting = false;
          return;
        }
        this.submitting = false;
        this.submitted = true;
      },
      error: () => {
        this.submitErrorKey = 'public.register.messages.genericError';
        this.submitting = false;
      },
    });
  }

  showError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  showGroupError(errorKey: string): boolean {
    if (errorKey === 'representativeFullName') {
      const first = this.form.get('representativeFirstName');
      const last = this.form.get('representativeLastName');
      const namesTouched = !!(first?.touched || last?.touched);
      return namesTouched && !!this.form.errors?.[errorKey];
    }

    return this.form.touched && !!this.form.errors?.[errorKey];
  }

  private buildDto(): VendorRegistrationRequest {
    const raw = this.form.getRawValue();
    return {
      vendorName: String(raw.vendorName ?? '').trim(),
      representativeFirstName: String(raw.representativeFirstName ?? '').trim(),
      representativeLastName: String(raw.representativeLastName ?? '').trim(),
      representativeEmail: String(raw.representativeEmail ?? '').trim(),
      countryCode: String(raw.countryCode ?? '').trim().toUpperCase(),
      city: String(raw.city ?? '').trim(),
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
    };
  }
}
