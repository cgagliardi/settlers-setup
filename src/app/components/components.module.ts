import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';

import { CatanBoardComponent } from './catan-board/catan-board.component';
import { BoardConfigComponent } from './board-config/board-config.component';
import { SlidingCardComponent } from './sliding-card/sliding-card.component';
import { FooterComponent } from './footer/footer.component';
import { AboutComponent } from './about/about.component';
import { ConfigChoiceComponent } from './config-choice/config-choice.component';

@NgModule({
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    MatDialogModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    ReactiveFormsModule,
  ],
  declarations: [
    CatanBoardComponent,
    BoardConfigComponent,
    SlidingCardComponent,
    FooterComponent,
    AboutComponent,
    ConfigChoiceComponent,
  ],
  exports: [
    CatanBoardComponent,
    BoardConfigComponent,
    SlidingCardComponent,
    FooterComponent,
  ],
  entryComponents: [
    AboutComponent,
  ],
})
export class ComponentsModule { }
