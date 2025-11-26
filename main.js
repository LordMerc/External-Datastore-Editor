const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const axios = require('axios')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#1a1a1d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    frame: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// ============ Open Cloud API Functions ============

const OPEN_CLOUD_BASE = 'https://apis.roblox.com'

// Validate API Key by attempting to list datastores
ipcMain.handle('validate-api-key', async (event, { apiKey, universeId }) => {
  try {
    const response = await axios.get(
      `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores`,
      {
        headers: {
          'x-api-key': apiKey,
        },
        params: {
          limit: 1,
        },
      }
    )
    return { success: true, message: 'API Key validated successfully!' }
  } catch (error) {
    const status = error.response?.status
    let message = 'Failed to validate API key'

    if (status === 401) {
      message = 'Invalid API key'
    } else if (status === 403) {
      message = 'API key does not have permission for this universe'
    } else if (status === 404) {
      message = 'Universe not found'
    } else if (error.code === 'ENOTFOUND') {
      message = 'Network error - check your internet connection'
    }

    return { success: false, message }
  }
})

// List all datastores
ipcMain.handle(
  'list-datastores',
  async (event, { apiKey, universeId, cursor }) => {
    try {
      const params = { limit: 50 }
      if (cursor) params.cursor = cursor

      const response = await axios.get(
        `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores`,
        {
          headers: { 'x-api-key': apiKey },
          params,
        }
      )

      return {
        success: true,
        datastores: response.data.datastores || [],
        nextCursor: response.data.nextPageCursor,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// List keys in a datastore
ipcMain.handle(
  'list-entries',
  async (
    event,
    { apiKey, universeId, datastoreName, scope, cursor, prefix }
  ) => {
    try {
      const params = { limit: 50 }
      if (cursor) params.cursor = cursor
      if (prefix) params.prefix = prefix
      if (scope) params.scope = scope

      const response = await axios.get(
        `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries`,
        {
          headers: { 'x-api-key': apiKey },
          params: {
            ...params,
            datastoreName,
          },
        }
      )

      return {
        success: true,
        keys: response.data.keys || [],
        nextCursor: response.data.nextPageCursor,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// Get entry value
ipcMain.handle(
  'get-entry',
  async (event, { apiKey, universeId, datastoreName, entryKey, scope }) => {
    try {
      const params = { datastoreName, entryKey }
      if (scope) params.scope = scope

      const response = await axios.get(
        `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry`,
        {
          headers: { 'x-api-key': apiKey },
          params,
        }
      )

      return {
        success: true,
        data: response.data,
        metadata: {
          contentMD5: response.headers['content-md5'],
          etag: response.headers['etag'],
          lastModified: response.headers['last-modified'],
          createdTime: response.headers['roblox-entry-created-time'],
          updatedTime: response.headers['roblox-entry-version-created-time'],
          userIds: response.headers['roblox-entry-userids'],
          attributes: response.headers['roblox-entry-attributes'],
        },
      }
    } catch (error) {
      const status = error.response?.status
      if (status === 404) {
        return { success: false, message: 'Entry not found' }
      }
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// Set entry value
ipcMain.handle(
  'set-entry',
  async (
    event,
    {
      apiKey,
      universeId,
      datastoreName,
      entryKey,
      value,
      scope,
      userIds,
      attributes,
    }
  ) => {
    try {
      const params = { datastoreName, entryKey }
      if (scope) params.scope = scope

      const headers = {
        'x-api-key': apiKey,
        'content-type': 'application/json',
      }

      if (userIds && userIds.length > 0) {
        headers['roblox-entry-userids'] = JSON.stringify(userIds)
      }
      if (attributes) {
        headers['roblox-entry-attributes'] = JSON.stringify(attributes)
      }

      const response = await axios.post(
        `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry`,
        value,
        {
          headers,
          params,
        }
      )

      return { success: true, version: response.data.version }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// Delete entry
ipcMain.handle(
  'delete-entry',
  async (event, { apiKey, universeId, datastoreName, entryKey, scope }) => {
    try {
      const params = { datastoreName, entryKey }
      if (scope) params.scope = scope

      await axios.delete(
        `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry`,
        {
          headers: { 'x-api-key': apiKey },
          params,
        }
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// List entry versions
ipcMain.handle(
  'list-entry-versions',
  async (
    event,
    {
      apiKey,
      universeId,
      datastoreName,
      entryKey,
      scope,
      cursor,
      sortOrder,
      startTime,
      endTime,
    }
  ) => {
    try {
      const params = { datastoreName, entryKey, limit: 50 }
      if (scope) params.scope = scope
      if (cursor) params.cursor = cursor
      if (sortOrder) params.sortOrder = sortOrder
      if (startTime) params.startTime = startTime
      if (endTime) params.endTime = endTime

      const response = await axios.get(
        `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry/versions`,
        {
          headers: { 'x-api-key': apiKey },
          params,
        }
      )

      return {
        success: true,
        versions: response.data.versions || [],
        nextCursor: response.data.nextPageCursor,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// Get specific entry version
ipcMain.handle(
  'get-entry-version',
  async (
    event,
    { apiKey, universeId, datastoreName, entryKey, versionId, scope }
  ) => {
    try {
      const params = { datastoreName, entryKey, versionId }
      if (scope) params.scope = scope

      const response = await axios.get(
        `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry/versions/version`,
        {
          headers: { 'x-api-key': apiKey },
          params,
        }
      )

      return {
        success: true,
        data: response.data,
        metadata: {
          contentMD5: response.headers['content-md5'],
          createdTime: response.headers['roblox-entry-created-time'],
          versionCreatedTime:
            response.headers['roblox-entry-version-created-time'],
          userIds: response.headers['roblox-entry-userids'],
          attributes: response.headers['roblox-entry-attributes'],
          deleted: response.headers['roblox-entry-deleted'] === 'true',
        },
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// Window controls
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})

ipcMain.handle('window-close', () => {
  mainWindow.close()
})

// ============ Datastore Management (v2 API) ============

// List datastores with v2 API (supports showDeleted)
ipcMain.handle(
  'list-datastores-v2',
  async (event, { apiKey, universeId, showDeleted, pageToken }) => {
    try {
      const params = { maxPageSize: 100 }
      if (showDeleted) params.showDeleted = true
      if (pageToken) params.pageToken = pageToken

      const response = await axios.get(
        `${OPEN_CLOUD_BASE}/cloud/v2/universes/${universeId}/data-stores`,
        {
          headers: { 'x-api-key': apiKey },
          params,
        }
      )

      return {
        success: true,
        datastores: response.data.dataStores || [],
        nextPageToken: response.data.nextPageToken,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// Delete datastore (soft delete - 30 day grace period)
ipcMain.handle(
  'delete-datastore',
  async (event, { apiKey, universeId, datastoreId }) => {
    try {
      const response = await axios.delete(
        `${OPEN_CLOUD_BASE}/cloud/v2/universes/${universeId}/data-stores/${encodeURIComponent(
          datastoreId
        )}`,
        {
          headers: { 'x-api-key': apiKey },
        }
      )

      return {
        success: true,
        datastore: response.data,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// Undelete datastore (restore from pending deletion)
ipcMain.handle(
  'undelete-datastore',
  async (event, { apiKey, universeId, datastoreId }) => {
    try {
      const response = await axios.post(
        `${OPEN_CLOUD_BASE}/cloud/v2/universes/${universeId}/data-stores/${encodeURIComponent(
          datastoreId
        )}:undelete`,
        {},
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      )

      return {
        success: true,
        datastore: response.data,
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      }
    }
  }
)

// Snapshot datastores
ipcMain.handle('snapshot-datastores', async (event, { apiKey, universeId }) => {
  try {
    const response = await axios.post(
      `${OPEN_CLOUD_BASE}/cloud/v2/universes/${universeId}/data-stores:snapshot`,
      {},
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    return {
      success: true,
      newSnapshotTaken: response.data.newSnapshotTaken,
      latestSnapshotTime: response.data.latestSnapshotTime,
    }
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    }
  }
})
