import { Component } from '@angular/core';
import { LayoutService } from '../app-services/app.layout.service';

@Component({
    selector: 'app-rightmenu',
    templateUrl: './app.rightmenu.component.html',
})
export class AppRightMenuComponent {
    constructor(public layoutService: LayoutService) {}

    get rightMenuActive(): boolean {
        return this.layoutService.state.rightMenuActive;
    }

    set rightMenuActive(_val: boolean) {
        this.layoutService.state.rightMenuActive = _val;
    }
}
