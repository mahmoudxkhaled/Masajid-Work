import { Component } from '@angular/core';
import { Router } from '@angular/router';

export interface StorageContentBox {
    id: string;
    route: string;
    labelKey: string;
    codeKey: string;
    icon: string;
}

@Component({
    selector: 'app-storage-content-landing',
    templateUrl: './storage-content-landing.component.html',
    styleUrls: ['./storage-content-landing.component.scss']
})
export class StorageContentLandingComponent {
    boxes: StorageContentBox[] = [
        { id: 'osfs', route: 'storage-content-management/osfs', labelKey: 'fileSystem.landing.osfs', codeKey: 'fileSystem.landing.osfsCode', icon: 'pi pi-folder-open' },
        { id: 'sfs', route: 'storage-content-management/shared-files', labelKey: 'fileSystem.landing.sfs', codeKey: 'fileSystem.landing.sfsCode', icon: 'pi pi-share-alt' },
        { id: 'dcs', route: 'storage-content-management/document-control-system', labelKey: 'fileSystem.landing.dcs', codeKey: 'fileSystem.landing.dcsCode', icon: 'pi pi-file-edit' },
        { id: 'edms', route: 'storage-content-management/electronic-document-management-system', labelKey: 'fileSystem.landing.edms', codeKey: 'fileSystem.landing.edmsCode', icon: 'pi pi-database' }
    ];

    constructor(private router: Router) {}

    onBoxClick(box: StorageContentBox): void {
        this.router.navigate(['/document-control', ...box.route.split('/')]);
    }
}
