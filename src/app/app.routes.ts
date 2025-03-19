import { AddBookComponent } from './components/add-book/add-book.component';
import { BookListComponent } from './components/book-list/book-list.component';
import { Routes } from '@angular/router';
import { EditBookComponent } from './components/edit-book/edit-book.component';

export const routes: Routes = [
    { path: '', component: BookListComponent },
    { path: 'add', component: AddBookComponent },
    { path: 'edit/:id', component: EditBookComponent },
  ];