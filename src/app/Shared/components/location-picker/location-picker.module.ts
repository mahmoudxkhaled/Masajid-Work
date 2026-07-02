import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RegisterLocationPickerComponent } from './register-location-picker.component';

@NgModule({
  declarations: [RegisterLocationPickerComponent],
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  exports: [RegisterLocationPickerComponent],
})
export class LocationPickerModule {}
