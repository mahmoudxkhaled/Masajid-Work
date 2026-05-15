import { Component } from '@angular/core';
import { getAllKnownSettingKeys } from '../../../models/known-settings.schema';

@Component({
    selector: 'app-system-settings-tab',
    templateUrl: './system-settings-tab.component.html',
    styleUrls: ['./system-settings-tab.component.scss'],
})
export class SystemSettingsTabComponent {
    readonly systemKeys = getAllKnownSettingKeys();
}
