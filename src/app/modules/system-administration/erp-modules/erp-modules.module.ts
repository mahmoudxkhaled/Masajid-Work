import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { ErpModulesRoutingModule } from './erp-modules-routing.module';
import { ModuleLogoComponent } from './components/module-logo/module-logo.component';
import { ModulesListComponent } from './components/modules-list/modules-list.component';
import { ModuleFormComponent } from './components/module-form/module-form.component';
import { ModuleDetailsComponent } from './components/module-details/module-details.component';

// Module Components

@NgModule({
    declarations: [
        ModulesListComponent,
        ModuleFormComponent,
        ModuleDetailsComponent,
        ModuleLogoComponent,
    ],
    imports: [
        ErpModulesRoutingModule,
        SharedModule,
    ],
    providers: [MessageService]
})
export class ErpModulesModule { }

