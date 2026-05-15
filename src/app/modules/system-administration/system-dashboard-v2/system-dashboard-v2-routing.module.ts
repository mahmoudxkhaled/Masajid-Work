import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SystemDashboardV2Component } from './components/system-dashboard-v2/system-dashboard-v2.component';

const routes: Routes = [{ path: '', component: SystemDashboardV2Component }];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class SystemDashboardV2RoutingModule {}
