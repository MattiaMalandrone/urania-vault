import { EMPTY, Observable, catchError, defer, firstValueFrom, from, map, of, switchMap, tap } from 'rxjs';
import { Injectable, inject } from '@angular/core';

import initSqlJs, { Database, QueryExecResult, SqlJsStatic } from 'sql.js';
import Loki from 'lokijs';
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

  // LokiJS
  private lokiDb!: Loki;
  private booksCollection!: Collection<Book>;

  /**
   * Ottiene o inizializza il database controllando IndexedDB.
   */
  private getDbSqlJs$(): Observable<Database> {
    if (!this.dbSqlJs$) {
      this.dbSqlJs$ = defer(() =>
        from(initSqlJs({ locateFile: (file) => `assets/${file}` })).pipe(
          switchMap((SQL: SqlJsStatic) => {
            this.lokiDb = new Loki('booksDB', {
              autoload: true,
              autosave: true,
              autosaveInterval: 5000,
            });
            this.lokiDb.loadDatabase({}, () => { console.log('✅ LokiJS Database Inizializzato con IndexedDB!'); });
            return of(new SQL.Database())
          }),
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
                    this.booksCollection = this.lokiDb.getCollection<Book>('books') || this.lokiDb.addCollection<Book>('books', { indices: ['title'] });
                    if (this.booksCollection.count() === 0) {
                      console.log('📂 Nessun dato trovato. Importazione JSON...');
                      for (const book of books) {
                        this.booksCollection.insert(book);
                      }
                      this.lokiDb.saveDatabase();
                    }
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

  public getBooks(searchTerm?: string): Book[] {
    if(searchTerm) {
      const regex = new RegExp(searchTerm, "i"); // "i" makes it case-insensitive
      const filters: LokiQuery<Book & LokiObj> = { $or: [{ title: { $regex: regex } }, { author: { $regex: regex } }, { number: { $regex: regex } }] };
      return this.booksCollection.find(filters);
    }
    return  this.booksCollection.find();
  }

  public insertQuery(book: Book): void {
    this.booksCollection.insert(book);
    this.lokiDb.saveDatabase();

    const stmt = this.dbInstance!.prepare(`INSERT INTO books (title, author, number, status, ext) VALUES (?, ?, ?, ?, ?)`);
    stmt.run([book.title!, book.author!, book.number!, book.status!, book.ext!]);
    stmt.free();
  }

  public updateQuery(book: Book): void {
    try {
      const existingBook = this.booksCollection.findOne({ $loki: book.id });
      if (existingBook) {
        Object.assign(existingBook, book);
        this.booksCollection.update(existingBook);
        this.lokiDb.saveDatabase();
      }
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
}
