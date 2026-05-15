import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ImageService {

    constructor() { }

    toImageDataUrl(base64: string | null | undefined): string {
        if (!base64) {
            return '';
        }
        return base64.startsWith('data:image')
            ? base64
            : `data:image/png;base64,${base64}`;
    }
}

