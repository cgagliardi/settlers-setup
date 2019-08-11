import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule, MatCardModule, MatRadioModule, MatButtonModule, MatCheckboxModule } from '@angular/material';
import { MatIconModule } from '@angular/material/icon';

import { AboutComponent } from './about/about.component';
import { CatanBoardComponent } from './catan-board/catan-board.component';
import { FooterComponent } from './footer/footer.component';
import { BoardConfigComponent } from './board-config/board-config.component';
import { ConfigChoiceComponent } from './config-choice/config-choice.component';
import { SlidingCardComponent } from './sliding-card/sliding-card.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [AboutComponent, CatanBoardComponent, FooterComponent, BoardConfigComponent, ConfigChoiceComponent, SlidingCardComponent],
  entryComponents: [
    AboutComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    MatDialogModule,
    MatRadioModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatCardModule,
    ReactiveFormsModule,
  ], exports: [
    AboutComponent,
    CatanBoardComponent,
    FooterComponent,
    BoardConfigComponent,
    SlidingCardComponent,
  ]
})
export class ComponentsModule { }
