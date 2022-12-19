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
  numberDistribution: number;
  shufflePorts: boolean;
  allowResourceOnPort: boolean;
}

interface OptionDef<T extends string> {
  label: string;
  value: T;
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
function toOptionDef<T extends string>(...values: Array<T|[string, T]>): OptionDef<T>[] {
  return values.map(v => {
    if (typeof v === 'string') {
      return {label: v, value: v} as OptionDef<T>;
    }
    return {label: v[0], value: v[1]} as OptionDef<T>;
  });
}

const DESERT_PLACEMENTS_WITH_CENTER =
    toOptionDef(
      DesertPlacement.RANDOM,
      DesertPlacement.CENTER,
      DesertPlacement.OFF_CENTER,
      DesertPlacement.COAST);

const DESERT_PLACEMENTS_SANS_CENTER =
      toOptionDef(
        DesertPlacement.RANDOM,
        DesertPlacement.INLAND,
        DesertPlacement.COAST);

@Component({
  selector: 'app-board-config',
  templateUrl: './board-config.component.html',
  styleUrls: ['./board-config.component.scss']
})
export class BoardConfigComponent {
  boardShapes: OptionDef<BoardShape>[] = toOptionDef(
    BoardShape.STANDARD,
    BoardShape.EXPANSION6,
    BoardShape.SEAFARERS1,
    BoardShape.SEAFARERS2,
    BoardShape.DRAGONS);

  desertPlacements: OptionDef<DesertPlacement>[] = DESERT_PLACEMENTS_WITH_CENTER;

  hasDefaultPorts = true;
  desertPlacementEnabled = true;
  resourceDistributionEnabled = true;

  configForm = this.fb.group({
    boardShape: this.boardShapes[0].value,
    desertPlacement: this.desertPlacements[0].value,
    resourceDistribution: CONFIG_SLIDER_MAX_VALUE,
    numberDistribution: Math.floor(CONFIG_SLIDER_MAX_VALUE * 0.85),
    shufflePorts: false,
    allowResourceOnPort: true,
  });

  @Output() configUpdate = new EventEmitter<SettlersConfig>();
  @Input() formState?: FormState|null;

  constructor(private fb: FormBuilder) {
    this.configForm.get('boardShape')!.valueChanges.subscribe((boardShape: BoardShape|null) => {
      if (!boardShape) return;

      // TODO: Get "clumped" resource distribution working on seafarers.
      this.resourceDistributionEnabled =
          boardShape === BoardShape.STANDARD || boardShape === BoardShape.EXPANSION6;

      const spec = BOARD_SPECS[boardShape];

      // Toggle desert options based on board shape.
      this.desertPlacementEnabled = !spec.allCoastalHexes;
      if (this.desertPlacementEnabled) {
        const desertPlacement = this.configForm.get('desertPlacement')!;
        const desertValue = desertPlacement.value;
        if (spec.centerCoords.length > 0) {
          this.desertPlacementEnabled = true;
          this.desertPlacements = DESERT_PLACEMENTS_WITH_CENTER;
          if (desertValue === DesertPlacement.INLAND) {
            desertPlacement.setValue(DesertPlacement.CENTER);
          }
        } else {
          this.desertPlacements = DESERT_PLACEMENTS_SANS_CENTER;
          if (desertValue === DesertPlacement.CENTER ||
              desertValue === DesertPlacement.OFF_CENTER) {
            desertPlacement.setValue(DesertPlacement.INLAND);
          }
        }
      }

      // Toggle shufflePorts based on board shape.
      this.hasDefaultPorts = spec.hasDefaultPortResources;
    });
  }

  ngOnChanges() {
    if (this.formState) {
      this.configForm.patchValue(this.formState);
    }
  }
  /**
   * @return the current state of the form.
   */
  getFormState(): FormState {
    return this.configForm.value as FormState;
  }

  getConfig(): SettlersConfig {
    const state = this.getFormState();
    const strategy =
        new BalancedStrategy({
          desertPlacement:
              this.desertPlacementEnabled ? state.desertPlacement : DesertPlacement.RANDOM,
          resourceDistribution:
              this.resourceDistributionEnabled ?
              state.resourceDistribution / CONFIG_SLIDER_MAX_VALUE : 1,
          numberDistribution: state.numberDistribution / CONFIG_SLIDER_MAX_VALUE,
          shufflePorts: this.hasDefaultPorts ? state.shufflePorts : true,
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
