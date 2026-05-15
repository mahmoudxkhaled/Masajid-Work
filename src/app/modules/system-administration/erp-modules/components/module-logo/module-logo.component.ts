import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { FileUpload } from 'primeng/fileupload';
import { SettingsConfigurationsService } from 'src/app/modules/system-administration/settings-configurations.service';

@Component({
    selector: 'app-module-logo',
    templateUrl: './module-logo.component.html',
    styleUrls: ['./module-logo.component.scss']
})
export class ModuleLogoComponent implements OnInit, OnDestroy {
    @ViewChild('logoUploader') logoUploader?: FileUpload;

    private _visible: boolean = false;

    @Input()
    get visible(): boolean {
        return this._visible;
    }
    set visible(value: boolean) {
        this._visible = value;
        if (value) {
            this.setPlaceholderLogo();
            setTimeout(() => this.loadLogo(), 0);
        } else {
            this.setPlaceholderLogo();
        }
    }

    @Input() moduleId: number = 0;
    @Input() moduleName: string = '';

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() logoUpdated = new EventEmitter<void>();

    loading: boolean = false;
    loadingLogo: boolean = false;
    moduleLogo: string = 'assets/media/upload-photo.jpg';
    hasLogo: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private settingsConfigurationsService: SettingsConfigurationsService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['moduleId'] && this._visible && this.moduleId && this.moduleId > 0) {
            this.loadLogo();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadLogo(): void {
        if (!this.moduleId || this.moduleId === 0) {
            return;
        }

        this.loadingLogo = true;
        const sub = this.settingsConfigurationsService.getModuleLogo(this.moduleId).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message) {
                    const logoData = response.message;
                    if (logoData?.Image && logoData.Image.trim() !== '') {
                        const imageFormat = logoData.Image_Format || 'png';
                        this.moduleLogo = `data:image/${imageFormat.toLowerCase()};base64,${logoData.Image}`;
                        this.hasLogo = true;
                    } else {
                        this.setPlaceholderLogo();
                    }
                } else {
                    this.setPlaceholderLogo();
                }
                this.loadingLogo = false;
            },
            error: () => {
                this.setPlaceholderLogo();
                this.loadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    private setPlaceholderLogo(): void {
        this.moduleLogo = 'assets/media/upload-photo.jpg';
        this.hasLogo = false;
    }

    private uint8ArrayToBase64(bytes: Uint8Array): string {
        const chunkSize = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
            binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        return btoa(binary);
    }

    onLogoUpload(event: any): void {
        const file = event.files?.[0];
        if (!file) {
            return;
        }

        // Validate file type by MIME type (matching entity logo pattern)
        if (!file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid File Type',
                detail: 'Please select an image file (JPG, PNG, JPEG, WEBP).',
                life: 5000
            });
            this.logoUploader?.clear();
            return;
        }

        const RECOMMENDED_FILE_SIZE = 200 * 1024;
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const recommendedSizeInKB = (RECOMMENDED_FILE_SIZE / 1024).toFixed(0);

        if (file.size > RECOMMENDED_FILE_SIZE) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Large File Size',
                detail: `File size (${fileSizeInMB}MB) is larger than recommended (${recommendedSizeInKB}KB). Upload may take longer.`,
                life: 5000
            });
            this.loading = false;
            this.logoUploader?.clear();
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const byteArray = new Uint8Array(arrayBuffer);
            // Extract format from MIME type (matching entity logo pattern)
            const imageFormat = file.type.split('/')[1] || 'png';

            this.uploadLogo(byteArray, imageFormat);
        };
        reader.onerror = () => {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to read file. Please try again.',
                life: 5000
            });
        };
        reader.readAsArrayBuffer(file);
    }

    uploadLogo(byteArray: Uint8Array, imageFormat: string): void {
        this.loading = true;

        const base64String = this.uint8ArrayToBase64(byteArray);

        const sub = this.settingsConfigurationsService.setModuleLogo(
            this.moduleId,
            imageFormat,
            base64String
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Logo uploaded successfully.',
                    life: 3000
                });

                this.logoUpdated.emit();
                this.loadLogo();
            },
            complete: () => {
                this.loading = false;
                this.logoUploader?.clear();
            }
        });

        this.subscriptions.push(sub);
    }

    removeLogo(): void {
        if (!this.moduleId || this.moduleId === 0) {
            return;
        }

        this.loading = true;

        // Send empty string to remove the logo
        const sub = this.settingsConfigurationsService.setModuleLogo(
            this.moduleId,
            '',
            ''
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    // Check if error is ERP11409 (empty contents) - this is expected for removal
                    const errorCode = String(response?.message || '');
                    if (errorCode === 'ERP11409') {
                        // API accepted empty string as removal
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Logo removed successfully.',
                            life: 3000
                        });
                        this.logoUpdated.emit();
                        this.loadLogo();
                    } else {
                        this.handleBusinessError(response);
                    }
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Logo removed successfully.',
                    life: 3000
                });

                this.logoUpdated.emit();
                this.loadLogo();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    closeDialog(): void {
        this.onVisibleChange(false);
    }

    onDialogHide(): void {
        this.onVisibleChange(false);
    }

    onVisibleChange(value: boolean): void {
        this._visible = value;
        this.visibleChange.emit(value);
    }

    private handleBusinessError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11410':
                detail = 'Invalid Module ID';
                break;
            case 'ERP11408':
                detail = 'Unknown image file format';
                break;
            case 'ERP11409':
                detail = 'Empty contents for logo file';
                break;
            default:
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
        return null;
    }
}
