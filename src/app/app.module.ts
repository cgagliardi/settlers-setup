import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { CatanBoardComponent } from './catan-board/catan-board.component';
import { ConfigComponent } from './config/config.component';

@NgModule({
   declarations: [
      AppComponent,
      CatanBoardComponent,
      ConfigComponent,
   ],
   imports: [
      BrowserModule,
      BrowserAnimationsModule,
      MatRadioModule,
      MatButtonModule,
      MatIconModule,
      ReactiveFormsModule,
   ],
   providers: [],
   bootstrap: [
      AppComponent
   ]
})
export class AppModule { }
