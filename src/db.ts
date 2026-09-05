import type { HomeItem } from './types';

const STORE = 'items';
const VERSION = 1;

function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error ?? new Error('The local database could not be read.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The local database could not be updated.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('The local database update was cancelled.'));
  });
}

export class HomebookDB {
  private database: Promise<IDBDatabase>;

  constructor(databaseName: string) {
    this.database = new Promise((resolve, reject) => {
      const open = indexedDB.open(databaseName, VERSION);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(STORE)) {
          const store = open.result.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error ?? new Error('Private storage is unavailable in this browser.'));
      open.onblocked = () => reject(new Error('Close other Homebook tabs, then reload to update local storage.'));
    });
  }

  async list(): Promise<HomeItem[]> {
    const db = await this.database;
    const values = await request(db.transaction(STORE, 'readonly').objectStore(STORE).getAll()) as HomeItem[];
    return values.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async put(item: HomeItem): Promise<void> {
    const db = await this.database;
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(item);
    await transactionDone(transaction);
  }

  async delete(id: string): Promise<void> {
    const db = await this.database;
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    await transactionDone(transaction);
  }

  async replaceAll(items: HomeItem[]): Promise<void> {
    const db = await this.database;
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    store.clear();
    items.forEach(item => store.put(item));
    await transactionDone(transaction);
  }
}
