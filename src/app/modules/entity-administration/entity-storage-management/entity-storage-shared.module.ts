import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { FileSystemsSectionComponent } from './file-systems-section/file-systems-section.component';

@NgModule({
    declarations: [
        FileSystemsSectionComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        SharedModule
    ],
    exports: [
        FileSystemsSectionComponent
    ]
})
export class EntityStorageSharedModule { }
