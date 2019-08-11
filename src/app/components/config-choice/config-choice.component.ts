/**
 * @fileoverview Renders radio buttons of the provided OptionDefs, and forwards all of the Angular
 * form events to the internal mat-radio-group.
 */
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatRadioChange } from '@angular/material';

export interface OptionDef {
  label: string;
  value: string;
}

@Component({
  selector: 'app-config-choice',
  templateUrl: './config-choice.component.html',
  styleUrls: ['./config-choice.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ConfigChoiceComponent),
      multi: true,
    },
  ],
})
export class ConfigChoiceComponent implements ControlValueAccessor {
  @Input() label: string;
  @Input() options: OptionDef[];
  // tslint:disable-next-line:no-input-rename variable-name
  @Input('value') _value: string;

  onChange: any = () => { };
  onTouched: any = () => { };

  handleChange(change: MatRadioChange) {
    this.value = change.value;
  }

  get value(): string {
    return this._value;
  }

  set value(val: string) {
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

  writeValue(value: string) {
    this.value = value;
  }
}

