import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TranslationService } from 'src/app/core/services/translation.service';
import { ActionsService } from '../../services/actions.service';

@Component({
    selector: 'app-actions',
    templateUrl: './actions.component.html',
    styleUrls: ['./actions.component.scss']
})
export class ActionsComponent implements OnInit {


    constructor(
        public translate: TranslationService,
        private actionsService: ActionsService
    ) { }

    ngOnInit(): void {
    }
}
