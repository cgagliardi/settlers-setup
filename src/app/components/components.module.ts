import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutComponent } from './about/about.component';
import { CatanBoardComponent } from './catan-board/catan-board.component';
import { ConfigChoiceComponent } from './config-choice/config-choice.component';
import { FooterComponent } from './footer/footer.component';
import { BoardConfigComponent } from './board-config/board-config.component';
import { ConfigSliderComponent } from './config-slider/config-slider.component';
import { SlidingCardComponent } from './sliding-card/sliding-card.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AboutComponent,
    CatanBoardComponent,
    ConfigChoiceComponent,
    FooterComponent,
    BoardConfigComponent,
    ConfigSliderComponent,
    SlidingCardComponent
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
    FormsModule,
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
