import { Component, AfterViewInit, OnDestroy, Input, Output, EventEmitter, forwardRef, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DialogService } from 'primeng/dynamicdialog';
import { ERPVariablesComponent } from '../erp-variables/erp-variables.component';
declare var $: any;

@Component({
  selector: 'app-erp-rich-text',
  templateUrl: './erp-rich-text.component.html',
  styleUrls: ['./erp-rich-text.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ERPRichTextComponent),
      multi: true,
    },
  ],
})
export class ERPRichTextComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  private _value: string = '';
  @Input() height: number = 250;
  @Input() id: string;
  @Input() placeholder: string = 'Enter your Content here.';
  @Output() Content: EventEmitter<string> = new EventEmitter<string>();
  showErpVariablesDialog: boolean = false;

  constructor(private cdRef: ChangeDetectorRef, private dialogService: DialogService) { }

  onChange = (value: any) => { };
  onTouched = () => { };

  writeValue(value: any): void {
    this._value = value;
    if (this.id) {
      $(`#${this.id}`).summernote('code', value);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    if (this.id) {
      $(`#${this.id}`).summernote(isDisabled ? 'disable' : 'enable');
    }
  }

  ngAfterViewInit(): void {
    this.loadRich();
  }

  loadRich() {
    if (this.id) {
      $(`#${this.id}`).summernote({
        height: this.height,
        placeholder: this.placeholder,
        toolbar: [
          ['style', ['style']],
          ['font', ['bold', 'italic', 'underline', 'clear']],
          ['fontname', ['fontname']],
          ['color', ['color']],
          ['para', ['ul', 'ol', 'paragraph']],
          ['height', ['height']],
          ['table', ['table']],
          ['insert', ['link', 'picture', 'hr']],
          ['view', ['fullscreen', 'codeview']],
          ['help', ['help']],
          ['custom', ['erpVariables']],
        ],
        buttons: {
          erpVariables: (context: any) => {
            return $.summernote.ui.button({
              contents: '<i class="fa fa-cogs"></i>',
              click: () => {
                this.dialogService.open(ERPVariablesComponent, {
                  showHeader: false,
                  dismissableMask: true,
                  width: '60%',
                  height: '80%',
                });
              },
            }).render();
          },
        },
        callbacks: {
          onChange: (contents: any) => {
            this._value = contents;
            this.onChange(contents);
            this.Content.emit(contents);
          },
          onInit: () => {
            $(`#${this.id}`).summernote('code', this._value);
          },
        },
      });
    }
    this.cdRef.detectChanges();
  }

  ngOnDestroy() {
    if (this.id) {
      $(`#${this.id}`).summernote('destroy');
    }
  }
}
