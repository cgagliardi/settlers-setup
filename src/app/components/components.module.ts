import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule, MatCardModule, MatRadioModule, MatButtonModule, MatCheckboxModule } from '@angular/material';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { ReactiveFormsModule } from '@angular/forms';

import { AboutComponent } from './about/about.component';
import { BoardConfigComponent } from './board-config/board-config.component';
import { CatanBoardComponent } from './catan-board/catan-board.component';
import { ConfigChoiceComponent } from './config-choice/config-choice.component';
import { ConfigSliderComponent } from './config-slider/config-slider.component';
import { FooterComponent } from './footer/footer.component';
import { SlidingCardComponent } from './sliding-card/sliding-card.component';

@NgModule({
  declarations: [
    AboutComponent,
    BoardConfigComponent,
    CatanBoardComponent,
    ConfigChoiceComponent,
    ConfigSliderComponent,
    FooterComponent,
    SlidingCardComponent,
  ],
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
    MatSliderModule,
    ReactiveFormsModule,
  ],
  exports: [
    AboutComponent,
    CatanBoardComponent,
    FooterComponent,
    BoardConfigComponent,
    SlidingCardComponent,
  ]
})
export class ComponentsModule { }
