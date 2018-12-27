import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigChoiceComponent } from './config-choice.component';

describe('ConfigChoiceComponent', () => {
  let component: ConfigChoiceComponent;
  let fixture: ComponentFixture<ConfigChoiceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfigChoiceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigChoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
