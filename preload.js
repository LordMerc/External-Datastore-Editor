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

  // Entry version history
  listEntryVersions: (
    apiKey,
    universeId,
    datastoreName,
    entryKey,
    scope,
    cursor,
    sortOrder
  ) =>
    ipcRenderer.invoke('list-entry-versions', {
      apiKey,
      universeId,
      datastoreName,
      entryKey,
      scope,
      cursor,
      sortOrder,
    }),

  getEntryVersion: (
    apiKey,
    universeId,
    datastoreName,
    entryKey,
    versionId,
    scope
  ) =>
    ipcRenderer.invoke('get-entry-version', {
      apiKey,
      universeId,
      datastoreName,
      entryKey,
      versionId,
      scope,
    }),

  // Datastore management (v2 API)
  listDatastoresV2: (apiKey, universeId, showDeleted, pageToken) =>
    ipcRenderer.invoke('list-datastores-v2', {
      apiKey,
      universeId,
      showDeleted,
      pageToken,
    }),

  deleteDatastore: (apiKey, universeId, datastoreId) =>
    ipcRenderer.invoke('delete-datastore', {
      apiKey,
      universeId,
      datastoreId,
    }),

  undeleteDatastore: (apiKey, universeId, datastoreId) =>
    ipcRenderer.invoke('undelete-datastore', {
      apiKey,
      universeId,
      datastoreId,
    }),

  snapshotDatastores: (apiKey, universeId) =>
    ipcRenderer.invoke('snapshot-datastores', {
      apiKey,
      universeId,
    }),

  // Messaging Service
  publishMessage: (apiKey, universeId, topic, message) =>
    ipcRenderer.invoke('publish-message', {
      apiKey,
      universeId,
      topic,
      message,
    }),

  // Permission checking
  checkPermissionList: (apiKey, universeId) =>
    ipcRenderer.invoke('check-permission-list', { apiKey, universeId }),

  checkPermissionRead: (apiKey, universeId) =>
    ipcRenderer.invoke('check-permission-read', { apiKey, universeId }),

  checkPermissionWrite: (apiKey, universeId) =>
    ipcRenderer.invoke('check-permission-write', { apiKey, universeId }),

  checkPermissionDelete: (apiKey, universeId) =>
    ipcRenderer.invoke('check-permission-delete', { apiKey, universeId }),

  checkPermissionMessaging: (apiKey, universeId) =>
    ipcRenderer.invoke('check-permission-messaging', { apiKey, universeId }),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
})
