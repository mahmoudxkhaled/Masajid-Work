import { Component } from '@angular/core';
import { Router } from '@angular/router';

export interface FileSystemBox {
    id: string;
    route: string;
    labelKey: string;
    icon: string;
}

@Component({
    selector: 'app-file-system-landing',
    templateUrl: './file-system-landing.component.html',
    styleUrls: ['./file-system-landing.component.scss']
})
export class FileSystemLandingComponent {
    boxes: FileSystemBox[] = [
        { id: 'ssm', route: 'system-storage-management', labelKey: 'fileSystem.landing.ssm', icon: 'pi pi-cog' },
        { id: 'esm', route: 'entity-storage-management', labelKey: 'fileSystem.landing.esm', icon: 'pi pi-building' },
        { id: 'storage-content', route: 'storage-content-management', labelKey: 'fileSystem.landing.storageContentManagement', icon: 'pi pi-folder' }
    ];

    constructor(private router: Router) {}

    onBoxClick(box: FileSystemBox): void {
        if (box.id === 'esm') {
            this.router.navigate(['/entity-administration/entity-storage-management']);
            return;
        }
        if (box.id === 'ssm') {
            this.router.navigate(['/system-administration/system-storage-management']);
            return;
        }
        this.router.navigate(['/document-control', box.route]);
    }
}
