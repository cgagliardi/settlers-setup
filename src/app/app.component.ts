import { Component, ViewChild, OnInit } from '@angular/core';
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { Board } from './board/board';
import { SettlersConfig, BoardConfigComponent, FormState } from './components/board-config/board-config.component';
import { SlidingCardComponent } from './components/sliding-card/sliding-card.component';
import { serialize, deserialize, hasCustomPorts } from './board/board-url-serializer';

import isEqual from 'lodash/isEqual';

const BOARD_URL_REGEX = /\/board\/([a-z\dA-Z\-]+)/;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [Location, {provide: LocationStrategy, useClass: PathLocationStrategy}]
})
export class AppComponent implements OnInit {
  title = 'settlers-setup';
  @ViewChild('boardConfigSlider', {static: true}) boardConfigSlider: SlidingCardComponent;
  @ViewChild('boardConfig', {static: true}) boardConfig: BoardConfigComponent;

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
    if (!isEqual(this.boardConfig.getFormState(), this.configFormState)) {
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

      // The config is not actually saved in the URL, but we can at least infer the boardShape and
      // whether ports were shuffled.
      const customPorts = hasCustomPorts(match[1]);
      if (this.board.shape !== this.configFormState.boardShape || customPorts) {
        this.configFormState.boardShape = this.board.shape;
        this.configFormState.shufflePorts = customPorts;
        this.config = this.boardConfig.getConfig();
      }
    } catch (error) {
      console.error(error);
      return false;
    }

    return true;
  }
}
