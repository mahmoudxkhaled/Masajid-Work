import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TranslationService } from 'src/app/core/services/translation.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
    selector: 'app-notifications',
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {


    constructor(
        public translate: TranslationService,
        private notificationsService: NotificationsService
    ) { }

    ngOnInit(): void {
    }
}
