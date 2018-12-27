import { Component, EventEmitter, Output, Input, OnChanges } from '@angular/core';
import { GameStyle, BoardSpec } from '../../board/board';
import { BoardShape, BOARD_SPECS } from '../../board/board-specs';
import { BalancedStrategy } from '../../board/strategy/balanced-strategy';
import { Strategy, StrategyConstructor } from '../../board/strategy/strategy';
import { FormBuilder } from '@angular/forms';

export interface FormState {
  strategy: string;
  gameStyle: GameStyle;
  boardShape: BoardShape;
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

@Component({
  selector: 'app-board-config',
  templateUrl: './board-config.component.html',
  styleUrls: ['./board-config.component.scss']
})
export class BoardConfigComponent implements OnChanges {
  boardShapes = [{
    label: 'Standard',
    value: BoardShape.STANDARD,
  }, {
    label: '5-6 Player Expansion',
    value: BoardShape.EXPANSION6,
  }] as OptionDef[];

  gameStyles = [{
    label: 'None',
    value: GameStyle.STANDARD,
  }, {
    label: 'Cities & Knights Expansion',
    value: GameStyle.CITIES_AND_KNIGHTS,
  }] as OptionDef[];

  configForm = this.fb.group({
    boardShape: [this.boardShapes[0].value],
    gameStyle: [this.gameStyles[0].value],
  });

  @Output() configUpdate = new EventEmitter<SettlersConfig>();
  @Input() formState?: FormState|null;

  constructor(private fb: FormBuilder, ) { }

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
    const strategy = new BalancedStrategy(state.gameStyle);
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
