import { NgModule } from '@angular/core';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { WorkflowsComponent } from './workflows/workflows.component';
import { EntityAdministrationRoutingModule } from './entity-administration-routing.module';


@NgModule({
    declarations: [

    ],
    imports: [
        EntityAdministrationRoutingModule,
        SharedModule,
        ReactiveFormsModule
    ]
})
export class EntityAdministrationModule { }
