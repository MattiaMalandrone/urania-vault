import { EMPTY, Observable, catchError, defer, firstValueFrom, from, map, of, switchMap, tap } from 'rxjs';
import { Injectable, inject } from '@angular/core';
import initSqlJs, { Database, QueryExecResult, SqlJsStatic, SqlValue } from 'sql.js';

import { Book } from '../models/book.model';
import { DatabaseService } from './database.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SqlJsDatabaseService implements DatabaseService {

  private http = inject(HttpClient);

  private dbSqlJs$: Observable<Database> | null = null;
  public dbInstance: Database | null = null;
  private readonly dbName = 'BooksDb';
  private readonly storeName = 'store';

  private getDbSqlJs$(): Observable<Database> {
    if (!this.dbSqlJs$) {
      this.dbSqlJs$ = defer(() =>
        from(initSqlJs({ locateFile: (file) => `assets/${file}` })).pipe(
          switchMap((SQL: SqlJsStatic) => of(new SQL.Database())),
          catchError((error) => {
            console.error("Database initialization failed:", error);
            return EMPTY;
          })
        )
      );
    }
    return this.dbSqlJs$;
  }

  public initDatabase(): Promise<void> {
    return Promise.all([
      firstValueFrom(this.getDbSqlJs$().pipe(
        switchMap((dbSqlJs) => {
          return of(dbSqlJs.run("CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY, title TEXT, author TEXT, number INTEGER, status TEXT, ext TEXT)"))
                  .pipe(
                    switchMap(() => {
                      const result = dbSqlJs.exec("SELECT * FROM books");
                      if (result.length === 0) {
                        return this.http.get<Book[]>('assets/intense-heat-7963-export3.json').pipe(map((books) => {
                          for (const book of books) {
                            const stmt = dbSqlJs.prepare("INSERT INTO books (id, title, author, number, status, ext) VALUES (?, ?, ?, ?, ?, ?)");
                            stmt.run([book.id, book.title!, book.author!, book.number!, book.status!, book.ext!]);
                            stmt.free();
                          }
                          const result = dbSqlJs.exec("SELECT * FROM books");
                          console.log('📥 JSON importato con successo!', result);
                        }))
                      }
                      else {
                        return of();
                      }
                    }),
                    tap(() => this.dbInstance = dbSqlJs),
                    catchError((error) => {
                      console.error("Database operations failed:", error);
                      return EMPTY;
                    })
                  )
        })
      ))
    ]).then(() => {
      console.log("App initialization complete!");
    }).catch(error => {
      console.error("App initialization failed:", error);
      return Promise.reject(error);
    });   
  }

  /**
   * 
   * @returns 
   */
  private loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get('db');

        request.onsuccess = () => {
          resolve(request.result ? new Uint8Array(request.result) : null);
        };

        request.onerror = () => {
          resolve(null);
        };
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  public getBooks(): Book[] {
    const books = this.dbInstance!.exec('SELECT * FROM books');
    return this.mapQueryResultToBooks(books);
  }

  public insertQuery(book: Book): void {
    const stmt = this.dbInstance!.prepare(`INSERT INTO books (title, author, number, status, ext) VALUES (?, ?, ?, ?, ?)`);
    stmt.run([book.title!, book.author!, book.number!, book.status!, book.ext!]);
    stmt.free();
  }

  public updateQuery(book: Book): void {
    try {
      const query = `UPDATE books SET 
                      title = "${book.title}", 
                      author = "${book.author}", 
                      number = ${book.number}, 
                      status = "${book.status}", 
                      ext = "${book.ext}" 
                    WHERE id = ${book.id}`;

      this.dbInstance!.exec(query);
    }
    catch(err) {
      console.log(err);
    }
  }

  private mapQueryResultToBooks(result: QueryExecResult[]): Book[] {
    if (result.length === 0) return [];

    const { columns, values } = result[0];

    return values.map(row => {
      const book = new Book();

      columns.forEach((column, index) => {
        if (column in book) 
          (book as Record<keyof Book, unknown>)[column as keyof Book] = row[index]; 
      });

      return book;
    });
  }
}
