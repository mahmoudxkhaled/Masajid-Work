import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { SystemDashboardV2RoutingModule } from './system-dashboard-v2-routing.module';
import { SystemDashboardV2Component } from './components/system-dashboard-v2/system-dashboard-v2.component';

@NgModule({
    declarations: [SystemDashboardV2Component],
    imports: [SharedModule, SystemDashboardV2RoutingModule],
    providers: [MessageService],
})
export class SystemDashboardV2Module {}
