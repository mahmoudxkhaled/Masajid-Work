import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { PasswordMatchValidator } from 'src/app/core/validators/password-match.validator';
import { BrandingService } from 'src/app/core/services/branding.service';
import { DONOR_CATEGORY_FORM_OPTIONS } from '../../data/public-register.data';
import type { DonorCategoryId, DonorRegistrationRequest } from '../../models/public-registration.model';
import { PublicRegistrationService } from '../../services/public-registration.service';
import {
  atLeastOneCategorySelected,
  publicPhoneValidators,
} from '../../utils/public-registration.validators';

@Component({
  standalone: false,
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrl: './register-donor.component.scss',
})
export class DonorRegistrationComponent implements OnInit {
  readonly categoryOptions = DONOR_CATEGORY_FORM_OPTIONS;
  readonly brandingParams = this.branding.translateParams;

  submitted = false;
  submitting = false;

  form = this.fb.group(
    {
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', publicPhoneValidators],
      password: ['', [Validators.required, Validators.minLength(8)]],
      cPassword: ['', Validators.required],
      country: ['', Validators.required],
      city: ['', Validators.required],
      radiusKm: [25, [Validators.required, Validators.min(1), Validators.max(100)]],
      categories: this.fb.array(
        DONOR_CATEGORY_FORM_OPTIONS.map(() => this.fb.control(false)),
        atLeastOneCategorySelected(),
      ),
      acceptTerms: [false, Validators.requiredTrue],
      confirmPhysicalOnly: [false, Validators.requiredTrue],
    },
    { validators: PasswordMatchValidator.MatchPassword },
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly branding: BrandingService,
    private readonly registrationService: PublicRegistrationService,
  ) {}

  ngOnInit(): void {
    this.form.get('cPassword')?.valueChanges.subscribe(() => {
      PasswordMatchValidator.MatchPassword(this.form);
    });
    this.form.get('password')?.valueChanges.subscribe(() => {
      PasswordMatchValidator.MatchPassword(this.form);
    });
  }

  get categories(): FormArray {
    return this.form.get('categories') as FormArray;
  }

  onSubmit(): void {
    if (this.submitted || this.submitting) {
      return;
    }
    this.form.markAllAsTouched();
    PasswordMatchValidator.MatchPassword(this.form);
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    const dto = this.buildDto();
    // TODO: call this.registrationService.registerDonor(dto) when API is ready
    void dto;
    void this.registrationService;
    this.submitting = false;
    this.submitted = true;
  }

  showError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  private buildDto(): DonorRegistrationRequest {
    const raw = this.form.getRawValue();
    const selected: DonorCategoryId[] = [];
    this.categoryOptions.forEach((opt, index) => {
      if (raw.categories[index]) {
        selected.push(opt.id);
      }
    });
    return {
      firstName: String(raw.firstName ?? ''),
      lastName: String(raw.lastName ?? ''),
      email: String(raw.email ?? ''),
      phone: String(raw.phone ?? ''),
      password: String(raw.password ?? ''),
      country: String(raw.country ?? ''),
      city: String(raw.city ?? ''),
      radiusKm: Number(raw.radiusKm ?? 25),
      categories: selected,
      acceptTerms: Boolean(raw.acceptTerms),
      confirmPhysicalOnly: Boolean(raw.confirmPhysicalOnly),
    };
  }
}
