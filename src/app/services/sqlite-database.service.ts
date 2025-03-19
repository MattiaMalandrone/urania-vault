import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { EMPTY, Observable, catchError, concat, defer, filter, firstValueFrom, from, lastValueFrom, map, of, switchMap, tap } from 'rxjs';
import { Injectable, inject } from '@angular/core';
import initSqlJs, { Database, QueryExecResult, SqlJsStatic, SqlValue } from 'sql.js';

import { Book } from '../models/book.model';
import { DatabaseService } from './database.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SqliteDatabaseService implements DatabaseService {

  private http = inject(HttpClient);

  private dbSqlJs$: Observable<Database> | null = null;
  public dbInstance: Database | null = null;

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
                      const tables = dbSqlJs.exec("PRAGMA table_list");
                      console.log("Tables in database:", tables);
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

  public getBooks(): Book[] {
    const books = this.dbInstance!.exec('SELECT * FROM books');
    return this.mapQueryResultToBooks(books);
  }

  public insertQuery(book: Book): void {
    const stmt = this.dbInstance!.prepare("");
    stmt.run(this.mapBookToSqlValue(book));
    stmt.free();
  }

  public updateQuery(book: Book): void {
    const stmt = this.dbInstance!.prepare("");
    stmt.run(this.mapBookToSqlValue(book));
    stmt.free();
  }

  public deleteIndexedDB() {
    
  }

  private mapQueryResultToBooks(result: QueryExecResult[]): Book[] {
    if (result.length === 0) return [];

    const { columns, values } = result[0];

    return values.map(row => {
      const book = {} as Book;

      columns.forEach((column, index) => {
        if (column in book) {
          (book as Record<keyof Book, unknown>)[column as keyof Book] = row[index]; 
        }
      });

      return book;
    });
  }

  private mapBookToSqlValue(book: Book): SqlValue[] {
    return [
      book.id ?? null,
      book.title ?? null,
      book.author ?? null,
      book.number ?? null,
      book.status ?? null,
      book.ext ?? null
    ];
  }
}
