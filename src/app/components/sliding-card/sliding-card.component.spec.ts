import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SlidingCardComponent } from './sliding-card.component';

describe('SlidingCardComponent', () => {
  let component: SlidingCardComponent;
  let fixture: ComponentFixture<SlidingCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SlidingCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SlidingCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
