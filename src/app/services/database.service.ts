import { Book } from "../models/book.model";
import { InjectionToken } from "@angular/core";

export const DATABASE_SERVICE_TOKEN = new InjectionToken<DatabaseService>('DatabaseService');

export abstract class DatabaseService {
    dbInstance: unknown;
    abstract initDatabase(): Promise<void>;
    abstract getBooks(searchTerm?: string): Book[];
    abstract insertQuery(book: Book): void;
    abstract updateQuery(book: Book): void;
}
