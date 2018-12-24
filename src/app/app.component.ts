import { Component, ElementRef, ViewChild, OnInit, HostBinding } from '@angular/core';
import { Board, GameStyle } from './board/board';
import { BOARD_SPECS, BoardShape } from './board/board-specs';
import { SettlersConfig, BoardConfigComponent } from './board-config/board-config.component';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { SlidingCardComponent } from './sliding-card/sliding-card.component';
import * as _ from 'lodash';

const BOARD_SPEC = BOARD_SPECS[BoardShape.STANDARD];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('toggleConfig', [
      state('open', style({
        transform: 'translate3d(0,0,0)',
      })),
      state('closed', style({
        transform: 'translate3d(0,-{{height}}px,0)',
      }), { params: {height: 0} }),
      transition('open => closed', [
        animate('500ms cubic-bezier(0.55, 0.055, 0.675, 0.19)')
      ]),
      transition('closed => open', [
        animate('400ms cubic-bezier(0.215, 0.61, 0.355, 1)')
      ]),
    ]),
  ],
})
export class AppComponent {
  @ViewChild('boardConfigSlider') boardConfigSlider: SlidingCardComponent;
  @ViewChild('boardConfig') boardConfig: BoardConfigComponent;
  configHeight: number;
  configAnimationState: Object = { value: 'open' };
  config: SettlersConfig|null = null;
  configOpen = true;
  board: Board|null = null;
  formValue: Object|null = null;

  handleConfig(config: SettlersConfig) {
    this.config = config;
    this.formValue = this.config.formValue;
    this.createBoard();
    this.toggleConfigMenu();
  }

  toggleConfigMenu() {
    this.configOpen = !this.configOpen;
    if (this.configOpen) {
      this.configAnimationState = { value: 'open' };
    } else {
      const height = this.boardConfigSlider.getHeight();
      this.configAnimationState = { value: 'closed', params: {height} };
    }
  }

  handleConfigButton() {
    // If the button is pressed while the form is open, only generate a new board if the form has
    // changed since it was closed.
    if (this.configOpen &&
        !_.isEqual(this.boardConfig.getFormState(), this.formValue)) {
      this.boardConfig.emitConfig();
    } else {
      this.toggleConfigMenu();
    }
  }

  createBoard() {
    this.board = this.config.strategy.generateBoard(this.config.spec);
  }
}
