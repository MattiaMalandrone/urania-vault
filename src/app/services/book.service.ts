import { Injectable, inject } from '@angular/core';
import { Subject, catchError, combineLatest, map, merge, of, scan, startWith, switchMap, tap } from 'rxjs';

import { Book } from '../models/book.model';
import { DATABASE_SERVICE_TOKEN } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class BookService {

  private db = inject(DATABASE_SERVICE_TOKEN)
  
  public booksList$ = of(this.db.getBooks());

  private bookAdded = new Subject<Book>();
  public bookAdded$ = this.bookAdded.asObservable()
                            .pipe(
                              map((book) => { 
                                this.db.insertQuery(book);
                                return book;
                              }),
                              catchError((error) => {
                                throw new Error(error);
                              })
                            );

  private bookUpdated = new Subject<Book>();
  public bookUpdated$ = this.bookUpdated.asObservable()
                            .pipe(
                              map((book) => { 
                                this.db.updateQuery(book);
                                return book; 
                              }),
                              catchError((error) => {
                                throw new Error(error);
                              })
                            );
                               
  books$ = combineLatest([
    this.booksList$, 
    this.bookAdded$.pipe(startWith(null)),
    this.bookUpdated$.pipe(startWith(null)) 
  ]).pipe(
    scan(([currentList], [list, added, updated]) => {
      let updatedList = [...currentList];
  
      // Se arriva una nuova lista iniziale
      if (list && list.length)
        updatedList = list;
  
      // Se arriva un libro aggiunto
      if (added) {
        updatedList = [...updatedList, added];
      }
  
      // Se arriva un libro aggiornato
      if (updated) {
        updatedList = updatedList.map(book =>
          book.id === updated.id ? { ...book, ...updated } : book
        );
      }
  
      return [updatedList];
    }, [[] as Book[]]),
    map(([list]) => list)
  );  

  insertBook(book: Book) {
    this.bookAdded.next(book);
  }
      
  updateBook(book: Book) {
    this.bookUpdated.next(book);
  }
}
