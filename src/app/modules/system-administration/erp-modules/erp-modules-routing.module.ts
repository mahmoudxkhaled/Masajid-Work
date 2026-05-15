import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ModulesListComponent } from './components/modules-list/modules-list.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: ModulesListComponent, data: { breadcrumb: 'modulesList' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ErpModulesRoutingModule { }

