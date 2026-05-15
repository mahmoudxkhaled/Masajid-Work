import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({ name: 'safeUrl' })
export class SafePipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) { }
    transform(value: any, ...args: any[]): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(value);
    }
}
