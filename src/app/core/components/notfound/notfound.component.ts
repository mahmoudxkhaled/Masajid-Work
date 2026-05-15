import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Component({
	templateUrl: './notfound.component.html',
	styleUrls: ['./notfound.component.scss']
})
export class NotfoundComponent {

	constructor(
		private location: Location,
		public translate: TranslateService
	) { }

	get isRtl(): boolean {
		return this.translate.currentLang === 'ar';
	}

	goBack(): void {
		this.location.back();
	}
}


