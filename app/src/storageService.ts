// 存储服务 - 提供IndexedDB和localStorage双重存储

const DB_NAME = 'stock_tracker_db';
const DB_VERSION = 1;
const STORE_NAME = 'stocks';
const STORE_NAME_HISTORY = 'history';

interface DbHistoryItem {
  id: string;
  date: string;
  data: any;
  createdAt: string;
}

// 初始化IndexedDB
const initDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    console.log('Initializing IndexedDB...');
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open database:', request.error);
      reject('Failed to open database: ' + request.error?.message);
    };

    request.onsuccess = () => {
      console.log('Database opened successfully:', request.result.name);
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      console.log('Database upgrade needed, creating stores...');
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建股票存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.log('Creating stocks store...');
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }

      // 创建历史记录存储
      if (!db.objectStoreNames.contains(STORE_NAME_HISTORY)) {
        console.log('Creating history store...');
        const historyStore = db.createObjectStore(STORE_NAME_HISTORY, { keyPath: 'id' });
        historyStore.createIndex('date', 'date', { unique: true });
      }
    };
  });
};

// 保存数据到IndexedDB
export const saveToIndexedDb = async (stocks: any[]): Promise<void> => {
  try {
    console.log('Saving to IndexedDB...', { stockCount: stocks.length });
    const db = await initDb();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // 清空现有数据
    console.log('Clearing existing data...');
    const clearRequest = store.clear();
    
    clearRequest.onsuccess = () => {
      console.log('Existing data cleared, adding new stocks...');
      // 批量添加新数据
      stocks.forEach((stock, index) => {
        console.log('Adding stock:', { index, name: stock.name, code: stock.code });
        store.add(stock);
      });
    };

    clearRequest.onerror = () => {
      console.error('Error clearing data:', clearRequest.error);
    };

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        console.log('Transaction completed successfully');
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    // 失败时不抛出错误，继续使用localStorage
  }
};

// 从IndexedDB加载数据
export const loadFromIndexedDb = async (): Promise<any[]> => {
  try {
    console.log('Loading from IndexedDB...');
    const db = await initDb();
    console.log('Database opened, getting transaction...');
    const transaction = db.transaction(STORE_NAME, 'readonly');
    console.log('Transaction obtained, getting store...');
    const store = transaction.objectStore(STORE_NAME);
    console.log('Store obtained, getting all data...');
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        console.log('Loaded from IndexedDB:', { count: request.result.length });
        if (request.result.length > 0) {
          console.log('First 5 stocks:', request.result.slice(0, 5).map((s: any) => ({ name: s.name, code: s.code })));
        }
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error loading from IndexedDB:', request.error);
        db.close();
        resolve([]);
      };
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return [];
  }
};

// 保存历史数据到IndexedDB
export const saveHistoryToIndexedDb = async (date: string, data: any): Promise<void> => {
  try {
    const db = await initDb();
    const transaction = db.transaction(STORE_NAME_HISTORY, 'readwrite');
    const store = transaction.objectStore(STORE_NAME_HISTORY);

    const historyItem: DbHistoryItem = {
      id: `history_${date}`,
      date: date,
      data: data,
      createdAt: new Date().toISOString()
    };

    // 使用put操作，允许更新现有记录
    store.put(historyItem);

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('Error saving history to IndexedDB:', error);
  }
};

// 从IndexedDB加载历史数据
export const loadHistoryFromIndexedDb = async (): Promise<{date: string, data: any, updatedAt: string}[]> => {
  try {
    const db = await initDb();
    const transaction = db.transaction(STORE_NAME_HISTORY, 'readonly');
    const store = transaction.objectStore(STORE_NAME_HISTORY);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        db.close();
        const historyItems = request.result;
        const formattedHistory = historyItems.map((item: DbHistoryItem) => ({
          date: item.date,
          data: item.data,
          updatedAt: item.createdAt
        }));
        resolve(formattedHistory);
      };
      request.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch (error) {
    console.error('Error loading history from IndexedDB:', error);
    return [];
  }
};

// 清除所有IndexedDB数据
export const clearIndexedDb = async (): Promise<void> => {
  try {
    const db = await initDb();
    const transaction = db.transaction([STORE_NAME, STORE_NAME_HISTORY], 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(STORE_NAME_HISTORY).clear();

    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
};
