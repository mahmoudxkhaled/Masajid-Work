import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface LicenseRow {
    productKey: string;
    count: number;
    expiry: string;
}

@Component({
    selector: 'app-system-storage-management',
    templateUrl: './system-storage-management.component.html',
    styleUrls: ['./system-storage-management.component.scss']
})
export class SystemStorageManagementComponent implements OnInit {
    capacityUsedPercent = 65;
    capacityUsedLabel = '';

    licenses: LicenseRow[] = [
        { productKey: 'fileSystem.admin.productEnterprise', count: 100, expiry: '2024-12-31' },
        { productKey: 'fileSystem.admin.productStoragePack', count: 50, expiry: '2024-06-30' }
    ];

    virtualDrivesCount = 0;
    totalUploads = '0';
    totalDownloads = '0';
    totalFilesTraffic = '0';

    constructor(private translate: TranslationService) {}

    ngOnInit(): void {
        this.capacityUsedLabel = this.translate.getInstant('fileSystem.systemAdmin.capacityUsedLabel');
    }

    getProductLabel(row: LicenseRow): string {
        return this.translate.getInstant(row.productKey);
    }
}
