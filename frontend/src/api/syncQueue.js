const DB_NAME = "SchoolSyncDB";
const DB_VERSION = 1;
const STORE_NAME = "offline_requests";

// Initialize IndexedDB
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject(event.target.error);
    request.onblocked = () => reject(new Error("IndexedDB blocked"));

    request.onsuccess = (event) => resolve(event.target.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
};

// Add a failed request to the queue
export const addToQueue = async (requestData) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      
      transaction.onerror = (event) => reject(event.target.error);
      transaction.onabort = () => reject(new Error("Transaction aborted"));

      const store = transaction.objectStore(STORE_NAME);
      const request = store.add({
        ...requestData,
        timestamp: Date.now()
      });

      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error("Failed to add to sync queue", error);
    throw error; // Rethrow so caller knows it failed
  }
};

// Retrieve all pending requests
export const getQueue = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Failed to get sync queue", error);
    return [];
  }
};

// Delete a successfully synced request
export const deleteFromQueue = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Failed to delete from sync queue", error);
  }
};
