import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { PasswordMatchValidator } from 'src/app/core/validators/password-match.validator';
import { AUTH_LOGIN_PATH } from '../../data/public-landing.data';
import { DONOR_CATEGORY_FORM_OPTIONS } from '../../data/public-register.data';
import type { DonorCategoryId, VendorRegistrationRequest } from '../../models/public-registration.model';
import { PublicRegistrationService } from '../../services/public-registration.service';
import {
  atLeastOneCategorySelected,
  publicPhoneValidators,
  requiredFileSelected,
} from '../../utils/public-registration.validators';

@Component({
  standalone: false,
  selector: 'app-register-vendor',
  templateUrl: './register-vendor.component.html',
  styleUrl: './register-vendor.component.scss',
})
export class VendorRegistrationComponent implements OnInit {
  readonly categoryOptions = DONOR_CATEGORY_FORM_OPTIONS;
  readonly loginPath = AUTH_LOGIN_PATH;

  submitted = false;
  submitting = false;

  commercialRegistration = new FormControl<File | null>(null, requiredFileSelected());

  form = this.fb.group(
    {
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      cPassword: ['', Validators.required],
      businessName: ['', Validators.required],
      businessType: ['', Validators.required],
      location: ['', Validators.required],
      businessPhone: ['', publicPhoneValidators],
      serviceCategories: this.fb.array(
        DONOR_CATEGORY_FORM_OPTIONS.map(() => this.fb.control(false)),
        atLeastOneCategorySelected(),
      ),
      agreeDisclosure: [false, Validators.requiredTrue],
    },
    { validators: PasswordMatchValidator.MatchPassword },
  );

  constructor(
    private readonly fb: FormBuilder,
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

  get serviceCategories(): FormArray {
    return this.form.get('serviceCategories') as FormArray;
  }

  onFileSelected(file: File | null): void {
    this.commercialRegistration.setValue(file);
    this.commercialRegistration.markAsTouched();
  }

  onSubmit(): void {
    if (this.submitted || this.submitting) {
      return;
    }
    this.form.markAllAsTouched();
    this.commercialRegistration.markAsTouched();
    PasswordMatchValidator.MatchPassword(this.form);

    if (this.form.invalid || this.commercialRegistration.invalid) {
      return;
    }

    this.submitting = true;
    const dto = this.buildDto();
    // TODO: call this.registrationService.registerVendor(dto) when API is ready
    void dto;
    void this.registrationService;
    this.submitting = false;
    this.submitted = true;
  }

  showError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  getFileForUpload(): File | null {
    return this.commercialRegistration.value;
  }

  private buildDto(): VendorRegistrationRequest {
    const raw = this.form.getRawValue();
    const selected: DonorCategoryId[] = [];
    this.categoryOptions.forEach((opt, index) => {
      if (raw.serviceCategories[index]) {
        selected.push(opt.id);
      }
    });
    return {
      fullName: String(raw.fullName ?? ''),
      email: String(raw.email ?? ''),
      password: String(raw.password ?? ''),
      businessName: String(raw.businessName ?? ''),
      businessType: String(raw.businessType ?? ''),
      location: String(raw.location ?? ''),
      businessPhone: String(raw.businessPhone ?? ''),
      serviceCategories: selected,
      agreeDisclosure: Boolean(raw.agreeDisclosure),
    };
  }
}
