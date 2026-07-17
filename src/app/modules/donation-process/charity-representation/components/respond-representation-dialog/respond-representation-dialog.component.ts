import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CharityRepresentationService } from '../../services/charity-representation.service';
import { TranslationService } from 'src/app/core/services/translation.service';

type RespondRepresentationDialogContext = 'respond';

@Component({
  standalone: false,
  selector: 'app-respond-representation-dialog',
  templateUrl: './respond-representation-dialog.component.html',
  styleUrl: './respond-representation-dialog.component.scss',
})
export class RespondRepresentationDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() donationCommitmentId = 0;
  @Input() mode: 'accept' | 'reject' = 'accept';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() responded = new EventEmitter<void>();

  note = '';
  isLoading$ = this.charityRepresentationService.isLoadingSubject.asObservable();

  constructor(
    private charityRepresentationService: CharityRepresentationService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.note = '';
    }
  }

  get isAcceptMode(): boolean {
    return this.mode === 'accept';
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.note = '';
  }

  confirmRespond(): void {
    const trimmedNote = String(this.note || '').trim();
    if (!this.isAcceptMode && !trimmedNote) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.error'),
        detail: this.translate.getInstant('donations.charityRepresentation.respondDialog.validation.noteRequired'),
      });
      return;
    }

    this.charityRepresentationService
      .respondDonorRepresentation({
        donationCommitmentId: this.donationCommitmentId,
        accept: this.isAcceptMode,
        note: trimmedNote,
      })
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('respond', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('common.success'),
            detail: this.translate.getInstant(
              this.isAcceptMode
                ? 'donations.charityRepresentation.messages.accepted'
                : 'donations.charityRepresentation.messages.rejected',
            ),
          });
          this.closeDialog();
          this.responded.emit();
        },
      });
  }

  private handleBusinessError(context: RespondRepresentationDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'respond':
        detail = this.getRespondErrorMessage(code);
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

  private getRespondErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13003':
        return this.translate.getInstant('donations.charityRepresentation.errors.commitmentNotFound');
      case 'DAP13015':
        return this.translate.getInstant('donations.charityRepresentation.errors.notAssignedRepresentative');
      case 'DAP13010':
        return this.translate.getInstant('donations.charityRepresentation.errors.invalidStatus');
      case 'DAP11055':
        return this.translate.getInstant('donations.charityRepresentation.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.charityRepresentation.errors.sessionExpired');
      default:
        return null;
    }
  }
}
