
/**
 * @fileoverview Renders radio buttons of the provided OptionDefs, and forwards all of the Angular
 * form events to the internal mat-radio-group.
 */
import { Component, OnInit, Input, forwardRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, DefaultValueAccessor } from '@angular/forms';
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
  // tslint:disable-next-line:no-input-rename
  @Input('value') _value;

  onChange: any = () => { };
  onTouched: any = () => { };

  handleChange(change: MatRadioChange) {
    this.value = change.value;
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = val;
    this.onChange(val);
    this.onTouched();
  }

  constructor() { }

  registerOnChange(fn: Function) {
    this.onChange = fn;
  }

  registerOnTouched(fn: Function) {
    this.onTouched = fn;
  }

  writeValue(value: string) {
    this.value = value;
  }
}
