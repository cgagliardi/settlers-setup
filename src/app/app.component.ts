import { Component } from '@angular/core';
import { Board, GameStyle } from './board/board';
import { BOARD_SPECS, BoardShape } from './board/board-specs';
import { BalancedStrategy } from './board/strategy/balanced-strategy';
import { RandomStrategy } from './board/strategy/random-strategy';
import { Strategy } from './board/strategy/strategy';
import { SettlersConfig } from './config/config.component';

const BOARD_SPEC = BOARD_SPECS[BoardShape.STANDARD];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  config: SettlersConfig|null = null;
  board: Board|null = null;
  formValue: Object|null = null;

  handleConfig(config: SettlersConfig) {
    this.config = config;
    this.formValue = this.config.formValue;
    this.createBoard();
  }

  createBoard() {
    this.board = this.config.strategy.generateBoard(this.config.spec);
  }

  clearConfig() {
    this.config = null;
    this.board = null;
  }
}
