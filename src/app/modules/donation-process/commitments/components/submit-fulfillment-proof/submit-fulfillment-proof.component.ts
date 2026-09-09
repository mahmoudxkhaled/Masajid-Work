import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, firstValueFrom } from 'rxjs';
import { FileUploadService } from 'src/app/core/file-system-lib/services/file-upload.service';
import {
  TransferFileStatus,
  TransferProgressService,
} from 'src/app/core/file-system-lib/services/transfer-progress.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  getDonationStorageLocation,
  isDonationStorageLocationReady,
} from '../../../config/donation-storage.config';
import {
  resolveDonationAttachmentKindFromFileName,
  resolveFulfillmentProofAttachmentOwner,
} from '../../../models/donation-attachment.constants';
import {
  DONATION_ATTACHMENT_ALLOWED_EXTENSIONS,
  DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from '../../../models/donation-attachment.model';
import { DonationCommitmentBackend } from '../../../models/donation-commitment.model';
import {
  canSubmitFulfillmentProof,
  resolveDefaultFulfilledBy,
} from '../../../models/donation-fulfillment.model';
import {
  FulfilledBy,
  getFulfilledByOptions,
  isValidFulfilledBy,
} from '../../../models/fulfilled-by.model';
import {
  VendorOfferBackend,
  VendorOfferListItem,
  VendorOfferStatus,
  isActiveVendorOfferStatus,
} from '../../../models/vendor-offer.model';
import { DonationAttachmentService } from '../../../services/donation-attachment.service';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';
import { VendorOffersService } from '../../../vendor-offers/services/vendor-offers.service';
import { DonationCommitmentService } from '../../services/donation-commitment.service';
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';

type SubmitFulfillmentProofContext = 'load' | 'submit' | 'upload' | 'link' | 'select';

@Component({
  standalone: false,
  selector: 'app-submit-fulfillment-proof',
  templateUrl: './submit-fulfillment-proof.component.html',
  styleUrl: './submit-fulfillment-proof.component.scss',
})
export class SubmitFulfillmentProofComponent implements OnInit, OnDestroy {
  commitmentId = 0;
  loading = true;
  selectedVendorOfferId = 0;
  fulfilledBy: number = FulfilledBy.Donor;
  fulfillmentNote = '';
  selectedFiles: File[] = [];
  uploading = false;
  uploadPercent = 0;

  fulfilledByOptions: { value: number; label: string }[] = [];
  vendorOfferOptions: { value: number; label: string }[] = [];
  isDragOver = false;

  isLoading$ = this.donationFulfillmentService.isLoadingSubject.asObservable();

  private uploadFiles: File[] = [];
  private fileUploadStatus = new Map<string, TransferFileStatus>();
  private currentUploadingFileName: string | null = null;
  private fulfillmentMode = 0;
  private selectableOffers: VendorOfferListItem[] = [];
  private alreadySelectedOfferId = 0;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationCommitmentService: DonationCommitmentService,
    private donationRequestsService: DonationRequestsService,
    private vendorOffersService: VendorOffersService,
    private donationFulfillmentService: DonationFulfillmentService,
    private donationAttachmentService: DonationAttachmentService,
    private fileUploadService: FileUploadService,
    private transferProgressService: TransferProgressService,
    private localStorageService: LocalStorageService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.commitmentId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.fulfilledByOptions = getFulfilledByOptions().map((option) => ({
      value: option.value,
      label: this.translate.getInstant(option.labelKey),
    }));
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
    return isDonationStorageLocationReady('fulfillmentProofs');
  }

  get canSelectFiles(): boolean {
    return !this.busy && !this.loading && this.storageConfigured;
  }

  get allowedExtensionsLabel(): string {
    return DONATION_ATTACHMENT_ALLOWED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(', ');
  }

  get fileAcceptAttribute(): string {
    return DONATION_ATTACHMENT_ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',');
  }

  get maxFileSizeLabel(): string {
    return String(DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES / (1024 * 1024));
  }

  // #region Navigation
  backToDetails(): void {
    if (this.uploading) {
      return;
    }
    this.router.navigate(['/donations/commitments', this.commitmentId]);
  }
  // #endregion

  // #region Vendor offer selection
  onVendorOfferChange(): void {
    const offerId = Number(this.selectedVendorOfferId || 0);
    if (offerId > 0) {
      this.fulfilledBy = FulfilledBy.Vendor;
      return;
    }

    const defaultFulfilledBy = resolveDefaultFulfilledBy(0, this.fulfillmentMode);
    this.fulfilledBy = isValidFulfilledBy(defaultFulfilledBy)
      ? defaultFulfilledBy
      : FulfilledBy.Donor;
  }
  // #endregion

  // #region Load context
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

        const raw = (response.message ?? null) as DonationCommitmentBackend | null;
        const details = this.donationCommitmentService.mapDonationCommitmentDetails(raw);
        if (!details) {
          this.loading = false;
          this.router.navigate(['/donations/commitments']);
          return;
        }

        this.fulfillmentMode = Number(details.fulfillmentMode || 0);
        const donationRequestId = Number(details.donationRequestId || 0);
        this.loadVendorOfferAndRequestStatus(donationRequestId, details.statusId);
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadVendorOfferAndRequestStatus(donationRequestId: number, commitmentStatusId: number): void {
    if (!donationRequestId) {
      this.selectedVendorOfferId = 0;
      this.alreadySelectedOfferId = 0;
      this.selectableOffers = [];
      this.buildVendorOfferOptions();
      this.applyDefaults(commitmentStatusId, null);
      return;
    }

    const sub = this.vendorOffersService.listVendorOffersForRequest(donationRequestId).subscribe({
      next: (offersResponse: any) => {
        console.log('listVendorOffersForRequest response', offersResponse);
        if (offersResponse?.success) {
          const rawOffers = this.vendorOffersService.dedupeVendorOffersById(
            Array.isArray(offersResponse.message)
              ? (offersResponse.message as VendorOfferBackend[])
              : this.vendorOffersService.extractVendorOffers(offersResponse.message),
          );
          const mapped = rawOffers.map((item) => this.vendorOffersService.mapVendorOfferListItem(item));
          this.selectableOffers = mapped.filter(
            (offer) =>
              isActiveVendorOfferStatus(offer.statusId, offer.statusCode) || this.isSelectedOfferItem(offer),
          );
          const selected = mapped.find((offer) => this.isSelectedOfferItem(offer));
          this.alreadySelectedOfferId = Number(selected?.id || 0);
          this.selectedVendorOfferId = this.alreadySelectedOfferId;
        } else {
          this.selectedVendorOfferId = 0;
          this.alreadySelectedOfferId = 0;
          this.selectableOffers = [];
        }
        this.buildVendorOfferOptions();

        const requestSub = this.donationRequestsService.getDonationRequestDetails(donationRequestId).subscribe({
          next: (requestResponse: any) => {
            console.log('getDonationRequestDetails response', requestResponse);
            let requestStatusId: number | null = null;
            if (requestResponse?.success) {
              const message = requestResponse.message ?? {};
              requestStatusId = Number(
                message.Donation_Request_Status_ID ?? message.Status ?? 0,
              ) || null;
            }
            this.applyDefaults(commitmentStatusId, requestStatusId);
          },
          error: () => {
            this.applyDefaults(commitmentStatusId, null);
          },
        });
        this.subscriptions.push(requestSub);
      },
      error: () => {
        this.selectedVendorOfferId = 0;
        this.alreadySelectedOfferId = 0;
        this.selectableOffers = [];
        this.buildVendorOfferOptions();
        this.applyDefaults(commitmentStatusId, null);
      },
    });
    this.subscriptions.push(sub);
  }

  private buildVendorOfferOptions(): void {
    const noneLabel = this.translate.getInstant(
      'donations.commitments.submitProofDialog.vendorOfferNone',
    );
    this.vendorOfferOptions = [
      { value: 0, label: noneLabel },
      ...this.selectableOffers.map((offer) => ({
        value: Number(offer.id || 0),
        label: this.formatVendorOfferOption(offer),
      })),
    ];
  }

  private formatVendorOfferOption(offer: VendorOfferListItem): string {
    const vendor = offer.vendorEntityId ? `#${offer.vendorEntityId}` : '-';
    const amount = offer.currencyCode
      ? `${offer.offerAmount} ${offer.currencyCode}`
      : String(offer.offerAmount || '-');
    return `${vendor} — ${amount}`;
  }

  private applyDefaults(commitmentStatusId: number, requestStatusId: number | null): void {
    if (!canSubmitFulfillmentProof(commitmentStatusId, requestStatusId)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.commitments.errors.invalidFulfillmentStatus'),
      });
      this.loading = false;
      this.router.navigate(['/donations/commitments', this.commitmentId]);
      return;
    }

    const defaultFulfilledBy = resolveDefaultFulfilledBy(
      this.selectedVendorOfferId,
      this.fulfillmentMode,
    );
    this.fulfilledBy = isValidFulfilledBy(defaultFulfilledBy)
      ? defaultFulfilledBy
      : FulfilledBy.Donor;
    this.loading = false;
  }

  private isSelectedOfferItem(offer: VendorOfferListItem): boolean {
    return (
      offer.statusId === VendorOfferStatus.Selected ||
      String(offer.statusCode || '').toUpperCase() === 'SELECTED'
    );
  }
  // #endregion

  // #region File selection
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    this.addSelectedFiles(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.canSelectFiles) {
      return;
    }
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    if (!this.canSelectFiles) {
      return;
    }
    this.addSelectedFiles(Array.from(event.dataTransfer?.files || []));
  }

  removeFile(index: number): void {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  getFileIcon(file: File): string {
    const extension = this.getFileExtension(file);
    if (extension === 'pdf') {
      return 'pi pi-file-pdf';
    }
    if (extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'webp') {
      return 'pi pi-image';
    }
    return 'pi pi-file';
  }

  formatFileSize(bytes: number): string {
    const size = Number(bytes) || 0;
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  private addSelectedFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    const accepted: File[] = [];
    for (const file of files) {
      if (!this.isAllowedFile(file)) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.getInstant('common.error'),
          detail: this.translate.getInstant('donations.attachments.errors.invalidFileType'),
        });
        continue;
      }
      if (file.size <= 0 || file.size > DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.getInstant('common.error'),
          detail: this.translate.getInstant('donations.attachments.errors.invalidFileSize'),
        });
        continue;
      }
      accepted.push(file);
    }

    this.selectedFiles = [...this.selectedFiles, ...accepted].slice(0, 10);
  }

  private getFileExtension(file: File): string {
    const name = String(file.name || '');
    return name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';
  }

  private isAllowedFile(file: File): boolean {
    return (DONATION_ATTACHMENT_ALLOWED_EXTENSIONS as readonly string[]).includes(
      this.getFileExtension(file),
    );
  }
  // #endregion

  // #region Submit
  async confirmSubmit(): Promise<void> {
    if (this.uploading || this.loading) {
      return;
    }

    if (!isValidFulfilledBy(this.fulfilledBy)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant(
          'donations.commitments.submitProofDialog.validation.fulfilledByRequired',
        ),
      });
      return;
    }

    if (this.fulfilledBy === FulfilledBy.Vendor && this.selectedVendorOfferId <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant(
          'donations.commitments.submitProofDialog.validation.vendorOfferRequired',
        ),
      });
      return;
    }

    const hasFiles = this.selectedFiles.length > 0;
    const storageLocation = getDonationStorageLocation('fulfillmentProofs');
    if (hasFiles && !storageLocation) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.attachments.errors.locationNotConfigured'),
      });
      return;
    }

    if (!this.commitmentId) {
      return;
    }

    this.uploading = true;
    this.uploadPercent = 0;
    this.fileUploadStatus.clear();
    this.uploadFiles = [];

    const offerId = this.selectedVendorOfferId > 0 ? this.selectedVendorOfferId : 0;

    try {
      if (offerId > 0 && offerId !== this.alreadySelectedOfferId) {
        const selectResponse: any = await firstValueFrom(
          this.vendorOffersService.selectVendorOffer(offerId),
        );
        console.log('selectVendorOffer response', selectResponse);
        if (!selectResponse?.success) {
          this.handleBusinessError('select', selectResponse);
          this.uploading = false;
          this.syncUploadProgressOverlay();
          return;
        }
        this.alreadySelectedOfferId = offerId;
      }

      const payload = {
        donationCommitmentId: this.commitmentId,
        fulfilledBy: this.fulfilledBy,
        donationVendorOfferId: offerId,
        fulfillmentNote: String(this.fulfillmentNote || '').trim(),
        isRegional: this.localStorageService.isRegionalApiInput(),
      };

      console.log('submitFulfillmentProof params', payload);

      const response: any = await firstValueFrom(
        this.donationFulfillmentService.submitFulfillmentProof(payload),
      );
      console.log('submitFulfillmentProof response', response);

      if (!response?.success) {
        this.handleBusinessError('submit', response);
        this.uploading = false;
        this.syncUploadProgressOverlay();
        return;
      }

      const fulfillmentId = this.donationFulfillmentService.extractFulfillmentId(response.message);
      let attachmentLinkFailed = false;

      if (hasFiles) {
        if (!fulfillmentId) {
          console.warn('Donation_Fulfillment_ID is required to link fulfillment proof attachments after submit.', {
            Donation_Commitment_ID: payload.donationCommitmentId,
            Donation_Fulfillment_ID: fulfillmentId,
            response,
          });
          attachmentLinkFailed = true;
        } else if (storageLocation) {
          attachmentLinkFailed = await this.uploadAndLinkProofFiles(fulfillmentId, storageLocation.fileSystemId);
        }
      }

      if (attachmentLinkFailed) {
        this.uploading = false;
        this.transferProgressService.resetUploadProgress();
        this.router.navigate(['/donations/commitments', this.commitmentId], {
          state: {
            toastDetailKey: 'donations.commitments.messages.fulfillmentSubmittedPartialAttachments',
            toastSeverity: 'warn',
          },
        });
        return;
      }

      this.uploading = false;
      this.transferProgressService.resetUploadProgress();
      this.router.navigate(['/donations/commitments', this.commitmentId], {
        state: {
          toastDetailKey: 'donations.commitments.messages.fulfillmentSubmitted',
          toastSeverity: 'success',
        },
      });
    } catch (err: unknown) {
      console.error('submitFulfillmentProof failed', err);
      this.handleBusinessError('submit', this.normalizeUploadError(err));
    } finally {
      this.uploading = false;
      this.currentUploadingFileName = null;
      this.transferProgressService.resetUploadProgress();
    }
  }

  private async uploadAndLinkProofFiles(
    donationFulfillmentId: number,
    uploadTargetFileSystemId: number,
  ): Promise<boolean> {
    const storageLocation = getDonationStorageLocation('fulfillmentProofs');
    if (!storageLocation) {
      return true;
    }

    this.uploadFiles = [...this.selectedFiles];
    this.fileUploadStatus.clear();
    this.uploadFiles.forEach((file) => this.fileUploadStatus.set(file.name, 'pending'));
    this.uploadPercent = 0;
    this.syncUploadProgressOverlay();

    const owner = resolveFulfillmentProofAttachmentOwner(donationFulfillmentId);
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
          `proof_${i + 1}`;
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
        console.log('addDonationAttachment fulfillment proof', {
          Donation_Fulfillment_ID: donationFulfillmentId,
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
          console.log('Donation attachment link failed after upload', {
            Donation_Fulfillment_ID: donationFulfillmentId,
            File_ID: uploaded.fileId,
            Folder_ID: uploaded.folderId,
            File_System_ID: uploaded.fileSystemId,
            Owner_Type: owner.ownerType,
            Owner_ID: owner.ownerId,
            Attachment_Kind: attachmentKind,
            response: linkResponse,
          });
          this.handleBusinessError('link', linkResponse);
          continue;
        }

        this.fileUploadStatus.set(file.name, 'completed');
      } catch (err: unknown) {
        anyFailed = true;
        console.error('Fulfillment proof upload/link failed', err);
        if (this.currentUploadingFileName) {
          this.fileUploadStatus.set(this.currentUploadingFileName, 'error');
        }
        const response = this.normalizeUploadError(err);
        if (linkingFile) {
          this.handleBusinessError('link', response);
        } else {
          this.handleBusinessError('upload', response);
        }
      } finally {
        this.currentUploadingFileName = null;
        this.syncUploadProgressOverlay();
      }
    }

    return anyFailed;
  }
  // #endregion

  // #region Upload helpers
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
        return { message: e['Body'] };
      }
    }
    if (e['error'] && typeof e['error'] === 'object') {
      return e['error'] as Record<string, unknown>;
    }
    if (typeof e['error'] === 'string') {
      return { message: e['error'] };
    }
    return e;
  }
  // #endregion

  // #region Errors
  private handleBusinessError(context: SubmitFulfillmentProofContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
      case 'upload':
        detail = this.getStorageApiErrorMessage(code) ?? this.getNonCodeErrorDetail(response);
        break;
      case 'link':
        detail = this.getLinkErrorMessage(code);
        break;
      case 'submit':
        detail = this.getSubmitErrorMessage(code);
        break;
      case 'select':
        detail = this.getSelectErrorMessage(code);
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
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getNonCodeErrorDetail(response: any): string | null {
    const read = (root: any): string | null => {
      if (root == null) {
        return null;
      }
      const msg = root.message;
      if (msg != null && typeof msg === 'object' && (msg as { detail?: string }).detail != null) {
        return String((msg as { detail?: string }).detail);
      }
      if (typeof msg === 'string' && !/^(ERP|DAP|FWA)\d+$/i.test(msg)) {
        return msg;
      }
      return null;
    };
    return read(response) ?? read(response?.error);
  }

  private getLinkErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13008':
        return this.translate.getInstant('donations.attachments.errors.invalidOwner');
      case 'DAP13010':
        return this.translate.getInstant('donations.attachments.errors.ownerNotEditable');
      case 'DAP11055':
        return this.translate.getInstant('donations.attachments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.attachments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getSelectErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13004':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.offerNotFound');
      case 'DAP13014':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.notDonor');
      case 'DAP13010':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.invalidStatus');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getSubmitErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13003':
        return this.translate.getInstant('donations.commitments.errors.commitmentNotFound');
      case 'DAP13014':
        return this.translate.getInstant('donations.commitments.errors.submitProofNotDonor');
      case 'DAP13029':
        return this.translate.getInstant('donations.commitments.errors.proofRequired');
      case 'DAP13010':
        return this.translate.getInstant('donations.commitments.errors.invalidFulfillmentStatus');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.errors.accessDeniedAction');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getStorageApiErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP12000':
        return this.translate.getInstant('fileSystem.admin.errorAccessDenied');
      case 'DAP12001':
        return this.translate.getInstant('fileSystem.admin.errorBlockedIpPermanent');
      case 'DAP12002':
        return this.translate.getInstant('fileSystem.admin.errorBlockedIpTemporary');
      case 'DAP12005':
        return this.translate.getInstant('fileSystem.admin.errorMissingStorageToken');
      case 'DAP12006':
        return this.translate.getInstant('fileSystem.admin.errorInvalidStorageToken');
      case 'DAP12007':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedAction');
      case 'DAP12008':
        return this.translate.getInstant('fileSystem.admin.errorInvalidRequestRouting');
      case 'DAP12009':
        return this.translate.getInstant('fileSystem.admin.errorRequestUnderDevelopment');
      case 'DAP12010':
        return this.translate.getInstant('fileSystem.admin.errorResponseManagement');
      case 'DAP12011':
        return this.translate.getInstant('fileSystem.admin.errorApiCallExecution');
      case 'DAP12012':
        return this.translate.getInstant('fileSystem.admin.errorFileServerDatabase');
      case 'DAP12240':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileId');
      case 'DAP12250':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFolderId');
      case 'DAP12260':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemId');
      case 'DAP12270':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemAccessToken');
      case 'DAP12280':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileAllocation');
      case 'DAP12290':
        return this.translate.getInstant('fileSystem.admin.errorInvalidDriveId');
      case 'DAP12291':
        return this.translate.getInstant('fileSystem.admin.errorDriveInactive');
      case 'DAP12292':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedDriveOwner');
      case 'DAP12295':
        return this.translate.getInstant('fileSystem.admin.errorNotEnoughFileSystemAccessRight');
      case 'DAP12293':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccessType');
      case 'DAP12294':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccessRight');
      case 'DAP12296':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccountId');
      case 'DAP12297':
        return this.translate.getInstant('fileSystem.admin.errorOwnerOrFullRequired');
      case 'DAP12298':
        return this.translate.getInstant('fileSystem.admin.errorActionNotAllowedOnReferenceAllocation');
      case 'DAP12299':
        return this.translate.getInstant('fileSystem.admin.errorActionNotAllowedOnCopyAllocation');
      case 'DAP12220':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileName');
      case 'DAP12221':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileType');
      case 'DAP12222':
        return this.translate.getInstant('fileSystem.admin.errorInvalidDateFormat');
      case 'DAP12223':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSize');
      case 'DAP12224':
        return this.translate.getInstant('fileSystem.admin.errorInvalidNChunks');
      case 'DAP12225':
        return this.translate.getInstant('fileSystem.admin.errorNChunksMismatch');
      case 'DAP12226':
        return this.translate.getInstant('fileSystem.admin.errorInsufficientStorage');
      case 'DAP12227':
        return this.translate.getInstant('fileSystem.admin.errorFileExistsInFolder');
      case 'DAP12228':
        return this.translate.getInstant('fileSystem.admin.errorInvalidChunkSize');
      case 'DAP12230':
        return this.translate.getInstant('fileSystem.admin.errorInvalidUploadToken');
      case 'DAP12231':
        return this.translate.getInstant('fileSystem.admin.errorInvalidChunkId');
      case 'DAP12232':
        return this.translate.getInstant('fileSystem.admin.errorInvalidOffset');
      case 'DAP12233':
        return this.translate.getInstant('fileSystem.admin.errorNoChunksReceived');
      case 'DAP12234':
        return this.translate.getInstant('fileSystem.admin.errorChunkEmpty');
      case 'DAP12235':
        return this.translate.getInstant('fileSystem.admin.errorChunkHashEmpty');
      case 'DAP12236':
        return this.translate.getInstant('fileSystem.admin.errorChunkHashInvalid');
      case 'DAP12237':
        return this.translate.getInstant('fileSystem.admin.errorFileStorage');
      case 'DAP12248':
        return this.translate.getInstant('fileSystem.admin.errorInvalidEntityFilter');
      case 'DAP12251':
      case 'DAP12252':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'DAP12255':
        return this.translate.getInstant('fileSystem.admin.errorFileSystemInUse');
      case 'DAP12267':
        return this.translate.getInstant('fileSystem.folderManagement.errorInvalidRestoreSelection');
      case 'DAP12263':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileAllocationType');
      case 'FWA12251':
      case 'FWA12252':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'FWA12255':
        return this.translate.getInstant('fileSystem.admin.errorFileSystemInUse');
      default:
        return null;
    }
  }
  // #endregion
}
