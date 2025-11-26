// ============================================
// Roblox Datastore Editor - Renderer Process
// ============================================

// State
let state = {
  isConnected: false,
  apiKey: '',
  universeId: '',
  currentDatastore: null,
  datastores: [],
  entries: [],
  entriesNextCursor: null,
  showDeleted: false,
  showDeletedEntries: false, // Toggle for showing deleted entries
  pendingDeleteDatastore: null,
  deletedEntries: [], // Track locally deleted entries
  versionHistoryEntry: null, // Current entry being viewed in version history
  selectedVersion: null, // Currently selected version for restore
}
// Persist locally deleted entries so the UI remembers them across reloads
function loadDeletedEntries() {
  try {
    const raw = localStorage.getItem('deletedEntries')
    if (raw) state.deletedEntries = JSON.parse(raw)
  } catch {
    state.deletedEntries = []
  }
}

function saveDeletedEntries() {
  try {
    localStorage.setItem('deletedEntries', JSON.stringify(state.deletedEntries))
  } catch {}
}

// load persisted deleted entries on startup
loadDeletedEntries()

// DOM Elements
const elements = {
  // Window controls
  btnMinimize: document.getElementById('btn-minimize'),
  btnMaximize: document.getElementById('btn-maximize'),
  btnClose: document.getElementById('btn-close'),

  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Connection
  apiKeyInput: document.getElementById('api-key'),
  universeIdInput: document.getElementById('universe-id'),
  btnValidate: document.getElementById('btn-validate'),
  btnClear: document.getElementById('btn-clear'),
  toggleApiKey: document.getElementById('toggle-api-key'),
  connectionAlert: document.getElementById('connection-alert'),
  connectionStatus: document.getElementById('connection-status'),

  // Datastores
  datastoresGrid: document.getElementById('datastores-grid'),
  datastoresEmpty: document.getElementById('datastores-empty'),
  btnRefreshDatastores: document.getElementById('btn-refresh-datastores'),
  datastoreSearch: document.getElementById('datastore-search'),

  // Entries Panel
  entriesPanel: document.getElementById('entries-panel'),
  btnBackDatastores: document.getElementById('btn-back-datastores'),
  currentDatastoreName: document.getElementById('current-datastore-name'),
  btnAddEntry: document.getElementById('btn-add-entry'),
  entrySearch: document.getElementById('entry-search'),
  entryScope: document.getElementById('entry-scope'),
  entriesTbody: document.getElementById('entries-tbody'),
  entriesEmpty: document.getElementById('entries-empty'),
  entriesPagination: document.getElementById('entries-pagination'),
  btnLoadMoreEntries: document.getElementById('btn-load-more-entries'),

  // Editor
  editorDatastore: document.getElementById('editor-datastore'),
  editorDatastoreCustom: document.getElementById('editor-datastore-custom'),
  btnToggleDatastoreInput: document.getElementById(
    'btn-toggle-datastore-input'
  ),
  editorKey: document.getElementById('editor-key'),
  editorScope: document.getElementById('editor-scope'),
  editorValue: document.getElementById('editor-value'),
  lineNumbers: document.getElementById('line-numbers'),
  editorUserIds: document.getElementById('editor-userids'),
  editorAttributes: document.getElementById('editor-attributes'),
  btnFormatJson: document.getElementById('btn-format-json'),
  btnMinifyJson: document.getElementById('btn-minify-json'),
  jsonStatus: document.getElementById('json-status'),
  btnSaveEntry: document.getElementById('btn-save-entry'),
  btnLoadEntry: document.getElementById('btn-load-entry'),
  btnDeleteEntry: document.getElementById('btn-delete-entry'),
  btnClearEditor: document.getElementById('btn-clear-editor'),
  editorAlert: document.getElementById('editor-alert'),
  editorSubtitle: document.getElementById('editor-subtitle'),
  metadataPanel: document.getElementById('metadata-panel'),
  metadataGrid: document.getElementById('metadata-grid'),

  // Modals
  addEntryModal: document.getElementById('add-entry-modal'),
  newEntryKey: document.getElementById('new-entry-key'),
  newEntryValue: document.getElementById('new-entry-value'),
  btnConfirmAddEntry: document.getElementById('btn-confirm-add-entry'),
  deleteModal: document.getElementById('delete-modal'),
  deleteEntryName: document.getElementById('delete-entry-name'),
  btnConfirmDelete: document.getElementById('btn-confirm-delete'),
  deleteDatastoreModal: document.getElementById('delete-datastore-modal'),
  deleteDatastoreName: document.getElementById('delete-datastore-name'),
  btnConfirmDeleteDatastore: document.getElementById(
    'btn-confirm-delete-datastore'
  ),

  // Version History Modal
  versionHistoryModal: document.getElementById('version-history-modal'),
  versionEntryName: document.getElementById('version-entry-name'),
  versionsList: document.getElementById('versions-list'),
  versionPreviewModal: document.getElementById('version-preview-modal'),
  versionPreviewInfo: document.getElementById('version-preview-info'),
  versionPreviewContent: document.getElementById('version-preview-content'),
  btnRestoreVersion: document.getElementById('btn-restore-version'),

  // Datastore management
  showDeletedToggle: document.getElementById('show-deleted-toggle'),
  showDeletedEntriesToggle: document.getElementById(
    'show-deleted-entries-toggle'
  ),
  btnSnapshotDatastores: document.getElementById('btn-snapshot-datastores'),

  // Loading
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.querySelector('.loading-text'),

  // Toast
  toastContainer: document.getElementById('toast-container'),
}

// ============ Utility Functions ============

function showLoading(text = 'Loading...') {
  elements.loadingText.textContent = text
  elements.loadingOverlay.classList.add('active')
}

function hideLoading() {
  elements.loadingOverlay.classList.remove('active')
}

function showToast(type, title, message) {
  const toast = document.createElement('div')
  toast.className = `toast ${type}`

  const icons = {
    success:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2ecc71" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#e74c3c" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warning:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f39c12" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  }

  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
  `

  elements.toastContainer.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards'
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}

function showAlert(element, type, message) {
  element.className = `alert ${type}`
  element.textContent = message
  element.style.display = 'block'
}

function hideAlert(element) {
  element.style.display = 'none'
}

function validateJson(str) {
  try {
    JSON.parse(str)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: e.message }
  }
}

function formatJson(str) {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

function minifyJson(str) {
  try {
    return JSON.stringify(JSON.parse(str))
  } catch {
    return str
  }
}

function updateConnectionStatus(connected) {
  state.isConnected = connected
  const statusDot = elements.connectionStatus.querySelector('.status-dot')
  const statusText = elements.connectionStatus.querySelector('.status-text')

  if (connected) {
    statusDot.className = 'status-dot connected'
    statusText.textContent = 'Connected'
    document.getElementById('nav-datastores').classList.remove('disabled')
    document.getElementById('nav-editor').classList.remove('disabled')
  } else {
    statusDot.className = 'status-dot disconnected'
    statusText.textContent = 'Not Connected'
    document.getElementById('nav-datastores').classList.add('disabled')
    document.getElementById('nav-editor').classList.add('disabled')
  }
}

function saveCredentials() {
  localStorage.setItem('roblox_ds_apiKey', state.apiKey)
  localStorage.setItem('roblox_ds_universeId', state.universeId)
}

function loadCredentials() {
  const apiKey = localStorage.getItem('roblox_ds_apiKey')
  const universeId = localStorage.getItem('roblox_ds_universeId')

  if (apiKey) {
    elements.apiKeyInput.value = apiKey
    state.apiKey = apiKey
  }
  if (universeId) {
    elements.universeIdInput.value = universeId
    state.universeId = universeId
  }
}

// ============ Window Controls ============

elements.btnMinimize.addEventListener('click', () =>
  window.electronAPI.minimizeWindow()
)
elements.btnMaximize.addEventListener('click', () =>
  window.electronAPI.maximizeWindow()
)
elements.btnClose.addEventListener('click', () =>
  window.electronAPI.closeWindow()
)

// ============ Navigation ============

elements.navItems.forEach((item) => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab

    // Check if connected for protected tabs
    if ((tab === 'datastores' || tab === 'editor') && !state.isConnected) {
      showToast(
        'warning',
        'Not Connected',
        'Please validate your API key first'
      )
      return
    }

    // Update nav
    elements.navItems.forEach((n) => n.classList.remove('active'))
    item.classList.add('active')

    // Update content
    elements.tabContents.forEach((t) => t.classList.remove('active'))
    document.getElementById(`tab-${tab}`).classList.add('active')

    // Load datastores if switching to that tab
    if (
      tab === 'datastores' &&
      state.isConnected &&
      state.datastores.length === 0
    ) {
      loadDatastores()
    }

    // Update datastore dropdown when switching to editor tab
    if (tab === 'editor' && state.isConnected) {
      updateDatastoreDropdown()
    }
  })
})

// ============ Connection Tab ============

elements.toggleApiKey.addEventListener('click', () => {
  const input = elements.apiKeyInput
  input.type = input.type === 'password' ? 'text' : 'password'
})

elements.btnValidate.addEventListener('click', async () => {
  const apiKey = elements.apiKeyInput.value.trim()
  const universeId = elements.universeIdInput.value.trim()

  if (!apiKey || !universeId) {
    showAlert(
      elements.connectionAlert,
      'error',
      'Please enter both API Key and Universe ID'
    )
    return
  }

  showLoading('Validating API Key...')
  hideAlert(elements.connectionAlert)

  const result = await window.electronAPI.validateApiKey(apiKey, universeId)

  hideLoading()

  if (result.success) {
    state.apiKey = apiKey
    state.universeId = universeId
    saveCredentials()
    updateConnectionStatus(true)
    showAlert(elements.connectionAlert, 'success', result.message)
    showToast('success', 'Connected!', 'You can now browse datastores')
  } else {
    updateConnectionStatus(false)
    showAlert(elements.connectionAlert, 'error', result.message)
    showToast('error', 'Connection Failed', result.message)
  }
})

elements.btnClear.addEventListener('click', () => {
  elements.apiKeyInput.value = ''
  elements.universeIdInput.value = ''
  state.apiKey = ''
  state.universeId = ''
  state.datastores = []
  updateConnectionStatus(false)
  hideAlert(elements.connectionAlert)
  localStorage.removeItem('roblox_ds_apiKey')
  localStorage.removeItem('roblox_ds_universeId')
})

// ============ Datastores Tab ============

async function loadDatastores() {
  if (!state.isConnected) return

  showLoading('Loading Datastores...')

  const result = await window.electronAPI.listDatastoresV2(
    state.apiKey,
    state.universeId,
    state.showDeleted
  )

  hideLoading()

  if (result.success) {
    state.datastores = result.datastores
    renderDatastores(state.datastores)
  } else {
    showToast('error', 'Failed to load datastores', result.message)
  }
}

function renderDatastores(datastores) {
  // Hide entries panel
  elements.entriesPanel.style.display = 'none'
  elements.datastoresGrid.style.display = 'grid'

  if (datastores.length === 0) {
    elements.datastoresGrid.innerHTML = ''
    elements.datastoresGrid.appendChild(elements.datastoresEmpty)
    elements.datastoresEmpty.style.display = 'block'
    return
  }

  elements.datastoresEmpty.style.display = 'none'
  elements.datastoresGrid.innerHTML = datastores
    .map((ds) => {
      const isDeleted = ds.state === 'DELETED'
      const expireDate = ds.expireTime ? new Date(ds.expireTime) : null
      const createDate = ds.createTime ? new Date(ds.createTime) : null

      return `
    <div class="datastore-card ${
      isDeleted ? 'deleted' : ''
    }" data-id="${escapeHtml(ds.id)}">
      <div class="datastore-icon">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"/>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
      </div>
      <h3>${escapeHtml(ds.id)}</h3>
      <div class="datastore-info">Created: ${
        createDate ? createDate.toLocaleDateString() : 'Unknown'
      }</div>
      ${
        isDeleted
          ? `
        <span class="deleted-badge">PENDING DELETION</span>
        <div class="expire-info">Expires: ${
          expireDate ? expireDate.toLocaleDateString() : 'Unknown'
        }</div>
      `
          : ''
      }
      <div class="datastore-card-actions">
        ${
          isDeleted
            ? `
          <button class="btn btn-primary btn-restore-datastore" data-id="${escapeHtml(
            ds.id
          )}">
            Restore
          </button>
        `
            : `
          <button class="btn btn-secondary btn-open-datastore" data-id="${escapeHtml(
            ds.id
          )}">
            Open
          </button>
          <button class="btn btn-danger btn-delete-datastore" data-id="${escapeHtml(
            ds.id
          )}">
            Delete
          </button>
        `
        }
      </div>
    </div>
  `
    })
    .join('')

  // Add click handlers for open buttons
  document.querySelectorAll('.btn-open-datastore').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = btn.dataset.id
      openDatastore(id)
    })
  })

  // Add click handlers for delete buttons
  document.querySelectorAll('.btn-delete-datastore').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = btn.dataset.id
      confirmDeleteDatastore(id)
    })
  })

  // Add click handlers for restore buttons
  document.querySelectorAll('.btn-restore-datastore').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = btn.dataset.id
      restoreDatastore(id)
    })
  })

  // Add click handlers for cards (only for non-deleted)
  document.querySelectorAll('.datastore-card:not(.deleted)').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.id
      openDatastore(id)
    })
  })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

async function openDatastore(name) {
  state.currentDatastore = name
  state.entries = []
  state.entriesNextCursor = null

  elements.datastoresGrid.style.display = 'none'
  elements.entriesPanel.style.display = 'block'
  elements.currentDatastoreName.textContent = name

  await loadEntries()
}

async function checkEntryDeletionStatus(key, scope) {
  // Check the latest version to see if entry is deleted
  const result = await window.electronAPI.listEntryVersions(
    state.apiKey,
    state.universeId,
    state.currentDatastore,
    key,
    scope === 'global' ? undefined : scope,
    undefined,
    'Descending',
    1 // Only get the latest version
  )

  if (result.success && result.versions.length > 0) {
    return result.versions[0].deleted || false
  }
  return false
}

async function loadEntries(append = false) {
  showLoading('Loading Entries...')

  const scope = elements.entryScope.value.trim() || undefined
  const searchQuery = elements.entrySearch.value.trim().toLowerCase()
  const cursor = append ? state.entriesNextCursor : undefined

  const result = await window.electronAPI.listEntries(
    state.apiKey,
    state.universeId,
    state.currentDatastore,
    scope,
    cursor,
    undefined // Don't use prefix filter from API, we'll filter client-side
  )

  hideLoading()

  if (result.success) {
    // Filter entries client-side to allow partial matching anywhere in the key
    let filteredKeys = result.keys
    if (searchQuery) {
      filteredKeys = result.keys.filter((entry) =>
        entry.key.toLowerCase().includes(searchQuery)
      )
    }

    // Check deletion status for each entry by examining latest version
    showLoading('Checking entry status...')
    const entriesWithStatus = await Promise.all(
      filteredKeys.map(async (entry) => {
        const isDeleted = await checkEntryDeletionStatus(
          entry.key,
          entry.scope || 'global'
        )
        if (isDeleted) {
          // Track in deletedEntries if not already there
          const normalizedScope = entry.scope || 'global'
          const alreadyTracked = state.deletedEntries.some(
            (d) =>
              d.key === entry.key &&
              (d.scope || 'global') === normalizedScope &&
              d.datastore === state.currentDatastore
          )
          if (!alreadyTracked) {
            state.deletedEntries.push({
              key: entry.key,
              scope: normalizedScope,
              datastore: state.currentDatastore,
              deletedAt: new Date().toISOString(),
            })
            saveDeletedEntries()
          }
          return {
            ...entry,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
          }
        }
        return entry
      })
    )
    hideLoading()

    if (append) {
      state.entries = [...state.entries, ...entriesWithStatus]
    } else {
      state.entries = entriesWithStatus
    }
    state.entriesNextCursor = result.nextCursor
    renderEntries()
  } else {
    showToast('error', 'Failed to load entries', result.message)
  }
}

function renderEntries() {
  // Start with server entries, marking any that are in our deleted list
  let allEntries = state.entries.map((entry) => {
    const normalizedScope = entry.scope || 'global'
    const isLocallyDeleted = state.deletedEntries.some(
      (d) =>
        d.key === entry.key &&
        (d.scope || 'global') === normalizedScope &&
        d.datastore === state.currentDatastore
    )
    if (isLocallyDeleted) {
      const deletedInfo = state.deletedEntries.find(
        (d) =>
          d.key === entry.key &&
          (d.scope || 'global') === normalizedScope &&
          d.datastore === state.currentDatastore
      )
      return { ...entry, isDeleted: true, deletedAt: deletedInfo?.deletedAt }
    }
    return entry
  })

  // Add deleted entries that are being tracked locally but not in the server list
  if (state.showDeletedEntries) {
    state.deletedEntries.forEach((deleted) => {
      if (deleted.datastore === state.currentDatastore) {
        // Check if it's not already in the list (normalize scopes on both sides)
        const exists = allEntries.some(
          (e) =>
            e.key === deleted.key &&
            (e.scope || 'global') === (deleted.scope || 'global')
        )
        if (!exists) {
          allEntries.push({ ...deleted, isDeleted: true })
        }
      }
    })
  }

  // Filter out deleted entries from the list if toggle is off
  if (!state.showDeletedEntries) {
    allEntries = allEntries.filter((e) => !e.isDeleted)
  }

  if (allEntries.length === 0) {
    elements.entriesTbody.innerHTML = ''
    elements.entriesEmpty.style.display = 'block'
    elements.entriesPagination.style.display = 'none'
    return
  }

  elements.entriesEmpty.style.display = 'none'
  elements.entriesTbody.innerHTML = allEntries
    .map((entry) => {
      const isDeleted = entry.isDeleted || false
      const deletedAt = entry.deletedAt ? new Date(entry.deletedAt) : null

      return `
    <tr class="${isDeleted ? 'deleted-entry' : ''}">
      <td class="key-cell">
        <div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="${isDeleted ? 'deleted-key-name' : ''}">${escapeHtml(
        entry.key
      )}</span>
            ${isDeleted ? `<span class="deleted-badge">DELETED</span>` : ''}
          </div>
          ${
            isDeleted && deletedAt
              ? `<div class="deleted-date">Deleted: ${deletedAt.toLocaleString()}</div>`
              : ''
          }
        </div>
      </td>
      <td>${escapeHtml(entry.scope || 'global')}</td>
      <td class="actions-cell">
        ${
          isDeleted
            ? `
          <button class="btn btn-sm btn-secondary btn-history-entry" data-key="${escapeHtml(
            entry.key
          )}" data-scope="${escapeHtml(entry.scope || 'global')}">
            History
          </button>
          <button class="btn btn-sm btn-primary btn-restore-entry" data-key="${escapeHtml(
            entry.key
          )}" data-scope="${escapeHtml(entry.scope || 'global')}">
            Restore
          </button>
        `
            : `
          <button class="btn btn-sm btn-secondary btn-history-entry" data-key="${escapeHtml(
            entry.key
          )}" data-scope="${escapeHtml(entry.scope || 'global')}">
            History
          </button>
          <button class="btn btn-sm btn-primary btn-edit-entry" data-key="${escapeHtml(
            entry.key
          )}" data-scope="${escapeHtml(entry.scope || 'global')}">
            Edit
          </button>
          <button class="btn btn-sm btn-danger btn-delete-entry" data-key="${escapeHtml(
            entry.key
          )}" data-scope="${escapeHtml(entry.scope || 'global')}">
            Delete
          </button>
        `
        }
      </td>
    </tr>
  `
    })
    .join('')

  // Add click handlers for history buttons
  document.querySelectorAll('.btn-history-entry').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key
      const scope = btn.dataset.scope
      showVersionHistory(key, scope)
    })
  })

  // Add click handlers for edit buttons
  document.querySelectorAll('.btn-edit-entry').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key
      const scope = btn.dataset.scope
      editEntry(key, scope)
    })
  })

  // Add click handlers for delete buttons
  document.querySelectorAll('.btn-delete-entry').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key
      const scope = btn.dataset.scope
      confirmDeleteEntry(key, scope)
    })
  })

  // Add click handlers for restore buttons
  document.querySelectorAll('.btn-restore-entry').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key
      const scope = btn.dataset.scope
      showVersionHistory(key, scope, true) // true = restore mode
    })
  })

  elements.entriesPagination.style.display = state.entriesNextCursor
    ? 'flex'
    : 'none'
}

// ============ Version History ============

async function showVersionHistory(key, scope, restoreMode = false) {
  state.versionHistoryEntry = {
    key,
    scope,
    datastore: state.currentDatastore,
    restoreMode,
  }
  elements.versionEntryName.textContent = key
  elements.versionHistoryModal.classList.add('active')
  elements.versionsList.innerHTML =
    '<div class="loading-versions">Loading versions...</div>'

  const result = await window.electronAPI.listEntryVersions(
    state.apiKey,
    state.universeId,
    state.currentDatastore,
    key,
    scope === 'global' ? undefined : scope,
    undefined,
    'Descending' // Most recent first
  )

  if (result.success) {
    if (result.versions.length === 0) {
      elements.versionsList.innerHTML =
        '<div class="empty-versions">No version history available</div>'
    } else {
      elements.versionsList.innerHTML = result.versions
        .map((version) => {
          const date = new Date(version.createdTime)
          const isDeleted = version.deleted
          return `
            <div class="version-item ${
              isDeleted ? 'deleted' : ''
            }" data-version="${escapeHtml(version.version)}">
              <div class="version-info">
                <span class="version-id">Version ${escapeHtml(
                  version.version
                )}</span>
                ${isDeleted ? '<span class="deleted-badge">DELETED</span>' : ''}
                <span class="version-date">${date.toLocaleString()}</span>
              </div>
              <div class="version-meta">
                <span class="version-size">${
                  version.contentLength || 0
                } bytes</span>
              </div>
              <div class="version-actions">
                <button class="btn btn-sm btn-secondary btn-preview-version" data-version="${escapeHtml(
                  version.version
                )}">
                  Preview
                </button>
                ${
                  !isDeleted
                    ? `
                  <button class="btn btn-sm btn-primary btn-restore-version-item" data-version="${escapeHtml(
                    version.version
                  )}">
                    Restore
                  </button>
                `
                    : ''
                }
              </div>
            </div>
          `
        })
        .join('')

      // Add event handlers for version items
      document.querySelectorAll('.btn-preview-version').forEach((btn) => {
        btn.addEventListener('click', () => previewVersion(btn.dataset.version))
      })

      document.querySelectorAll('.btn-restore-version-item').forEach((btn) => {
        btn.addEventListener('click', () =>
          confirmRestoreVersion(btn.dataset.version)
        )
      })
    }
  } else {
    elements.versionsList.innerHTML = `<div class="error-versions">Failed to load versions: ${escapeHtml(
      result.message
    )}</div>`
  }
}

async function previewVersion(versionId) {
  const entry = state.versionHistoryEntry
  if (!entry) return

  showLoading('Loading version...')

  const result = await window.electronAPI.getEntryVersion(
    state.apiKey,
    state.universeId,
    entry.datastore,
    entry.key,
    versionId,
    entry.scope === 'global' ? undefined : entry.scope
  )

  hideLoading()

  if (result.success) {
    state.selectedVersion = { versionId, data: result.data }
    const date = result.metadata.versionCreatedTime
      ? new Date(result.metadata.versionCreatedTime).toLocaleString()
      : 'Unknown'

    elements.versionPreviewInfo.textContent = `Version ${versionId} - ${date}`

    try {
      const formatted = JSON.stringify(result.data, null, 2)
      elements.versionPreviewContent.textContent = formatted
    } catch {
      elements.versionPreviewContent.textContent = String(result.data)
    }

    elements.versionPreviewModal.classList.add('active')
  } else {
    showToast('error', 'Failed to load version', result.message)
  }
}

function confirmRestoreVersion(versionId) {
  state.selectedVersion = { versionId }
  previewVersion(versionId)
}

elements.btnRestoreVersion.addEventListener('click', async () => {
  if (!state.selectedVersion || !state.versionHistoryEntry) return

  const entry = state.versionHistoryEntry
  const version = state.selectedVersion

  showLoading('Restoring version...')
  elements.versionPreviewModal.classList.remove('active')

  // If we already have the data, use it. Otherwise fetch it.
  let dataToRestore = version.data
  if (!dataToRestore) {
    const result = await window.electronAPI.getEntryVersion(
      state.apiKey,
      state.universeId,
      entry.datastore,
      entry.key,
      version.versionId,
      entry.scope === 'global' ? undefined : entry.scope
    )
    if (!result.success) {
      hideLoading()
      showToast('error', 'Failed to load version', result.message)
      return
    }
    dataToRestore = result.data
  }

  // Write the version data as the current entry
  const saveResult = await window.electronAPI.setEntry(
    state.apiKey,
    state.universeId,
    entry.datastore,
    entry.key,
    typeof dataToRestore === 'string'
      ? dataToRestore
      : JSON.stringify(dataToRestore),
    entry.scope === 'global' ? undefined : entry.scope
  )

  hideLoading()

  if (saveResult.success) {
    showToast(
      'success',
      'Version Restored',
      `Entry "${entry.key}" has been restored to version ${version.versionId}`
    )

    // Remove from deleted entries if it was there
    state.deletedEntries = state.deletedEntries.filter(
      (e) =>
        !(
          e.key === entry.key &&
          e.scope === entry.scope &&
          e.datastore === entry.datastore
        )
    )
    // persist changes
    saveDeletedEntries()

    elements.versionHistoryModal.classList.remove('active')
    loadEntries()
  } else {
    showToast('error', 'Failed to restore', saveResult.message)
  }
})

elements.btnRefreshDatastores.addEventListener('click', loadDatastores)

elements.btnBackDatastores.addEventListener('click', () => {
  elements.entriesPanel.style.display = 'none'
  elements.datastoresGrid.style.display = 'grid'
  state.currentDatastore = null
})

elements.btnLoadMoreEntries.addEventListener('click', () => loadEntries(true))

// Search/filter entries
let searchTimeout
elements.entrySearch.addEventListener('input', () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadEntries(), 500)
})

elements.entryScope.addEventListener('change', () => loadEntries())

elements.datastoreSearch.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase()
  const filtered = state.datastores.filter((ds) =>
    ds.id.toLowerCase().includes(query)
  )
  renderDatastores(filtered)
})

// Show deleted toggle for datastores
elements.showDeletedToggle.addEventListener('change', (e) => {
  state.showDeleted = e.target.checked
  loadDatastores()
})

// Show deleted toggle for entries
elements.showDeletedEntriesToggle.addEventListener('change', (e) => {
  state.showDeletedEntries = e.target.checked
  renderEntries()
})

// Snapshot datastores
elements.btnSnapshotDatastores.addEventListener('click', async () => {
  if (!state.isConnected) {
    showToast('warning', 'Not Connected', 'Please connect to a game first')
    return
  }

  showLoading('Creating Snapshot...')

  const result = await window.electronAPI.snapshotDatastores(
    state.apiKey,
    state.universeId
  )

  hideLoading()

  if (result.success) {
    if (result.newSnapshotTaken) {
      showToast(
        'success',
        'Snapshot Created',
        `Snapshot taken at ${new Date(
          result.latestSnapshotTime
        ).toLocaleString()}`
      )
    } else {
      showToast(
        'warning',
        'Snapshot Exists',
        `A snapshot was already taken today. Latest: ${new Date(
          result.latestSnapshotTime
        ).toLocaleString()}`
      )
    }
  } else {
    showToast('error', 'Snapshot Failed', result.message)
  }
})

// Delete datastore confirmation
function confirmDeleteDatastore(datastoreId) {
  state.pendingDeleteDatastore = datastoreId
  elements.deleteDatastoreName.textContent = datastoreId
  elements.deleteDatastoreModal.classList.add('active')
}

elements.btnConfirmDeleteDatastore.addEventListener('click', async () => {
  if (!state.pendingDeleteDatastore) return

  showLoading('Deleting Datastore...')
  elements.deleteDatastoreModal.classList.remove('active')

  const result = await window.electronAPI.deleteDatastore(
    state.apiKey,
    state.universeId,
    state.pendingDeleteDatastore
  )

  hideLoading()

  if (result.success) {
    showToast(
      'success',
      'Datastore Deleted',
      `"${state.pendingDeleteDatastore}" scheduled for deletion in 30 days`
    )
    state.pendingDeleteDatastore = null
    loadDatastores()
  } else {
    showToast('error', 'Delete Failed', result.message)
  }
})

// Restore datastore
async function restoreDatastore(datastoreId) {
  showLoading('Restoring Datastore...')

  const result = await window.electronAPI.undeleteDatastore(
    state.apiKey,
    state.universeId,
    datastoreId
  )

  hideLoading()

  if (result.success) {
    showToast(
      'success',
      'Datastore Restored',
      `"${datastoreId}" has been restored`
    )
    loadDatastores()
  } else {
    showToast('error', 'Restore Failed', result.message)
  }
}

// ============ Add Entry Modal ============

elements.btnAddEntry.addEventListener('click', () => {
  elements.newEntryKey.value = ''
  elements.newEntryValue.value = '{}'
  elements.addEntryModal.classList.add('active')
})

elements.btnConfirmAddEntry.addEventListener('click', async () => {
  const key = elements.newEntryKey.value.trim()
  const value = elements.newEntryValue.value.trim()

  if (!key) {
    showToast('error', 'Invalid Entry', 'Please enter a key name')
    return
  }

  const validation = validateJson(value)
  if (!validation.valid) {
    showToast('error', 'Invalid JSON', validation.error)
    return
  }

  showLoading('Creating Entry...')
  elements.addEntryModal.classList.remove('active')

  const scope = elements.entryScope.value.trim() || 'global'

  const result = await window.electronAPI.setEntry(
    state.apiKey,
    state.universeId,
    state.currentDatastore,
    key,
    value,
    scope
  )

  hideLoading()

  if (result.success) {
    showToast('success', 'Entry Created', `Key "${key}" has been created`)
    loadEntries()
  } else {
    showToast('error', 'Failed to create entry', result.message)
  }
})

// ============ Delete Entry Modal ============

let entryToDelete = null

function confirmDeleteEntry(key, scope) {
  entryToDelete = { key, scope }
  elements.deleteEntryName.textContent = key
  elements.deleteModal.classList.add('active')
}

elements.btnConfirmDelete.addEventListener('click', async () => {
  if (!entryToDelete) return

  const datastore = entryToDelete.datastore || state.currentDatastore
  const normalizedScope = entryToDelete.scope || 'global'

  showLoading('Deleting Entry...')
  elements.deleteModal.classList.remove('active')

  const result = await window.electronAPI.deleteEntry(
    state.apiKey,
    state.universeId,
    datastore,
    entryToDelete.key,
    normalizedScope
  )

  hideLoading()

  if (result.success) {
    showToast(
      'success',
      'Entry Deleted',
      `Key "${entryToDelete.key}" has been deleted`
    )

    // Track this as a deleted entry so we can show it with restore option
    const deletedEntry = {
      key: entryToDelete.key,
      scope: normalizedScope,
      datastore,
      deletedAt: new Date().toISOString(),
    }

    // Add to deleted entries if not already there
    const alreadyTracked = state.deletedEntries.some(
      (e) =>
        e.key === deletedEntry.key &&
        e.scope === deletedEntry.scope &&
        e.datastore === deletedEntry.datastore
    )
    if (!alreadyTracked) {
      state.deletedEntries.push(deletedEntry)
      // persist
      saveDeletedEntries()
    }

    // If deleted from editor tab
    if (entryToDelete.datastore) {
      elements.editorValue.value = ''
      elements.editorUserIds.value = ''
      elements.editorAttributes.value = ''
      elements.metadataPanel.style.display = 'none'
      updateLineNumbers()
      updateSyntaxHighlight()
    } else {
      // Deleted from entries list - keep a placeholder so the user can see it when toggled on
      let foundInCurrentList = false
      state.entries = state.entries.map((e) => {
        if (
          e.key === entryToDelete.key &&
          (e.scope || 'global') === normalizedScope
        ) {
          foundInCurrentList = true
          return { ...e, isDeleted: true, deletedAt: deletedEntry.deletedAt }
        }
        return e
      })

      if (!foundInCurrentList) {
        state.entries.unshift({
          key: entryToDelete.key,
          scope: normalizedScope,
          isDeleted: true,
          deletedAt: deletedEntry.deletedAt,
        })
      }

      saveDeletedEntries()
    }

    renderEntries()
  } else {
    showToast('error', 'Failed to delete entry', result.message)
  }

  entryToDelete = null
})

// ============ Editor Tab ============

// Helper to get selected datastore value
function getDatastoreValue() {
  if (elements.editorDatastoreCustom.style.display !== 'none') {
    return elements.editorDatastoreCustom.value.trim()
  }
  return elements.editorDatastore.value.trim()
}

// Helper to set datastore value
function setDatastoreValue(value) {
  // Check if value exists in dropdown
  const options = Array.from(elements.editorDatastore.options)
  const exists = options.some((opt) => opt.value === value)

  if (exists) {
    elements.editorDatastore.value = value
    elements.editorDatastore.style.display = ''
    elements.editorDatastoreCustom.style.display = 'none'
  } else if (value) {
    // Switch to custom input
    elements.editorDatastore.style.display = 'none'
    elements.editorDatastoreCustom.style.display = ''
    elements.editorDatastoreCustom.value = value
  }
}

// Update the datastore dropdown with current datastores
function updateDatastoreDropdown() {
  const currentValue = getDatastoreValue()
  elements.editorDatastore.innerHTML =
    '<option value="">Select a datastore...</option>'

  // Only show active (non-deleted) datastores in dropdown
  state.datastores
    .filter((ds) => ds.state !== 'DELETED')
    .forEach((ds) => {
      const option = document.createElement('option')
      option.value = ds.id
      option.textContent = ds.id
      elements.editorDatastore.appendChild(option)
    })

  // Restore value if it exists
  if (currentValue) {
    setDatastoreValue(currentValue)
  }
}

// Toggle between dropdown and custom input
elements.btnToggleDatastoreInput.addEventListener('click', () => {
  if (elements.editorDatastoreCustom.style.display === 'none') {
    elements.editorDatastore.style.display = 'none'
    elements.editorDatastoreCustom.style.display = ''
    elements.editorDatastoreCustom.value = elements.editorDatastore.value
    elements.editorDatastoreCustom.focus()
  } else {
    elements.editorDatastoreCustom.style.display = 'none'
    elements.editorDatastore.style.display = ''
  }
})

async function editEntry(key, scope) {
  // Prevent editing entries that we've marked as deleted locally
  const normalizedScope = scope || 'global'
  const isLocallyDeleted = state.deletedEntries.some(
    (d) =>
      d.key === key &&
      (d.scope || 'global') === normalizedScope &&
      d.datastore === state.currentDatastore
  )

  if (isLocallyDeleted) {
    showToast(
      'warning',
      'Entry Deleted',
      'This entry is deleted. View history or restore before editing.'
    )
    // Open version history in restore mode to make it easier to recover
    showVersionHistory(key, normalizedScope, true)
    return
  }

  // Switch to editor tab
  elements.navItems.forEach((n) => n.classList.remove('active'))
  document.querySelector('[data-tab="editor"]').classList.add('active')
  elements.tabContents.forEach((t) => t.classList.remove('active'))
  document.getElementById('tab-editor').classList.add('active')

  // Update datastore dropdown and fill in details
  updateDatastoreDropdown()
  setDatastoreValue(state.currentDatastore)
  elements.editorKey.value = key
  elements.editorScope.value = scope

  // Load entry
  await loadEntryInEditor()
}

async function loadEntryInEditor() {
  const datastore = getDatastoreValue()
  const key = elements.editorKey.value.trim()
  const scope = elements.editorScope.value.trim() || 'global'

  if (!datastore || !key) {
    showAlert(
      elements.editorAlert,
      'error',
      'Please enter datastore name and key'
    )
    return
  }

  showLoading('Loading Entry...')
  hideAlert(elements.editorAlert)

  const result = await window.electronAPI.getEntry(
    state.apiKey,
    state.universeId,
    datastore,
    key,
    scope
  )

  hideLoading()

  if (result.success) {
    // Handle the data - could be any JSON value
    const value =
      typeof result.data === 'string'
        ? result.data
        : JSON.stringify(result.data, null, 2)

    elements.editorValue.value = value
    updateLineNumbers()
    updateSyntaxHighlight()
    elements.editorSubtitle.textContent = `Editing: ${datastore} / ${key}`

    // Show metadata
    if (result.metadata) {
      elements.metadataPanel.style.display = 'block'
      elements.metadataGrid.innerHTML = `
        <div class="metadata-item">
          <label>Created</label>
          <span>${result.metadata.createdTime || 'N/A'}</span>
        </div>
        <div class="metadata-item">
          <label>Updated</label>
          <span>${result.metadata.updatedTime || 'N/A'}</span>
        </div>
        <div class="metadata-item">
          <label>ETag</label>
          <span>${result.metadata.etag || 'N/A'}</span>
        </div>
        <div class="metadata-item">
          <label>User IDs</label>
          <span>${result.metadata.userIds || 'None'}</span>
        </div>
      `

      // Fill in user IDs and attributes if available
      if (result.metadata.userIds) {
        try {
          const userIds = JSON.parse(result.metadata.userIds)
          elements.editorUserIds.value = userIds.join(', ')
        } catch {}
      }

      if (result.metadata.attributes) {
        elements.editorAttributes.value = result.metadata.attributes
      }
    }

    updateJsonStatus()
    showToast('success', 'Entry Loaded', `Loaded "${key}" from "${datastore}"`)
  } else {
    // If the entry was not found, open version history in restore mode so user can recover
    const msg = result.message || ''
    if (/not found|404|entry not found/i.test(msg)) {
      showAlert(elements.editorAlert, 'error', 'Entry not found')
      showToast(
        'warning',
        'Entry not found',
        'Showing version history to restore'
      )
      showVersionHistory(key, scope, true)
    } else {
      showAlert(elements.editorAlert, 'error', result.message)
      showToast('error', 'Failed to load entry', result.message)
    }
  }
}

elements.btnLoadEntry.addEventListener('click', loadEntryInEditor)

elements.btnSaveEntry.addEventListener('click', async () => {
  const datastore = getDatastoreValue()
  const key = elements.editorKey.value.trim()
  const scope = elements.editorScope.value.trim() || 'global'
  const value = elements.editorValue.value.trim()

  if (!datastore || !key) {
    showAlert(
      elements.editorAlert,
      'error',
      'Please enter datastore name and key'
    )
    return
  }

  const validation = validateJson(value)
  if (!validation.valid) {
    showAlert(
      elements.editorAlert,
      'error',
      `Invalid JSON: ${validation.error}`
    )
    return
  }

  // Parse optional fields
  let userIds = []
  if (elements.editorUserIds.value.trim()) {
    userIds = elements.editorUserIds.value
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id))
  }

  let attributes = null
  if (elements.editorAttributes.value.trim()) {
    const attrValidation = validateJson(elements.editorAttributes.value)
    if (!attrValidation.valid) {
      showAlert(
        elements.editorAlert,
        'error',
        `Invalid attributes JSON: ${attrValidation.error}`
      )
      return
    }
    attributes = JSON.parse(elements.editorAttributes.value)
  }

  showLoading('Saving Entry...')
  hideAlert(elements.editorAlert)

  const result = await window.electronAPI.setEntry(
    state.apiKey,
    state.universeId,
    datastore,
    key,
    value,
    scope,
    userIds.length > 0 ? userIds : null,
    attributes
  )

  hideLoading()

  if (result.success) {
    showAlert(
      elements.editorAlert,
      'success',
      `Entry saved successfully! Version: ${result.version}`
    )
    showToast('success', 'Entry Saved', `Saved "${key}" to "${datastore}"`)
  } else {
    showAlert(elements.editorAlert, 'error', result.message)
    showToast('error', 'Failed to save entry', result.message)
  }
})

elements.btnDeleteEntry.addEventListener('click', async () => {
  const datastore = getDatastoreValue()
  const key = elements.editorKey.value.trim()
  const scope = elements.editorScope.value.trim() || 'global'

  if (!datastore || !key) {
    showAlert(
      elements.editorAlert,
      'error',
      'Please enter datastore name and key'
    )
    return
  }

  // Use delete modal
  entryToDelete = { key, scope, datastore }
  elements.deleteEntryName.textContent = key
  elements.deleteModal.classList.add('active')
})

elements.btnClearEditor.addEventListener('click', () => {
  elements.editorDatastore.value = ''
  elements.editorDatastoreCustom.value = ''
  elements.editorDatastoreCustom.style.display = 'none'
  elements.editorDatastore.style.display = ''
  elements.editorKey.value = ''
  elements.editorScope.value = 'global'
  elements.editorValue.value = ''
  elements.editorUserIds.value = ''
  elements.editorAttributes.value = ''
  elements.metadataPanel.style.display = 'none'
  elements.editorSubtitle.textContent =
    'Edit datastore entries with JSON support'
  hideAlert(elements.editorAlert)
  updateJsonStatus()
  updateLineNumbers()
  updateSyntaxHighlight()
})

// JSON formatting
elements.btnFormatJson.addEventListener('click', () => {
  elements.editorValue.value = formatJson(elements.editorValue.value)
  updateJsonStatus()
  updateLineNumbers()
  updateSyntaxHighlight()
})

elements.btnMinifyJson.addEventListener('click', () => {
  elements.editorValue.value = minifyJson(elements.editorValue.value)
  updateJsonStatus()
  updateLineNumbers()
  updateSyntaxHighlight()
})

elements.editorValue.addEventListener('scroll', () => {
  elements.lineNumbers.scrollTop = elements.editorValue.scrollTop
  const syntaxHighlight = document.getElementById('syntax-highlight')
  if (syntaxHighlight) {
    syntaxHighlight.scrollTop = elements.editorValue.scrollTop
    syntaxHighlight.scrollLeft = elements.editorValue.scrollLeft
  }
})

// Handle Tab key for indentation and auto-outdent for closing brackets
elements.editorValue.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const start = elements.editorValue.selectionStart
    const end = elements.editorValue.selectionEnd
    const value = elements.editorValue.value

    if (e.shiftKey) {
      // Outdent - remove leading spaces from current line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineContent = value.substring(lineStart, end)
      if (lineContent.startsWith('  ')) {
        elements.editorValue.value =
          value.substring(0, lineStart) + value.substring(lineStart + 2)
        elements.editorValue.selectionStart =
          elements.editorValue.selectionEnd = start - 2
      }
    } else {
      // Indent
      elements.editorValue.value =
        value.substring(0, start) + '  ' + value.substring(end)
      elements.editorValue.selectionStart = elements.editorValue.selectionEnd =
        start + 2
    }
    updateJsonStatus()
    updateLineNumbers()
    updateSyntaxHighlight()
  } else if (e.key === 'Enter') {
    // Auto-indent on Enter
    e.preventDefault()
    const start = elements.editorValue.selectionStart
    const value = elements.editorValue.value
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const currentLine = value.substring(lineStart, start)
    const indent = currentLine.match(/^\s*/)[0]

    // Check if we should add extra indent (after { or [)
    const charBefore = value[start - 1]
    const charAfter = value[start]
    let newIndent = indent
    let insertAfter = ''

    if (charBefore === '{' || charBefore === '[') {
      newIndent += '  '
      // If the closing bracket is right after, put it on new line with less indent
      if (
        (charBefore === '{' && charAfter === '}') ||
        (charBefore === '[' && charAfter === ']')
      ) {
        insertAfter = '\n' + indent
      }
    }

    elements.editorValue.value =
      value.substring(0, start) +
      '\n' +
      newIndent +
      insertAfter +
      value.substring(start)
    elements.editorValue.selectionStart = elements.editorValue.selectionEnd =
      start + 1 + newIndent.length
    updateJsonStatus()
    updateLineNumbers()
    updateSyntaxHighlight()
  } else if (e.key === '}' || e.key === ']') {
    // Auto-outdent closing brackets
    const start = elements.editorValue.selectionStart
    const value = elements.editorValue.value
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const beforeCursor = value.substring(lineStart, start)

    // If the line only has whitespace before cursor, outdent
    if (/^\s*$/.test(beforeCursor) && beforeCursor.length >= 2) {
      e.preventDefault()
      elements.editorValue.value =
        value.substring(0, lineStart) +
        beforeCursor.substring(2) +
        e.key +
        value.substring(start)
      elements.editorValue.selectionStart = elements.editorValue.selectionEnd =
        start - 2 + 1
      updateJsonStatus()
      updateLineNumbers()
      updateSyntaxHighlight()
    }
  }
})

// Sync scroll between textarea and syntax highlight
elements.editorValue.addEventListener('input', () => {
  updateJsonStatus()
  updateLineNumbers()
  updateSyntaxHighlight()
})

// Line numbers
function updateLineNumbers() {
  const lines = elements.editorValue.value.split('\n').length || 1
  let content = ''
  for (let i = 1; i <= lines; i += 1) {
    content += `${i}\n`
  }
  elements.lineNumbers.textContent = content
}

function updateSyntaxHighlight() {
  const syntaxHighlight = document.getElementById('syntax-highlight')
  if (!syntaxHighlight) return

  const value = elements.editorValue.value || ''
  if (!value) {
    syntaxHighlight.innerHTML = ''
    return
  }

  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const highlighted = escaped
    // Strings and keys
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)?/g, (match, str, colon) => {
      if (colon) {
        return `<span class="json-key">${str}</span>${colon}`
      }
      return `<span class="json-string">${str}</span>`
    })
    // Numbers
    .replace(
      /\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
      '<span class="json-number">$1</span>'
    )
    // Booleans
    .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
    // Null
    .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
    // Brackets and braces
    .replace(/([{}\[\]])/g, '<span class="json-bracket">$1</span>')

  syntaxHighlight.innerHTML = highlighted + '\n'
}

function updateJsonStatus() {
  const value = elements.editorValue.value.trim()
  if (!value) {
    elements.jsonStatus.textContent = ''
    elements.jsonStatus.className = 'json-status'
    return
  }

  const validation = validateJson(value)
  if (validation.valid) {
    elements.jsonStatus.textContent = '✓ Valid JSON'
    elements.jsonStatus.className = 'json-status valid'
  } else {
    elements.jsonStatus.textContent = '✗ Invalid JSON'
    elements.jsonStatus.className = 'json-status invalid'
  }
}

// ============ Modal Close Handlers ============

document.querySelectorAll('.modal-close, .modal-backdrop').forEach((el) => {
  el.addEventListener('click', () => {
    document
      .querySelectorAll('.modal')
      .forEach((m) => m.classList.remove('active'))
  })
})

// ============ Initialize ============

document.addEventListener('DOMContentLoaded', () => {
  loadCredentials()
  updateLineNumbers()
  updateSyntaxHighlight()

  // Auto-validate if credentials exist
  if (state.apiKey && state.universeId) {
    elements.btnValidate.click()
  }
})
