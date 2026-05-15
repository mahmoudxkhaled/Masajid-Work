import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { ErpFunctionsRoutingModule } from './erp-functions-routing.module';
import { FunctionLogoComponent } from './components/function-logo/function-logo.component';
import { FunctionsListComponent } from './components/functions-list/functions-list.component';
import { FunctionFormComponent } from './components/function-form/function-form.component';
import { FunctionDetailsComponent } from './components/function-details/function-details.component';

// Function Components

@NgModule({
    declarations: [
        FunctionsListComponent,
        FunctionFormComponent,
        FunctionDetailsComponent,
        FunctionLogoComponent,
    ],
    imports: [
        ErpFunctionsRoutingModule,
        SharedModule,
    ],
    providers: [MessageService]
})
export class ErpFunctionsModule { }
