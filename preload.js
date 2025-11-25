const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // API Key validation
  validateApiKey: (apiKey, universeId) =>
    ipcRenderer.invoke('validate-api-key', { apiKey, universeId }),

  // Datastore operations
  listDatastores: (apiKey, universeId, cursor) =>
    ipcRenderer.invoke('list-datastores', { apiKey, universeId, cursor }),

  listEntries: (apiKey, universeId, datastoreName, scope, cursor, prefix) =>
    ipcRenderer.invoke('list-entries', {
      apiKey,
      universeId,
      datastoreName,
      scope,
      cursor,
      prefix,
    }),

  getEntry: (apiKey, universeId, datastoreName, entryKey, scope) =>
    ipcRenderer.invoke('get-entry', {
      apiKey,
      universeId,
      datastoreName,
      entryKey,
      scope,
    }),

  setEntry: (
    apiKey,
    universeId,
    datastoreName,
    entryKey,
    value,
    scope,
    userIds,
    attributes
  ) =>
    ipcRenderer.invoke('set-entry', {
      apiKey,
      universeId,
      datastoreName,
      entryKey,
      value,
      scope,
      userIds,
      attributes,
    }),

  deleteEntry: (apiKey, universeId, datastoreName, entryKey, scope) =>
    ipcRenderer.invoke('delete-entry', {
      apiKey,
      universeId,
      datastoreName,
      entryKey,
      scope,
    }),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
})
