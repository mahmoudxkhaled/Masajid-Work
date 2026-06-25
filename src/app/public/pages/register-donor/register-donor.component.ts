import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import type { DonorRegistrationRequest } from '../../models/public-registration.model';
import { PublicRegistrationService } from '../../services/public-registration.service';
import {
  adminEmailValidators,
  countryCode3Required,
  latitudeValidator,
  longitudeValidator,
} from '../../utils/public-registration.validators';

@Component({
  standalone: false,
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrl: './register-donor.component.scss',
})
export class DonorRegistrationComponent implements OnInit {
  countries: CountryLookup[] = [];
  isArabic = false;
  submitted = false;
  submitting = false;
  submitErrorKey = '';

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', adminEmailValidators],
    countryCode: ['', countryCode3Required()],
    city: ['', Validators.required],
    latitude: ['', latitudeValidator()],
    longitude: ['', longitudeValidator()],
  });

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

    this.registrationService.registerDonor(this.buildDto()).subscribe({
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

  private buildDto(): DonorRegistrationRequest {
    const raw = this.form.getRawValue();
    return {
      firstName: String(raw.firstName ?? '').trim(),
      lastName: String(raw.lastName ?? '').trim(),
      email: String(raw.email ?? '').trim(),
      countryCode: String(raw.countryCode ?? '').trim().toUpperCase(),
      city: String(raw.city ?? '').trim(),
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
    };
  }
}
