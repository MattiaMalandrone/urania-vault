import { ActionSheetController, ActionSheetOptions, IonicModule } from '@ionic/angular'
import { Component, inject } from '@angular/core';
import { createOutline, logoIonic } from 'ionicons/icons';

import { Book } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { from, map, Subject, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DATABASE_SERVICE_TOKEN } from '../../services/database.service';

@Component({
  selector: 'app-book-list',
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './book-list.component.html',
  styleUrl: './book-list.component.scss'
})
export class BookListComponent {

  bookService = inject(BookService);

  books$ = this.bookService.books$;

  private db = inject(DATABASE_SERVICE_TOKEN)

  constructor(private actionSheetCtrl: ActionSheetController) {
    addIcons({ createOutline });
  }

  actionSheetOpener = new Subject<ActionSheetOptions>();
  actionSheetOpener$ = this.actionSheetOpener.asObservable()
    .pipe(
      takeUntilDestroyed(),
      map(opts => this.actionSheetCtrl.create(opts)),
      switchMap((actionSheet) => from(actionSheet).pipe(map((actionSheetElement) => actionSheetElement.present())))
    ).subscribe();

  open(book: Book) {
    const opts = {
      header: 'Actions',
      buttons: [
        {
          text: 'Presente',
          handler: () => {
            this.updateStatus(book, "1")
          }
        },
        {
          text: 'Non presente',
          handler: () => {
            this.updateStatus(book, "0")
          }
        },
        {
          text: 'In arrivo',
          handler: () => {
            this.updateStatus(book, "2")
          }
        },
      ],
    };

    this.actionSheetOpener.next(opts);
  }

  updateStatus(book: Book, status: string) {
    this.bookService.updateBook({ ...book, status });
  }

  getBgColor(status: string | undefined): string {
    switch (status) {
      case '0':
        return 'lightgray'; // Active items get a green background
      case '1':
        return 'lightgreen';  // Inactive items get a gray background
      case '2':
        return 'yellow';    // Pending items get a yellow background
      default:
        return 'white';     // Default background color
    }
  }
}
