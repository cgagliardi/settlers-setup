import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AppComponent } from './app.component';
import { ComponentsModule } from './components/components.module';


@NgModule({
   declarations: [
      AppComponent,
   ],
   imports: [
      BrowserModule,
      MatButtonModule,
      MatIconModule,
      ComponentsModule,
   ],
   providers: [],
   bootstrap: [
      AppComponent
   ]
})
export class AppModule { }
