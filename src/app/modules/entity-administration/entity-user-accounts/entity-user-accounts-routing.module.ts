import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntityUserAccountsPageComponent } from './components/entity-user-accounts-page/entity-user-accounts-page.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    {
        path: 'list',
        component: EntityUserAccountsPageComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntityUserAccountsRoutingModule { }
