import { Component, ElementRef, ViewChild, OnInit, HostBinding } from '@angular/core';
import { Board, GameStyle } from './board/board';
import { BOARD_SPECS, BoardShape } from './board/board-specs';
import { SettlersConfig, BoardConfigComponent } from './board-config/board-config.component';
import { SlidingCardComponent } from './sliding-card/sliding-card.component';
import * as _ from 'lodash';

const BOARD_SPEC = BOARD_SPECS[BoardShape.STANDARD];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChild('boardConfigSlider') boardConfigSlider: SlidingCardComponent;
  @ViewChild('boardConfig') boardConfig: BoardConfigComponent;

  config: SettlersConfig;
  board: Board;
  configFormState: Object;

  ngOnInit() {
    this.saveConfig(this.boardConfig.getConfig());
  }

  handleConfigUpdate(config: SettlersConfig) {
    this.boardConfigSlider.toggle();
    setTimeout(() => {
      this.saveConfig(config);
    }, 0);
  }

  handleConfigButton() {
    // If the button is pressed while the form is open, only generate a new board if the form has
    // changed since it was closed.
    if (!_.isEqual(this.boardConfig.getFormState(), this.configFormState)) {
      this.boardConfig.emitConfig();
    } else {
      this.boardConfigSlider.toggle();
    }
  }

  saveConfig(config: SettlersConfig) {
    this.config = config;
    this.configFormState = this.config.formState;
    this.generateBoard();
  }

  generateBoard() {
    this.board = this.config.strategy.generateBoard(this.config.spec);
  }
}
