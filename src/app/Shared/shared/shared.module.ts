import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxIntlTelInputModule } from '@justin-s/ngx-intl-tel-input';
import { TranslateModule } from '@ngx-translate/core';
import { NgxEditorModule } from 'ngx-editor';

// PrimeNG Modules (alphabetically ordered)
import { AccordionModule } from 'primeng/accordion';
import { AnimateOnScrollModule } from 'primeng/animateonscroll';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { ChartModule } from 'primeng/chart';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DataViewModule } from 'primeng/dataview';
import { DeferModule } from 'primeng/defer';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { EditorModule } from 'primeng/editor';
import { FieldsetModule } from 'primeng/fieldset';
import { FileUploadModule } from 'primeng/fileupload';
import { GalleriaModule } from 'primeng/galleria';
import { ImageModule } from 'primeng/image';
import { InplaceModule } from 'primeng/inplace';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputMaskModule } from 'primeng/inputmask';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ListboxModule } from 'primeng/listbox';
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PaginatorModule } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { PasswordModule } from 'primeng/password';
import { PickListModule } from 'primeng/picklist';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { RippleModule } from 'primeng/ripple';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { SkeletonModule } from 'primeng/skeleton';
import { SpeedDialModule } from 'primeng/speeddial';
import { SplitterModule } from 'primeng/splitter';
import { StepsModule } from 'primeng/steps';
import { TableModule } from 'primeng/table';
import { TabMenuModule } from 'primeng/tabmenu';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';

// App modules and components
import { AppConfigModule } from 'src/app/layout/config/app.config.module';
import { HasRoleDirective } from 'src/app/core/directives/has-role.directive';
import { ColorScemaSettingsComponent } from '../components/color-scema-settings/color-scema-settings.component';
import { ERPInfoComponent } from '../components/erp-info/erp-info.component';
import { ERPVariablesComponent } from '../components/erp-variables/erp-variables.component';
import { TableLoadingSpinnerComponent } from '../components/table-loading-spinner/table-loading-spinner/table-loading-spinner.component';
import { ComingSoonComponent } from 'src/app/core/components/coming-soon/coming-soon.component';
import { LogoutComponent } from 'src/app/modules/auth/components/logout/logout.component';

// Components to declare in this module
const components = [
    ColorScemaSettingsComponent,
    ComingSoonComponent,
    ERPInfoComponent,
    ERPVariablesComponent,
    LogoutComponent,
    TableLoadingSpinnerComponent,
];

// Modules to import and re-export (deduplicated and alphabetically ordered)
const imports = [
    // Angular modules
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Third-party modules
    NgxEditorModule,
    NgxIntlTelInputModule,
    TranslateModule,

    // App modules
    AppConfigModule,

    // Directives
    HasRoleDirective,

    // PrimeNG modules (alphabetically ordered)
    AccordionModule,
    AnimateOnScrollModule,
    AutoCompleteModule,
    AvatarModule,
    ButtonModule,
    CalendarModule,
    CardModule,
    CarouselModule,
    ChartModule,
    CheckboxModule,
    ChipModule,
    ColorPickerModule,
    ConfirmDialogModule,
    DataViewModule,
    DeferModule,
    DialogModule,
    DividerModule,
    DropdownModule,
    EditorModule,
    FieldsetModule,
    FileUploadModule,
    GalleriaModule,
    ImageModule,
    InplaceModule,
    InputGroupAddonModule,
    InputGroupModule,
    InputMaskModule,
    InputNumberModule,
    InputSwitchModule,
    InputTextareaModule,
    InputTextModule,
    ListboxModule,
    MenuModule,
    MessageModule,
    MessagesModule,
    MultiSelectModule,
    OverlayPanelModule,
    PaginatorModule,
    PanelModule,
    PasswordModule,
    PickListModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    RatingModule,
    RippleModule,
    ScrollPanelModule,
    SelectButtonModule,
    SidebarModule,
    SkeletonModule,
    SpeedDialModule,
    SplitterModule,
    StepsModule,
    TableModule,
    TabMenuModule,
    TabViewModule,
    TagModule,
    ToastModule,
    ToggleButtonModule,
    ToolbarModule,
    TooltipModule,
    TreeModule,
    TreeTableModule,
];

const providers = [ConfirmationService, MessageService];

@NgModule({
    declarations: [...components],
    imports: [...imports],
    exports: [...imports, ...components],
    providers: [...providers],
})
export class SharedModule { }
