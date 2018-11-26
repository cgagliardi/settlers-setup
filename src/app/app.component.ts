import { Component } from '@angular/core';
import { Board, GameStyle } from './board/board';
import { BOARD_SPECS, BoardShape } from './board/board-specs';
import { BalancedStrategy } from './board/strategy/balanced-strategy';
import { RandomStrategy } from './board/strategy/random-strategy';
import { Strategy } from './board/strategy/strategy';

const BOARD_SPEC = BOARD_SPECS[BoardShape.EXPANSION6];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  board: Board;

  constructor() {
    const strategy = this.createStrategy();
    this.board = strategy.generateBoard(BOARD_SPEC);
  }

  reset() {
    const strategy = this.createStrategy();
    this.board = strategy.generateBoard(BOARD_SPEC);
  }

  private createStrategy(): Strategy {
    return new BalancedStrategy(GameStyle.STANDARD);
    // return new RandomStrategy(GameStyle.STANDARD);
  }
}
