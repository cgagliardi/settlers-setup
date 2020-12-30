import { Component, EventEmitter, Output, Input, OnChanges } from '@angular/core';
import { BoardSpec } from '../../board/board';
import { BOARD_SPECS } from '../../board/board-specs';
import { BalancedStrategy } from '../../board/strategy/balanced-strategy';
import { Strategy, DesertPlacement } from '../../board/strategy/strategy';
import { FormBuilder } from '@angular/forms';
import { CONFIG_SLIDER_MAX_VALUE } from '../config-slider/config-slider.component';
import { BoardShape } from 'src/app/board/specs/shapes-enum';

export interface FormState {
  boardShape: BoardShape;
  desertPlacement: DesertPlacement;
  resourceDistribution: number;
  shufflePorts: boolean;
  allowResourceOnPort: boolean;
}

interface OptionDef {
  label: string;
  value: string;
}

export interface SettlersConfig {
  readonly formState: FormState;
  readonly strategy: Strategy;
  readonly spec: BoardSpec;
}

/**
 * Converts an array of values into OptionDefs where the entry is both the label and value.
 * If a sub-array is given, the first value is used as the label, and the second as the value.
 */
function toOptionDef(...values: Array<string|[string, string]>): OptionDef[] {
  return values.map(v => {
    if (typeof v === 'string') {
      return {label: v, value: v} as OptionDef;
    }
    return {label: v[0], value: v[1]} as OptionDef;
  });
}

@Component({
  selector: 'app-board-config',
  templateUrl: './board-config.component.html',
  styleUrls: ['./board-config.component.scss']
})
export class BoardConfigComponent implements OnChanges {
  boardShapes = toOptionDef(
    BoardShape.DRAGONS,
    BoardShape.STANDARD,
    BoardShape.EXPANSION6,
    BoardShape.SEAFARERS1);

  desertPlacements = toOptionDef(
    DesertPlacement.RANDOM,
    DesertPlacement.CENTER,
    DesertPlacement.OFF_CENTER,
    DesertPlacement.COAST);

  configForm = this.fb.group({
    boardShape: [this.boardShapes[0].value],
    desertPlacement: [this.desertPlacements[0].value],
    resourceDistribution: CONFIG_SLIDER_MAX_VALUE,
    shufflePorts: false,
    allowResourceOnPort: false,
  });

  @Output() configUpdate = new EventEmitter<SettlersConfig>();
  @Input() formState?: FormState|null;

  constructor(private fb: FormBuilder) { }

  ngOnChanges() {
    if (this.formState) {
      this.configForm.patchValue(this.formState);
    }
  }

  /**
   * @return the current state of the form.
   */
  getFormState(): FormState {
    return this.configForm.value;
  }

  getConfig(): SettlersConfig {
    const state = this.getFormState();
    const strategy =
        new BalancedStrategy({
          desertPlacement: state.desertPlacement,
          resourceDistribution: state.resourceDistribution / CONFIG_SLIDER_MAX_VALUE,
          shufflePorts: state.shufflePorts,
          allowResourceOnPort: state.allowResourceOnPort,
        });
    return {
      formState: state,
      strategy,
      spec: BOARD_SPECS[state.boardShape],
    };
  }

  emitConfig() {
    this.configUpdate.emit(this.getConfig());
  }
}
