import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { RolesRoutingModule } from './roles-routing.module';

// Components
import { RolesListComponent } from './components/Role/roles-list/roles-list.component';
import { RoleFormComponent } from './components/Role/role-form/role-form.component';
import { RoleDetailsComponent } from './components/Role/role-details/role-details.component';
import { EditRoleDialogComponent } from './components/Role/edit-role-dialog/edit-role-dialog.component';
import { RolePermissionsComponent } from './components/Permissions/role-permissions/role-permissions.component';
import { AssignRoleToAccountComponent } from './components/Assignment/assign-role-to-account/assign-role-to-account.component';

@NgModule({
    declarations: [
        RolesListComponent,
        RoleFormComponent,
        RoleDetailsComponent,
        EditRoleDialogComponent,
        RolePermissionsComponent,
        AssignRoleToAccountComponent,
    ],
    imports: [
        RolesRoutingModule,
        SharedModule,
    ],
    exports: [
        RolesListComponent, // Export so it can be used in other modules
    ],
    providers: [MessageService]
})
export class RolesModule { }
