import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { SystemDashboardRoutingModule } from './system-dashboard-routing.module';
import { SystemDashboardComponent } from './components/system-dashboard/system-dashboard.component';

@NgModule({
    declarations: [SystemDashboardComponent],
    imports: [SharedModule, SystemDashboardRoutingModule],
    providers: [MessageService],
})
export class SystemDashboardModule {}
