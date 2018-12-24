import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-sliding-card',
  templateUrl: './sliding-card.component.html',
  styleUrls: ['./sliding-card.component.scss']
})
export class SlidingCardComponent {
  @ViewChild('container') containerRef: ElementRef;

  getHeight(): number {
    return this.containerRef.nativeElement.offsetHeight;
  }
}
