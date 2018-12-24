import { Component, OnInit, EventEmitter, Output, Input, OnChanges, ElementRef, ViewChild } from '@angular/core';
import { GameStyle, Board, BoardSpec } from '../board/board';
import { BoardShape, BOARD_SPECS } from '../board/board-specs';
import { BalancedStrategy } from '../board/strategy/balanced-strategy';
import { RandomStrategy } from '../board/strategy/random-strategy';
import { Strategy, StrategyConstructor } from '../board/strategy/strategy';
import { FormBuilder } from '@angular/forms';

interface OptionDef {
  label: string;
  value: string;
}

interface StategyOption extends OptionDef {
  ctor: StrategyConstructor;
}

const STRATEGY_OPTIONS = [{
  label: 'Balanced',
  value: 'balanced',
  ctor: BalancedStrategy,
}, {
  label: 'Random',
  value: 'random',
  ctor: RandomStrategy,
}] as StategyOption[];

export interface SettlersConfig {
  readonly formValue: Object;
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

  strategies = STRATEGY_OPTIONS;

  configForm = this.fb.group({
    boardShape: [this.boardShapes[0].value],
    gameStyle: [this.gameStyles[0].value],
    strategy: [this.strategies[0].value]
  });

  @Output() configUpdate = new EventEmitter<SettlersConfig>();
  @Input() formValue?: Object|null;

  constructor(private fb: FormBuilder, ) { }

  ngOnChanges() {
    if (this.formValue) {
      this.configForm.patchValue(this.formValue);
    }
  }

  /**
   * @return the current state of the form.
   */
  getFormState(): Object {
    return this.configForm.value;
  }

  emitConfig() {
    const state = this.getFormState();
    const ctor = this.strategies.find(s => s.value === state.strategy).ctor;
    const strategy = new ctor(state.gameStyle);
    this.configUpdate.emit({
      formValue: state,
      strategy,
      spec: BOARD_SPECS[state.boardShape],
    });
  }
}
