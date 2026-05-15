import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { DocumentControlRoutingModule } from './document-control-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';

import { FileSystemLandingComponent } from './storage-content-management/file-system-landing/file-system-landing.component';

@NgModule({
    declarations: [
        FileSystemLandingComponent
    ],
    imports: [
        CommonModule,
        BreadcrumbModule,
        DocumentControlRoutingModule,
        SharedModule
    ]
})
export class DocumentControlModule { }
