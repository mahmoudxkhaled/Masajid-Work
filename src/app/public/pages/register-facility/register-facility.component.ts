import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { PasswordMatchValidator } from 'src/app/core/validators/password-match.validator';
import { BrandingService } from 'src/app/core/services/branding.service';
import type { FacilityRegistrationRequest } from '../../models/public-registration.model';
import { PublicRegistrationService } from '../../services/public-registration.service';
import { publicPhoneValidators, requiredFileSelected } from '../../utils/public-registration.validators';

@Component({
  standalone: false,
  selector: 'app-register-facility',
  templateUrl: './register-facility.component.html',
  styleUrl: './register-facility.component.scss',
})
export class FacilityRegistrationComponent implements OnInit {
  readonly brandingParams = this.branding.translateParams;

  submitted = false;
  submitting = false;

  facilityPhoto = new FormControl<File | null>(null, requiredFileSelected());
  officialId = new FormControl<File | null>(null, requiredFileSelected());
  proofOfRepresentation = new FormControl<File | null>(null, requiredFileSelected());

  form = this.fb.group({
    facilityName: ['', Validators.required],
    facilityType: ['', Validators.required],
    description: ['', Validators.required],
    address: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    contactPhone: ['', publicPhoneValidators],
    repFullName: ['', Validators.required],
    repEmail: ['', [Validators.required, Validators.email]],
    repPhone: ['', publicPhoneValidators],
    repRole: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    cPassword: ['', Validators.required],
    reviewNotes: [''],
    certifyAccurate: [false, Validators.requiredTrue],
    agreePhysicalPolicy: [false, Validators.requiredTrue],
    agreeTerms: [false, Validators.requiredTrue],
  });

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

  onFileSelected(field: 'facilityPhoto' | 'officialId' | 'proofOfRepresentation', file: File | null): void {
    const control = this[field];
    control.setValue(file);
    control.markAsTouched();
  }

  onSubmit(): void {
    if (this.submitted || this.submitting) {
      return;
    }
    this.form.markAllAsTouched();
    this.facilityPhoto.markAsTouched();
    this.officialId.markAsTouched();
    this.proofOfRepresentation.markAsTouched();
    PasswordMatchValidator.MatchPassword(this.form);

    if (this.form.invalid || this.facilityPhoto.invalid || this.officialId.invalid || this.proofOfRepresentation.invalid) {
      return;
    }

    this.submitting = true;
    const dto = this.buildDto();
    // TODO: call this.registrationService.registerFacility(dto) when API is ready
    void dto;
    void this.registrationService;
    this.submitting = false;
    this.submitted = true;
  }

  showError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  showFileError(control: FormControl<File | null>): boolean {
    return control.touched && control.invalid;
  }

  getFileForUpload(field: 'facilityPhoto' | 'officialId' | 'proofOfRepresentation'): File | null {
    return this[field].value;
  }

  private buildDto(): FacilityRegistrationRequest {
    const raw = this.form.getRawValue();
    return {
      facilityName: String(raw.facilityName ?? ''),
      facilityType: String(raw.facilityType ?? ''),
      description: String(raw.description ?? ''),
      address: String(raw.address ?? ''),
      city: String(raw.city ?? ''),
      country: String(raw.country ?? ''),
      contactPhone: String(raw.contactPhone ?? ''),
      repFullName: String(raw.repFullName ?? ''),
      repEmail: String(raw.repEmail ?? ''),
      repPhone: String(raw.repPhone ?? ''),
      repRole: String(raw.repRole ?? ''),
      password: String(raw.password ?? ''),
      reviewNotes: String(raw.reviewNotes ?? ''),
      certifyAccurate: Boolean(raw.certifyAccurate),
      agreePhysicalPolicy: Boolean(raw.agreePhysicalPolicy),
      agreeTerms: Boolean(raw.agreeTerms),
    };
  }
}
