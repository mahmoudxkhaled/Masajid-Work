import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { BrandingService } from 'src/app/core/services/branding.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import type { FacilityRegistrationRequest } from '../../models/public-registration.model';
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
  selector: 'app-register-facility',
  templateUrl: './register-facility.component.html',
  styleUrl: './register-facility.component.scss',
})
export class FacilityRegistrationComponent implements OnInit {
  readonly brandingParams = this.branding.translateParams;

  countries: CountryLookup[] = [];
  isArabic = false;
  submitted = false;
  submitting = false;
  submitErrorKey = '';

  form = this.fb.group(
    {
      facilityName: ['', Validators.required],
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

    this.registrationService.registerFacility(this.buildDto()).subscribe({
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
    return this.form.touched && !!this.form.errors?.[errorKey];
  }

  private buildDto(): FacilityRegistrationRequest {
    const raw = this.form.getRawValue();
    return {
      facilityName: String(raw.facilityName ?? '').trim(),
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
