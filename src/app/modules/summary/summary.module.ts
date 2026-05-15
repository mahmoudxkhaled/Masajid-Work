import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryRoutingModule } from './summary-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';

// Components
import { ActionsComponent } from './components/actions/actions.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { ProfileOverviewComponent } from './components/profile/profile-overview/profile-overview.component';
import { ProfileEditComponent } from './components/profile/profile-edit/profile-edit.component';
import { ProfilePreferencesComponent } from './components/profile/profile-preferences/profile-preferences.component';
import { SettingsComponent } from './components/settings/settings.component';
import { AccountSettingsTabComponent } from './components/settings/account-settings-tab/account-settings-tab.component';
import { EntitySettingsTabComponent } from './components/settings/entity-settings-tab/entity-settings-tab.component';
import { SystemSettingsTabComponent } from './components/settings/system-settings-tab/system-settings-tab.component';
import { SharedSettingsPanelComponent } from './components/settings/shared-settings-panel/shared-settings-panel.component';
import { SettingsSectionComponent } from './components/settings/settings-section/settings-section.component';

@NgModule({
    declarations: [
        ActionsComponent,
        NotificationsComponent,
        ProfileOverviewComponent,
        ProfileEditComponent,
        ProfilePreferencesComponent,
        SettingsComponent,
        AccountSettingsTabComponent,
        EntitySettingsTabComponent,
        SystemSettingsTabComponent,
        SharedSettingsPanelComponent,
        SettingsSectionComponent,
    ],
    imports: [
        SummaryRoutingModule,
        SharedModule
    ]
})
export class SummaryModule { }
