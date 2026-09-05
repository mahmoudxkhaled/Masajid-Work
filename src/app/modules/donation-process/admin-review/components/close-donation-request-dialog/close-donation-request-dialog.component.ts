import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationAdminService } from '../../services/donation-admin.service';

type CloseDonationRequestDialogContext = 'close';

@Component({
  standalone: false,
  selector: 'app-close-donation-request-dialog',
  templateUrl: './close-donation-request-dialog.component.html',
  styleUrl: './close-donation-request-dialog.component.scss',
})
export class CloseDonationRequestDialogComponent {
  @Input() visible = false;
  @Input() donationRequestId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  isLoading$ = this.donationAdminService.isLoadingSubject.asObservable();

  constructor(
    private donationAdminService: DonationAdminService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  confirm(): void {
    if (!this.donationRequestId) {
      return;
    }

    this.donationAdminService.closeDonationRequest(this.donationRequestId).subscribe({
      next: (response: any) => {
        console.log('closeDonationRequest response', response);
        if (!response?.success) {
          this.handleBusinessError('close', response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.adminClose.messages.closed'),
        });
        this.closeDialog();
        this.closed.emit();
      },
    });
  }

  private handleBusinessError(context: CloseDonationRequestDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'close':
        detail = this.getCloseErrorMessage(code);
        break;
    }

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }
  }

  private getCloseErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.adminClose.errors.requestNotFound');
      case 'DAP13010':
        return this.translate.getInstant('donations.adminClose.errors.invalidStatus');
      case 'DAP13033':
        return this.translate.getInstant('donations.adminClose.errors.actionNotAccessible');
      case 'DAP11055':
        return this.translate.getInstant('donations.adminClose.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.adminClose.errors.sessionExpired');
      default:
        return null;
    }
  }
}
