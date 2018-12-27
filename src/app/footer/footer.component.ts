import { Component, OnInit } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import { AboutComponent } from '../about/about.component';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  constructor(private readonly dialog: MatDialog) {}

  openAboutDialog(): void {
    const dialogRef = this.dialog.open(AboutComponent, {
      width: '400px',
      autoFocus: false,
      restoreFocus: false,
    });
  }
}