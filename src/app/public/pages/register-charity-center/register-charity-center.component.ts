import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { BrandingService } from 'src/app/core/services/branding.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import type { CharityCenterRegistrationRequest } from '../../models/public-registration.model';
import { AUTH_LOGIN_PATH } from '../../data/public-landing.data';
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
  selector: 'app-register-charity-center',
  templateUrl: './register-charity-center.component.html',
  styleUrl: './register-charity-center.component.scss',
})
export class CharityCenterRegistrationComponent implements OnInit {
  readonly loginPath = AUTH_LOGIN_PATH;
  readonly brandingParams = this.branding.translateParams;

  countries: CountryLookup[] = [];
  isArabic = false;
  submitted = false;
  submitting = false;
  submitErrorKey = '';

  form = this.fb.group(
    {
      centerName: ['', Validators.required],
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
    private readonly branding: BrandingService,
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

    this.registrationService.registerCharityCenter(this.buildDto()).subscribe({
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

  private buildDto(): CharityCenterRegistrationRequest {
    const raw = this.form.getRawValue();
    return {
      centerName: String(raw.centerName ?? '').trim(),
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
