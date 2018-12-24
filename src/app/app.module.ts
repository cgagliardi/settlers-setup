import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import {MatCardModule} from '@angular/material/card';

import { AppComponent } from './app.component';
import { CatanBoardComponent } from './catan-board/catan-board.component';
import { BoardConfigComponent } from './board-config/board-config.component';
import { SlidingCardComponent } from './sliding-card/sliding-card.component';

@NgModule({
   declarations: [
      AppComponent,
      CatanBoardComponent,
      BoardConfigComponent,
      SlidingCardComponent,
   ],
   imports: [
      BrowserModule,
      BrowserAnimationsModule,
      MatRadioModule,
      MatButtonModule,
      MatIconModule,
      MatCardModule,
      ReactiveFormsModule,
   ],
   providers: [],
   bootstrap: [
      AppComponent
   ]
})
export class AppModule { }
