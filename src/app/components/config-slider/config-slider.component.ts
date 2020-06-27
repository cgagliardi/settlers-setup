import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatRadioChange } from '@angular/material';

export interface OptionDef {
  label: string;
  value: string;
}

export const CONFIG_SLIDER_MAX_VALUE = 100;

@Component({
  selector: 'app-config-slider',
  templateUrl: './config-slider.component.html',
  styleUrls: ['./config-slider.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ConfigSliderComponent),
      multi: true,
    },
  ],
})
export class ConfigSliderComponent implements ControlValueAccessor {
  readonly MAX_VALUE = 100;

  @Input() label: string;
  @Input() minLabel: string;
  @Input() maxLabel: string;
  // tslint:disable-next-line:no-input-rename variable-name
  @Input('value') _value: number;

  onChange: any = () => { };
  onTouched: any = () => { };


  handleChange(change: MatRadioChange) {
    this.value = change.value;
  }

  get value(): number {
    return this._value;
  }

  set value(val: number) {
    this._value = val;
    this.onChange(val);
    this.onTouched();
  }

  constructor() { }

  registerOnChange(fn: () => {}) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => {}) {
    this.onTouched = fn;
  }

  writeValue(value: number) {
    this.value = value;
  }
}

