import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { InvoicesComponent } from './components/invoices/invoices.component';

const routes: Routes = [
    { path: '', component: InvoicesComponent, data: { breadcrumb: 'invoices' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class FinancialsRoutingModule { }
