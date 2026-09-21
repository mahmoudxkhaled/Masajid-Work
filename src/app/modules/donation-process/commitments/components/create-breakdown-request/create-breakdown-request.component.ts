import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Subscription, firstValueFrom } from 'rxjs';
import { CurrencyLookup } from 'src/app/core/models/lookup.model';
import { FileUploadService } from 'src/app/core/file-system-lib/services/file-upload.service';
import {
  TransferFileStatus,
  TransferProgressService,
} from 'src/app/core/file-system-lib/services/transfer-progress.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  getDonationStorageLocation,
  isDonationStorageLocationReady,
} from '../../../config/donation-storage.config';
import {
  resolveBreakdownAttachmentOwner,
  resolveDonationAttachmentKindFromFileName,
} from '../../../models/donation-attachment.constants';
import {
  canRequestBreakdown,
  CreateBreakdownItemInput,
} from '../../../models/donation-breakdown-request.model';
import { DonationCommitmentBackend, DonationCommitmentDetails } from '../../../models/donation-commitment.model';
import { DonationRequestDetailsBackend } from '../../../models/donation-request.model';
import { DonationAttachmentService } from '../../../services/donation-attachment.service';
import { DonationBreakdownService } from '../../../services/donation-breakdown.service';
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';
import { DonationCommitmentService } from '../../services/donation-commitment.service';

type CreateBreakdownPageContext = 'load' | 'create' | 'upload' | 'link';
type CreateBreakdownMode = 'quantity' | 'custom';

@Component({
  standalone: false,
  selector: 'app-create-breakdown-request',
  templateUrl: './create-breakdown-request.component.html',
  styleUrl: './create-breakdown-request.component.scss',
})
export class CreateBreakdownRequestComponent implements OnInit, OnDestroy {
  commitmentId = 0;
  loading = true;
  mode: CreateBreakdownMode = 'custom';
  donorQuantity: number | null = null;
  items: CreateBreakdownItemInput[] = [];
  selectedFiles: File[] = [];
  uploading = false;
  uploadPercent = 0;
  currencyCode = '';
  currencyOptions: { label: string; value: string }[] = [];
  currencyPlaceholder = '';

  originalQuantity = 0;
  originalEstimatedCost = 0;
  originalCurrencyCode = '';
  originalTitle = '';
  originalDescription = '';
  originalUnit = '';

  isLoading$ = this.donationBreakdownService.isLoadingSubject.asObservable();

  private currencies: CurrencyLookup[] = [];
  private uploadFiles: File[] = [];
  private fileUploadStatus = new Map<string, TransferFileStatus>();
  private currentUploadingFileName: string | null = null;
  private rawDetails: DonationCommitmentBackend | null = null;
  private rawRequestDetails: DonationRequestDetailsBackend | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationCommitmentService: DonationCommitmentService,
    private donationRequestsService: DonationRequestsService,
    private donationBreakdownService: DonationBreakdownService,
    private donationAttachmentService: DonationAttachmentService,
    private fileUploadService: FileUploadService,
    private transferProgressService: TransferProgressService,
    private lookupService: PublicLookupService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private translateService: TranslateService,
    private messageService: MessageService,
  ) {
    this.currencyPlaceholder = this.translate.getInstant('donations.breakdown.createDialog.currencyPlaceholder');
  }

  ngOnInit(): void {
    this.commitmentId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.subscriptions.push(
      this.translateService.onLangChange.subscribe(() => {
        this.rebuildCurrencyOptions();
      }),
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshOriginalFields();
      }),
    );
    this.loadCurrencies();
    this.loadContext();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.transferProgressService.resetUploadProgress();
  }

  get busy(): boolean {
    return this.uploading;
  }

  get storageConfigured(): boolean {
    return isDonationStorageLocationReady('breakdownRequests');
  }

  get canSelectFiles(): boolean {
    return !this.busy && !this.loading && this.storageConfigured;
  }

  get canSplitByQuantity(): boolean {
    return Number(this.originalQuantity || 0) > 1;
  }

  get remainingQuantity(): number {
    const original = Number(this.originalQuantity || 0);
    const donor = Number(this.donorQuantity || 0);
    return original - donor;
  }

  get originalQuantityLabel(): string {
    const quantity = Number(this.originalQuantity || 0);
    const unit = String(this.originalUnit || '').trim();
    if (!quantity && !unit) {
      return '-';
    }
    return `${quantity || ''} ${unit}`.trim();
  }

  get resolvedCurrencyCode(): string {
    const selected = String(this.currencyCode || '').trim().toUpperCase();
    if (selected) {
      return selected;
    }
    const original = String(this.originalCurrencyCode || '').trim().toUpperCase();
    if (original) {
      return original;
    }
    return this.currencyOptions[0]?.value || '';
  }

  get formDisabled(): boolean {
    return this.loading || this.busy;
  }

  onModeChange(mode: CreateBreakdownMode | null): void {
    if (mode === 'quantity' && !this.canSplitByQuantity) {
      this.mode = 'custom';
      return;
    }
    if (mode !== 'quantity' && mode !== 'custom') {
      this.mode = this.canSplitByQuantity ? 'quantity' : 'custom';
    }
  }

  selectMode(mode: CreateBreakdownMode): void {
    if (this.formDisabled) {
      return;
    }
    if (mode === 'quantity' && !this.canSplitByQuantity) {
      return;
    }
    this.mode = mode;
    this.onModeChange(mode);
  }

  backToDetails(): void {
    if (this.uploading) {
      return;
    }
    this.router.navigate(['/donations/commitments', this.commitmentId]);
  }

  addItem(): void {
    this.items = [...this.items, this.createEmptyItem()];
  }

  removeItem(index: number): void {
    if (this.items.length <= 2) {
      return;
    }
    this.items = this.items.filter((_, i) => i !== index);
  }

  async confirmCreate(): Promise<void> {
    if (this.formDisabled || !this.commitmentId) {
      return;
    }

    const items = this.buildItemsForSubmit();
    if (!items) {
      return;
    }

    const hasFiles = this.selectedFiles.length > 0;
    const storageLocation = getDonationStorageLocation('breakdownRequests');
    if (hasFiles && !storageLocation) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.attachments.errors.locationNotConfigured'),
      });
      return;
    }

    this.uploading = true;
    this.uploadPercent = 0;
    this.fileUploadStatus.clear();
    this.uploadFiles = [];

    try {
      const payload = {
        donationCommitmentId: this.commitmentId,
        items,
        isRegional: this.localStorageService.isRegionalApiInput(),
      };

      const response: any = await firstValueFrom(
        this.donationBreakdownService.createBreakdownRequest(payload),
      );
      console.log('createBreakdownRequest response', response);

      if (!response?.success) {
        this.handleBusinessError('create', response);
        this.uploading = false;
        this.syncUploadProgressOverlay();
        return;
      }

      const breakdownId = this.donationBreakdownService.extractBreakdownRequestId(response.message);
      let attachmentWarning = false;

      if (hasFiles) {
        if (!breakdownId) {
          attachmentWarning = true;
        } else if (storageLocation) {
          attachmentWarning = await this.uploadAndLinkFiles(breakdownId, storageLocation.fileSystemId);
        }
      }

      this.uploading = false;
      this.transferProgressService.resetUploadProgress();
      this.navigateAfterCreate(breakdownId, attachmentWarning);
    } catch (err: unknown) {
      console.error('createBreakdownRequest failed', err);
      this.handleBusinessError('create', this.normalizeUploadError(err));
    } finally {
      this.uploading = false;
      this.currentUploadingFileName = null;
      this.transferProgressService.resetUploadProgress();
    }
  }

  // #region Load data
  private loadContext(): void {
    if (!this.commitmentId) {
      this.loading = false;
      this.router.navigate(['/donations/commitments']);
      return;
    }

    this.loading = true;
    const sub = this.donationCommitmentService.getDonationCommitmentDetails(this.commitmentId).subscribe({
      next: (response: any) => {
        console.log('getDonationCommitmentDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }

        this.rawDetails = (response.message ?? null) as DonationCommitmentBackend | null;
        const details = this.donationCommitmentService.mapDonationCommitmentDetails(this.rawDetails);
        if (!details) {
          this.loading = false;
          this.router.navigate(['/donations/commitments']);
          return;
        }

        this.refreshOriginalFields();
        this.loadRequestStatus(details);
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequestStatus(details: DonationCommitmentDetails): void {
    const donationRequestId = Number(details.donationRequestId || 0);
    if (!donationRequestId) {
      this.rawRequestDetails = null;
      this.refreshOriginalFields();
      this.finishLoad(details.statusId, null);
      return;
    }

    const sub = this.donationRequestsService.getDonationRequestDetails(donationRequestId).subscribe({
      next: (response: any) => {
        console.log('getDonationRequestDetails response', response);
        let requestStatusId: number | null = null;
        if (response?.success) {
          this.rawRequestDetails = this.donationRequestsService.extractDonationRequestDetails(
            response.message as Record<string, unknown>,
          );
          const mapped = this.donationRequestsService.mapDonationRequestDetails(this.rawRequestDetails);
          requestStatusId = mapped?.statusId ?? null;
        } else {
          this.rawRequestDetails = null;
        }
        this.refreshOriginalFields();
        this.finishLoad(details.statusId, requestStatusId);
      },
      error: () => {
        this.rawRequestDetails = null;
        this.refreshOriginalFields();
        this.finishLoad(details.statusId, null);
      },
    });
    this.subscriptions.push(sub);
  }

  private finishLoad(commitmentStatusId: number, requestStatusId: number | null): void {
    if (!canRequestBreakdown(commitmentStatusId, requestStatusId)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.breakdown.errors.invalidStatus'),
      });
      this.loading = false;
      this.router.navigate(['/donations/commitments', this.commitmentId]);
      return;
    }

    this.resetForm();
    this.loading = false;
  }

  private refreshOriginalFields(): void {
    const request = this.donationRequestsService.mapDonationRequestDetails(this.rawRequestDetails);
    if (request) {
      this.originalQuantity = Number(request.quantity || 0);
      this.originalEstimatedCost = Number(request.estimatedCost || 0);
      this.originalCurrencyCode = String(request.currencyCode || '');
      this.originalTitle = String(request.title || '');
      this.originalDescription = String(request.description || '');
      this.originalUnit = String(request.unit || '');
      return;
    }

    const details = this.donationCommitmentService.mapDonationCommitmentDetails(this.rawDetails);
    if (!details) {
      return;
    }
    this.originalQuantity = Number(details.quantity || 0);
    this.originalEstimatedCost = Number(details.estimatedCost || 0);
    this.originalCurrencyCode = String(details.currencyCode || '');
    this.originalTitle = String(details.title || '');
    this.originalDescription = String(details.description || '');
    this.originalUnit = String(details.unit || '');
  }
  // #endregion

  private navigateAfterCreate(breakdownId: number, attachmentWarning: boolean): void {
    if (!breakdownId) {
      this.router.navigate(['/donations/commitments', this.commitmentId], {
        state: {
          toastDetailKey: attachmentWarning
            ? 'donations.breakdown.messages.createdPartialAttachments'
            : 'donations.breakdown.messages.created',
          toastSeverity: attachmentWarning ? 'warn' : 'success',
        },
      });
      return;
    }

    this.router.navigate(['/donations/commitments', this.commitmentId, 'breakdown', breakdownId], {
      state: {
        toastDetailKey: attachmentWarning
          ? 'donations.breakdown.messages.createdPartialAttachments'
          : 'donations.breakdown.messages.created',
        toastSeverity: attachmentWarning ? 'warn' : 'success',
      },
    });
  }

  private buildItemsForSubmit(): CreateBreakdownItemInput[] | null {
    if (this.mode === 'quantity') {
      return this.buildQuantitySplitItems();
    }
    return this.validateCustomItems() ? this.normalizeItems(this.items) : null;
  }

  private buildQuantitySplitItems(): CreateBreakdownItemInput[] | null {
    if (!this.canSplitByQuantity) {
      this.showValidationError('donations.breakdown.createDialog.validation.quantitySplitUnavailable');
      return null;
    }

    const original = Number(this.originalQuantity || 0);
    const donor = Number(this.donorQuantity || 0);
    if (!(donor > 0) || donor >= original) {
      this.showValidationError('donations.breakdown.createDialog.validation.donorQuantityRange');
      return null;
    }

    const remaining = original - donor;
    if (!(remaining > 0)) {
      this.showValidationError('donations.breakdown.createDialog.validation.remainingQuantityRequired');
      return null;
    }

    const title = String(this.originalTitle || '').trim();
    if (!title) {
      this.showValidationError('donations.breakdown.createDialog.validation.titleRequired');
      return null;
    }

    const currencyCode = this.resolvedCurrencyCode;
    if (!currencyCode) {
      this.showValidationError('donations.breakdown.createDialog.validation.currencyRequired');
      return null;
    }

    const originalCost = Number(this.originalEstimatedCost || 0);
    const donorCost = originalCost > 0 ? this.roundCost((donor / original) * originalCost) : 0;
    const remainingCost = originalCost > 0 ? this.roundCost(originalCost - donorCost) : 0;
    const description = String(this.originalDescription || '').trim();

    return [
      {
        title,
        description,
        quantity: donor,
        estimatedCost: donorCost,
        currencyCode,
        donorPortion: true,
      },
      {
        title,
        description,
        quantity: remaining,
        estimatedCost: remainingCost,
        currencyCode,
        donorPortion: false,
      },
    ];
  }

  private validateCustomItems(): boolean {
    if (this.items.length < 2) {
      this.showValidationError('donations.breakdown.createDialog.validation.minItems');
      return false;
    }

    const currencyCode = this.resolvedCurrencyCode;
    for (const item of this.items) {
      if (!String(item.title || '').trim()) {
        this.showValidationError('donations.breakdown.createDialog.validation.titleRequired');
        return false;
      }
      if (!(Number(item.quantity) > 0)) {
        this.showValidationError('donations.breakdown.createDialog.validation.quantityRequired');
        return false;
      }
      if (item.estimatedCost != null && Number(item.estimatedCost) < 0) {
        this.showValidationError('donations.breakdown.createDialog.validation.costInvalid');
        return false;
      }
      if (!String(item.currencyCode || currencyCode || '').trim()) {
        this.showValidationError('donations.breakdown.createDialog.validation.currencyRequired');
        return false;
      }
    }

    const hasDonorPortion = this.items.some((item) => Boolean(item.donorPortion));
    const hasRemainingPortion = this.items.some((item) => !Boolean(item.donorPortion));
    if (!hasDonorPortion || !hasRemainingPortion) {
      this.showValidationError('donations.breakdown.createDialog.validation.donorPortionMix');
      return false;
    }

    return true;
  }

  private normalizeItems(items: CreateBreakdownItemInput[]): CreateBreakdownItemInput[] {
    const currencyCode = this.resolvedCurrencyCode;
    return items.map((item) => ({
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      quantity: Number(item.quantity),
      estimatedCost: Number(item.estimatedCost || 0),
      currencyCode: String(item.currencyCode || currencyCode || '').trim().toUpperCase(),
      donorPortion: Boolean(item.donorPortion),
    }));
  }

  private async uploadAndLinkFiles(
    donationBreakdownRequestId: number,
    uploadTargetFileSystemId: number,
  ): Promise<boolean> {
    const storageLocation = getDonationStorageLocation('breakdownRequests');
    if (!storageLocation) {
      return true;
    }

    this.uploadFiles = [...this.selectedFiles];
    this.fileUploadStatus.clear();
    this.uploadFiles.forEach((file) => this.fileUploadStatus.set(file.name, 'pending'));
    this.uploadPercent = 0;
    this.syncUploadProgressOverlay();

    const owner = resolveBreakdownAttachmentOwner(donationBreakdownRequestId);
    const accessToken = this.localStorageService.getAccessToken();
    const totalFiles = this.uploadFiles.length;
    let anyFailed = false;

    for (let i = 0; i < this.uploadFiles.length; i++) {
      const file = this.uploadFiles[i];
      let linkingFile = false;
      this.currentUploadingFileName = file.name;
      this.fileUploadStatus.set(file.name, 'uploading');
      this.syncUploadProgressOverlay();

      try {
        const uploaded = await this.fileUploadService.uploadFileWithResult(
          file,
          accessToken,
          uploadTargetFileSystemId || storageLocation.fileSystemId,
          BigInt(storageLocation.folderId),
          (percent) => {
            const completedFiles = Array.from(this.fileUploadStatus.values()).filter(
              (status) => status === 'completed',
            ).length;
            this.uploadPercent = Math.round(((completedFiles + percent / 100) / totalFiles) * 100);
            this.syncUploadProgressOverlay();
          },
        );

        linkingFile = true;
        const caption =
          String(this.selectedFiles[i]?.name || file.name || uploaded.fileName || '').trim() ||
          `breakdown_${i + 1}`;
        const attachmentKind = resolveDonationAttachmentKindFromFileName(caption);

        const linkResponse: any = await firstValueFrom(
          this.donationAttachmentService.addDonationAttachment({
            ownerType: owner.ownerType,
            ownerId: owner.ownerId,
            attachmentKind,
            fileId: uploaded.fileId,
            folderId: uploaded.folderId,
            fileSystemId: uploaded.fileSystemId,
            caption,
            isRegional: false,
            sortOrder: i + 1,
          }),
        );

        console.log('addDonationAttachment response', linkResponse);
        console.log('addDonationAttachment breakdown', {
          Donation_Breakdown_Request_ID: donationBreakdownRequestId,
          File_ID: uploaded.fileId,
          Folder_ID: uploaded.folderId,
          File_System_ID: uploaded.fileSystemId,
          Owner_Type: owner.ownerType,
          Owner_ID: owner.ownerId,
          Attachment_Kind: attachmentKind,
        });
        if (!linkResponse?.success) {
          anyFailed = true;
          this.fileUploadStatus.set(file.name, 'error');
          this.handleBusinessError('link', linkResponse);
          continue;
        }

        this.fileUploadStatus.set(file.name, 'completed');
      } catch (err: unknown) {
        anyFailed = true;
        console.error('Breakdown attachment upload/link failed', err);
        if (this.currentUploadingFileName) {
          this.fileUploadStatus.set(this.currentUploadingFileName, 'error');
        }
        const response = this.normalizeUploadError(err);
        this.handleBusinessError(linkingFile ? 'link' : 'upload', response);
      } finally {
        this.currentUploadingFileName = null;
        this.syncUploadProgressOverlay();
      }
    }

    return anyFailed;
  }

  private createEmptyItem(donorPortion = false): CreateBreakdownItemInput {
    return {
      title: '',
      description: '',
      quantity: 1,
      estimatedCost: 0,
      currencyCode: this.resolvedCurrencyCode,
      donorPortion,
    };
  }

  private resetForm(): void {
    this.mode = this.canSplitByQuantity ? 'quantity' : 'custom';
    this.donorQuantity = this.canSplitByQuantity ? 1 : null;
    this.currencyCode = this.defaultCurrencyCode();
    this.items = [this.createEmptyItem(true), this.createEmptyItem(false)];
    this.selectedFiles = [];
    this.uploading = false;
    this.uploadPercent = 0;
    this.fileUploadStatus.clear();
    this.uploadFiles = [];
  }

  private roundCost(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private loadCurrencies(): void {
    const sub = this.lookupService.getCurrencies().subscribe({
      next: (items) => {
        this.currencies = items;
        this.rebuildCurrencyOptions();
      },
    });
    this.subscriptions.push(sub);
  }

  private rebuildCurrencyOptions(): void {
    this.currencyPlaceholder = this.translate.getInstant('donations.breakdown.createDialog.currencyPlaceholder');
    const isArabic = this.localStorageService.isArabicUi();
    this.currencyOptions = this.currencies.map((item) => ({
      label: `${item.code} - ${this.lookupService.getCurrencyLabel(item, isArabic)}`,
      value: String(item.code || '').trim().toUpperCase(),
    }));
    if (!this.currencyCode) {
      this.currencyCode = this.defaultCurrencyCode();
    }
  }

  private defaultCurrencyCode(): string {
    const original = String(this.originalCurrencyCode || '').trim().toUpperCase();
    if (original) {
      return original;
    }
    return this.currencyOptions[0]?.value || '';
  }

  private getFileUploadStatus(fileName: string): TransferFileStatus {
    return this.fileUploadStatus.get(fileName) || 'pending';
  }

  private syncUploadProgressOverlay(): void {
    const files = this.uploadFiles.map((file) => ({
      name: file.name,
      size: file.size,
      status: this.getFileUploadStatus(file.name),
    }));
    this.transferProgressService.setUploadProgress({
      visible: this.uploading,
      percent: this.uploadPercent,
      files,
      blockInteraction: this.uploading,
    });
  }

  private normalizeUploadError(err: unknown): Record<string, unknown> {
    if (!err || typeof err !== 'object') {
      return {};
    }
    const e = err as Record<string, unknown>;
    if (typeof e['Body'] === 'string') {
      try {
        return JSON.parse(e['Body'] as string) as Record<string, unknown>;
      } catch {
        return e;
      }
    }
    return e;
  }

  private showValidationError(key: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: this.translate.getInstant('common.warning'),
      detail: this.translate.getInstant(key),
    });
  }

  private handleBusinessError(context: CreateBreakdownPageContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
      case 'create':
        detail = this.getCreateErrorMessage(code);
        break;
      case 'upload':
      case 'link':
        detail = this.getUploadErrorMessage(code);
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

  private getLoadErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13003':
        return this.translate.getInstant('donations.commitments.errors.commitmentNotFound');
      case 'DAP13014':
        return this.translate.getInstant('donations.commitments.errors.notDonor');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.breakdown.errors.actionFailed');
    }
  }

  private getCreateErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13003':
        return this.translate.getInstant('donations.breakdown.errors.invalidCommitmentId');
      case 'DAP13014':
        return this.translate.getInstant('donations.breakdown.errors.notTheDonor');
      case 'DAP13030':
        return this.translate.getInstant('donations.breakdown.errors.invalidBreakdownItems');
      case 'DAP13010':
        return this.translate.getInstant('donations.breakdown.errors.invalidStatus');
      case 'DAP13033':
        return this.translate.getInstant('donations.breakdown.errors.actionNotAccessible');
      case 'DAP11055':
        return this.translate.getInstant('donations.breakdown.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.breakdown.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.breakdown.errors.actionFailed');
    }
  }

  private getUploadErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP11055':
        return this.translate.getInstant('donations.breakdown.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.breakdown.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.attachments.errors.uploadFailed');
    }
  }
}
