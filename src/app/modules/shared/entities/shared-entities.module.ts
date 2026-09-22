import { NgModule } from '@angular/core';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { SharedEntitiesListComponent } from 'src/app/modules/shared/entities/components/shared-entities-list/shared-entities-list.component';
import { SharedEntityDetailsComponent } from 'src/app/modules/shared/entities/components/shared-entity-details/shared-entity-details.component';
import { SharedEntityFormComponent } from 'src/app/modules/shared/entities/components/shared-entity-form/shared-entity-form.component';
import { SharedEntityContactComponent } from 'src/app/modules/shared/entities/components/shared-entity-contact/shared-entity-contact.component';
import { LocationPickerModule } from 'src/app/Shared/components/location-picker/location-picker.module';

@NgModule({
    declarations: [
        SharedEntitiesListComponent,
        SharedEntityDetailsComponent,
        SharedEntityFormComponent,
        SharedEntityContactComponent
    ],
    imports: [
        SharedModule,
        LocationPickerModule
    ],
    exports: [
        SharedEntitiesListComponent,
        SharedEntityDetailsComponent,
        SharedEntityFormComponent,
        SharedEntityContactComponent
    ]
})
export class SharedEntitiesModule { }

