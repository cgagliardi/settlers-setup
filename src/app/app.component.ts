import { Component } from '@angular/core';
import { Board } from './board/board';
import { BOARD_SPECS, BoardShape } from './board/board-specs';
import { RandomStrategy } from './board/strategy/random-strategy';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  board: Board;

  constructor() {
    const strategy = new RandomStrategy();
    this.board = strategy.generateBoard(BOARD_SPECS[BoardShape.STANDARD]);
  }
}
