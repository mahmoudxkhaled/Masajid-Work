import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { PasswordMatchValidator } from 'src/app/core/validators/password-match.validator';
import { BrandingService } from 'src/app/core/services/branding.service';
import type { CharityCenterRegistrationRequest } from '../../models/public-registration.model';
import { PublicRegistrationService } from '../../services/public-registration.service';
import { publicPhoneValidators, requiredFileSelected } from '../../utils/public-registration.validators';

@Component({
  standalone: false,
  selector: 'app-register-charity-center',
  templateUrl: './register-charity-center.component.html',
  styleUrl: './register-charity-center.component.scss',
})
export class CharityCenterRegistrationComponent implements OnInit {
  readonly brandingParams = this.branding.translateParams;

  submitted = false;
  submitting = false;

  representativeId = new FormControl<File | null>(null, requiredFileSelected());
  authorizationDocument = new FormControl<File | null>(null, requiredFileSelected());
  registrationCertificate = new FormControl<File | null>(null, requiredFileSelected());

  form = this.fb.group({
    centerName: ['', Validators.required],
    organizationType: ['', Validators.required],
    address: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    phone: ['', publicPhoneValidators],
    missionDescription: ['', Validators.required],
    repFullName: ['', Validators.required],
    repRole: ['', Validators.required],
    repEmail: ['', [Validators.required, Validators.email]],
    repPhone: ['', publicPhoneValidators],
    password: ['', [Validators.required, Validators.minLength(8)]],
    cPassword: ['', Validators.required],
    authorizeVerification: [false, Validators.requiredTrue],
    confirmPhysicalPolicy: [false, Validators.requiredTrue],
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

  onFileSelected(
    field: 'representativeId' | 'authorizationDocument' | 'registrationCertificate',
    file: File | null,
  ): void {
    const control = this[field];
    control.setValue(file);
    control.markAsTouched();
  }

  onSubmit(): void {
    if (this.submitted || this.submitting) {
      return;
    }
    this.form.markAllAsTouched();
    this.representativeId.markAsTouched();
    this.authorizationDocument.markAsTouched();
    this.registrationCertificate.markAsTouched();
    PasswordMatchValidator.MatchPassword(this.form);

    const filesInvalid =
      this.representativeId.invalid ||
      this.authorizationDocument.invalid ||
      this.registrationCertificate.invalid;

    if (this.form.invalid || filesInvalid) {
      return;
    }

    this.submitting = true;
    const dto = this.buildDto();
    // TODO: call this.registrationService.registerCharityCenter(dto) when API is ready
    void dto;
    void this.registrationService;
    this.submitting = false;
    this.submitted = true;
  }

  showError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  getFileForUpload(
    field: 'representativeId' | 'authorizationDocument' | 'registrationCertificate',
  ): File | null {
    return this[field].value;
  }

  private buildDto(): CharityCenterRegistrationRequest {
    const raw = this.form.getRawValue();
    return {
      centerName: String(raw.centerName ?? ''),
      organizationType: String(raw.organizationType ?? ''),
      address: String(raw.address ?? ''),
      contactEmail: String(raw.contactEmail ?? ''),
      phone: String(raw.phone ?? ''),
      missionDescription: String(raw.missionDescription ?? ''),
      repFullName: String(raw.repFullName ?? ''),
      repRole: String(raw.repRole ?? ''),
      repEmail: String(raw.repEmail ?? ''),
      repPhone: String(raw.repPhone ?? ''),
      password: String(raw.password ?? ''),
      authorizeVerification: Boolean(raw.authorizeVerification),
      confirmPhysicalPolicy: Boolean(raw.confirmPhysicalPolicy),
    };
  }
}
