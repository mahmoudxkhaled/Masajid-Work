import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FunctionsListComponent } from './components/functions-list/functions-list.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: FunctionsListComponent, data: { breadcrumb: 'functionsList' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ErpFunctionsRoutingModule { }

