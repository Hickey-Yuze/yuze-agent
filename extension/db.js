/* IndexedDB 会话库：替代 chrome.storage.local.sessions
   原因：storage 单条 10MB 上限 + 每次整表覆盖，长思考/图片一多就写失败、消息丢失。 */
(function () {
  'use strict';
  const DB_NAME = 'yz_agent';
  const DB_VER = 1;
  const STORE = 'sessions';
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, DB_VER);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const st = db.createObjectStore(STORE, { keyPath: 'id' });
          st.createIndex('at', 'at');
        }
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }

  function tx(mode, fn) {
    return open().then((db) => new Promise((res, rej) => {
      const t = db.transaction(STORE, mode);
      const st = t.objectStore(STORE);
      let req;
      try { req = fn(st); } catch (e) { rej(e); return; }
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }

  function list() {
    return tx('readonly', (st) => st.getAll()).then((rows) =>
      (rows || []).sort((a, b) => (b.at || 0) - (a.at || 0))
    );
  }
  function get(id) { return tx('readonly', (st) => st.get(id)); }
  function put(rec) { return tx('readwrite', (st) => st.put(rec)); }
  function putMany(recs) {
    return tx('readwrite', (st) => { for (const r of recs || []) st.put(r); });
  }
  function del(id) { return tx('readwrite', (st) => st.delete(id)); }
  function clear() { return tx('readwrite', (st) => st.clear()); }

  window.YZDB = { list, get, put, putMany, del, clear, _open: open };
})();
