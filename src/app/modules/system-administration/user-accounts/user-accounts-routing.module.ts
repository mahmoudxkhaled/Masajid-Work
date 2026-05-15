import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SystemUserAccountsPageComponent } from './components/system-user-accounts-page/system-user-accounts-page.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    {
        path: 'list',
        component: SystemUserAccountsPageComponent,
        data: { breadcrumb: 'userAccounts' }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SystemUserAccountsRoutingModule { }
