import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/services/translation.service';

@Component({
    selector: 'app-workflows',
    templateUrl: './workflows.component.html',
    styleUrls: ['./workflows.component.scss']
})
export class WorkflowsComponent implements OnInit {

    constructor(public translate: TranslationService) { }

    ngOnInit(): void {
    }

}
