import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SystemDashboardComponent } from './components/system-dashboard/system-dashboard.component';

const routes: Routes = [{ path: '', component: SystemDashboardComponent }];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class SystemDashboardRoutingModule {}
