import { Component, ViewChild, ElementRef, HostBinding, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';

export function getClosedTransform(height: string|number): string {
  return `translate3d(0,-${height}px,0)`;
}

@Component({
  selector: 'app-sliding-card',
  templateUrl: './sliding-card.component.html',
  styleUrls: ['./sliding-card.component.scss'],
  animations: [
    trigger('slide', [
      state('open', style({
        transform: 'translate3d(0,0,0)',
      })),
      state('closed', style({
        transform: getClosedTransform('{{height}}'),
      }), { params: {height: 0} }),
      transition('open => closed', [
        animate('500ms cubic-bezier(0.55, 0.055, 0.675, 0.19)')
      ]),
      transition('closed => open', [
        animate('400ms cubic-bezier(0.215, 0.61, 0.355, 1)')
      ]),
    ]),
  ],
})
export class SlidingCardComponent implements OnInit {
  @ViewChild('container') containerRef: ElementRef;
  private open = false;

  @HostBinding('@slide') get slide() {
    if (this.open) {
      return { value: 'open' };
    } else {
      const height = this.getHeight();
      return { value: 'closed', params: {height} };
    }
  }

  constructor(private readonly elRef: ElementRef) {}

  ngOnInit() {
    // Set the card to the closed position.
    const transform = getClosedTransform(this.getHeight());
    this.elRef.nativeElement.style.transform = transform;
  }

  toggle() {
    this.open = !this.open;
  }

  private getHeight(): number {
    return this.containerRef.nativeElement.offsetHeight;
  }
}
