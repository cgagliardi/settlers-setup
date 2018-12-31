import { Component, ElementRef, ViewChild, OnInit, HostBinding } from '@angular/core';
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { Board, GameStyle } from './board/board';
import { BOARD_SPECS, BoardShape } from './board/board-specs';
import { SettlersConfig, BoardConfigComponent, FormState } from './components/board-config/board-config.component';
import { SlidingCardComponent } from './components/sliding-card/sliding-card.component';
import * as _ from 'lodash';
import { serialize, deserialize } from './board/board-url-serializer';

const BOARD_URL_REGEX = /\/board\/([a-z\d\-]+)/;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [Location, {provide: LocationStrategy, useClass: PathLocationStrategy}]
})
export class AppComponent implements OnInit {
  @ViewChild('boardConfigSlider') boardConfigSlider: SlidingCardComponent;
  @ViewChild('boardConfig') boardConfig: BoardConfigComponent;

  config: SettlersConfig;
  board: Board;
  configFormState: FormState;
  boardAnimationEnabled = true;

  constructor(private readonly location: Location) {}

  ngOnInit() {
    this.saveConfig(this.boardConfig.getConfig());
    if (!this.readBoardFromUrl()) {
      this.generateBoard();
    }

    this.location.subscribe(() => {
      this.readBoardFromUrl();
    });
  }

  handleConfigUpdate(config: SettlersConfig) {
    this.boardConfigSlider.toggle();
    setTimeout(() => {
      this.saveConfig(config);
      this.generateBoard();
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

  private saveConfig(config: SettlersConfig) {
    this.config = config;
    this.configFormState = this.config.formState;
  }

  generateBoard() {
    this.boardAnimationEnabled = true;
    const firstRender = !this.board;
    this.board = this.config.strategy.generateBoard(this.config.spec);
    const newPath = '/board/' + serialize(this.board);
    const newUrl = newPath + window.location.search + window.location.hash;
    if (firstRender) {
      this.location.replaceState(newUrl);
    } else {
      this.location.go(newUrl);
    }
  }

  private readBoardFromUrl(): boolean {
    const match = this.location.path().match(BOARD_URL_REGEX);
    if (!match) {
      return false;
    }
    try {
      this.board = deserialize(match[1]);
      this.boardAnimationEnabled = false;
    } catch (error) {
      console.error(error);
      return false;
    }
    // The config is not actually saved in the URL, but we can at least infer the boardShape.
    if (this.board.shape !== this.configFormState.boardShape) {
      this.configFormState.boardShape = this.board.shape;
      this.config = this.boardConfig.getConfig();
    }
    return true;
  }
}
