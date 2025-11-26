// ============================================
// Roblox Datastore Editor - Renderer Process
// ============================================

// Default Keybinds Configuration
const DEFAULT_KEYBINDS = {
  goToConnection: { ctrl: true, shift: false, key: '1' },
  goToDatastores: { ctrl: true, shift: false, key: '2' },
  goToEditor: { ctrl: true, shift: false, key: '3' },
  goToMessaging: { ctrl: true, shift: false, key: '4' },
  goToSettings: { ctrl: true, shift: false, key: '5' },
  saveEntry: { ctrl: true, shift: false, key: 's' },
  formatJson: { ctrl: true, shift: true, key: 'f' },
  minifyJson: { ctrl: true, shift: true, key: 'm' },
  refreshDatastores: { ctrl: true, shift: false, key: 'r' },
  showShortcuts: { ctrl: false, shift: false, key: '?' },
}

// Current keybinds (loaded from localStorage or defaults)
let keybinds = { ...DEFAULT_KEYBINDS }

function loadKeybinds() {
  try {
    const saved = localStorage.getItem('keybinds')
    if (saved) {
      keybinds = { ...DEFAULT_KEYBINDS, ...JSON.parse(saved) }
    }
  } catch {
    keybinds = { ...DEFAULT_KEYBINDS }
  }
}

function saveKeybinds() {
  try {
    localStorage.setItem('keybinds', JSON.stringify(keybinds))
  } catch {}
}

function resetKeybinds() {
  keybinds = { ...DEFAULT_KEYBINDS }
  saveKeybinds()
  renderKeybindSettings()
  showToast('success', 'Keybinds Reset', 'All shortcuts restored to defaults')
}

// Load keybinds on startup
loadKeybinds()

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
  pendingDeleteTopicIndex: null, // Index of topic pending deletion
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

  // Messaging
  messagingTopicSelect: document.getElementById('messaging-topic-select'),
  messagingTopic: document.getElementById('messaging-topic'),
  btnToggleTopicInput: document.getElementById('btn-toggle-topic-input'),
  btnAddTopic: document.getElementById('btn-add-topic'),
  savedTopicsList: document.getElementById('saved-topics-list'),
  topicsEmpty: document.getElementById('topics-empty'),
  messagingContent: document.getElementById('messaging-content'),
  messageCharCount: document.getElementById('message-char-count'),
  btnSendMessage: document.getElementById('btn-send-message'),
  btnClearMessage: document.getElementById('btn-clear-message'),
  messagingAlert: document.getElementById('messaging-alert'),
  messageHistory: document.getElementById('message-history'),
  historyEmpty: document.getElementById('history-empty'),
  btnClearHistory: document.getElementById('btn-clear-history'),

  // Add Topic Modal
  modalAddTopic: document.getElementById('modal-add-topic'),
  addTopicInput: document.getElementById('add-topic-input'),
  btnConfirmAddTopic: document.getElementById('btn-confirm-add-topic'),

  // Delete Topic Modal
  modalDeleteTopic: document.getElementById('modal-delete-topic'),
  deleteTopicName: document.getElementById('delete-topic-name'),
  btnConfirmDeleteTopic: document.getElementById('btn-confirm-delete-topic'),

  // Shortcuts Modal
  modalShortcuts: document.getElementById('modal-shortcuts'),

  // Settings
  btnResetKeybinds: document.getElementById('btn-reset-keybinds'),
  linkGithub: document.getElementById('link-github'),

  // Permissions
  permissionsCard: document.getElementById('permissions-card'),
  permissionsList: document.getElementById('permissions-list'),
  btnRecheckPermissions: document.getElementById('btn-recheck-permissions'),
  permDatastoresRead: document.getElementById('perm-datastores-read'),
  permDatastoresWrite: document.getElementById('perm-datastores-write'),
  permDatastoresDelete: document.getElementById('perm-datastores-delete'),
  permDatastoresList: document.getElementById('perm-datastores-list'),
  permMessaging: document.getElementById('perm-messaging'),

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

    // Check permissions after successful connection
    checkAllPermissions()
  } else {
    updateConnectionStatus(false)
    showAlert(elements.connectionAlert, 'error', result.message)
    showToast('error', 'Connection Failed', result.message)
    // Hide permissions card on failed connection
    if (elements.permissionsCard) {
      elements.permissionsCard.style.display = 'none'
    }
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
  // Hide permissions card
  if (elements.permissionsCard) {
    elements.permissionsCard.style.display = 'none'
  }
})

// ============ Permission Checking ============

function updatePermissionItem(element, status) {
  if (!element) return

  const iconSpan = element.querySelector('.permission-icon')
  const statusSpan = element.querySelector('.permission-status')

  // Remove existing classes
  iconSpan.className = 'permission-icon'

  if (status === true) {
    iconSpan.classList.add('granted')
    iconSpan.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>`
    statusSpan.textContent = 'Granted'
    statusSpan.className = 'permission-status granted'
  } else if (status === false) {
    iconSpan.classList.add('denied')
    iconSpan.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M15 9l-6 6M9 9l6 6"/>
    </svg>`
    statusSpan.textContent = 'Not Granted'
    statusSpan.className = 'permission-status denied'
  } else {
    // Unknown status
    iconSpan.classList.add('unknown')
    iconSpan.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`
    statusSpan.textContent = 'Cannot Verify'
    statusSpan.className = 'permission-status unknown'
  }
}

function resetPermissionItems() {
  const items = [
    elements.permDatastoresRead,
    elements.permDatastoresWrite,
    elements.permDatastoresDelete,
    elements.permDatastoresList,
    elements.permMessaging,
  ]

  items.forEach((item) => {
    if (!item) return
    const iconSpan = item.querySelector('.permission-icon')
    const statusSpan = item.querySelector('.permission-status')
    iconSpan.className = 'permission-icon pending'
    iconSpan.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
    </svg>`
    statusSpan.textContent = 'Checking...'
    statusSpan.className = 'permission-status'
  })
}

async function checkAllPermissions() {
  if (!state.isConnected) return

  // Show permissions card
  if (elements.permissionsCard) {
    elements.permissionsCard.style.display = 'block'
  }

  // Reset all to pending
  resetPermissionItems()

  // Check each permission in parallel
  const [listResult, readResult, writeResult, deleteResult, messagingResult] =
    await Promise.all([
      window.electronAPI.checkPermissionList(state.apiKey, state.universeId),
      window.electronAPI.checkPermissionRead(state.apiKey, state.universeId),
      window.electronAPI.checkPermissionWrite(state.apiKey, state.universeId),
      window.electronAPI.checkPermissionDelete(state.apiKey, state.universeId),
      window.electronAPI.checkPermissionMessaging(
        state.apiKey,
        state.universeId
      ),
    ])

  // Update UI
  updatePermissionItem(elements.permDatastoresList, listResult.hasPermission)
  updatePermissionItem(elements.permDatastoresRead, readResult.hasPermission)
  updatePermissionItem(elements.permDatastoresWrite, writeResult.hasPermission)
  updatePermissionItem(
    elements.permDatastoresDelete,
    deleteResult.hasPermission
  )
  updatePermissionItem(elements.permMessaging, messagingResult.hasPermission)
}

// Recheck permissions button
if (elements.btnRecheckPermissions) {
  elements.btnRecheckPermissions.addEventListener('click', () => {
    checkAllPermissions()
  })
}

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

// ============ Messaging Service ============

// Message history state
let messageHistory = []

// Saved topics state
let savedTopics = []

function loadMessageHistory() {
  try {
    const raw = localStorage.getItem('messageHistory')
    if (raw) messageHistory = JSON.parse(raw)
  } catch {
    messageHistory = []
  }
}

function saveMessageHistory() {
  try {
    localStorage.setItem('messageHistory', JSON.stringify(messageHistory))
  } catch {}
}

function loadSavedTopics() {
  try {
    const raw = localStorage.getItem('savedTopics')
    if (raw) savedTopics = JSON.parse(raw)
  } catch {
    savedTopics = []
  }
}

function saveSavedTopics() {
  try {
    localStorage.setItem('savedTopics', JSON.stringify(savedTopics))
  } catch {}
}

function renderSavedTopics() {
  if (!elements.savedTopicsList) return

  // Update dropdown
  updateTopicDropdown()

  if (savedTopics.length === 0) {
    if (elements.topicsEmpty) elements.topicsEmpty.style.display = 'flex'
    // Remove any topic items
    const items = elements.savedTopicsList.querySelectorAll('.saved-topic-item')
    items.forEach((item) => item.remove())
    return
  }

  if (elements.topicsEmpty) elements.topicsEmpty.style.display = 'none'

  // Clear existing items
  const existingItems =
    elements.savedTopicsList.querySelectorAll('.saved-topic-item')
  existingItems.forEach((item) => item.remove())

  // Render topics
  savedTopics.forEach((topic, index) => {
    const item = document.createElement('div')
    item.className = 'saved-topic-item'
    item.innerHTML = `
      <span class="topic-name">${escapeHtml(topic)}</span>
      <div class="topic-actions">
        <button class="btn btn-sm btn-icon btn-use-topic" title="Use this topic" data-index="${index}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-icon btn-danger btn-delete-topic" title="Delete topic" data-index="${index}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `

    // Use topic button
    item.querySelector('.btn-use-topic').addEventListener('click', (e) => {
      e.stopPropagation()
      selectTopic(topic)
    })

    // Delete topic button - show confirmation modal
    item.querySelector('.btn-delete-topic').addEventListener('click', (e) => {
      e.stopPropagation()
      showDeleteTopicModal(index)
    })

    // Click on item to select
    item.addEventListener('click', () => {
      selectTopic(topic)
    })

    elements.savedTopicsList.appendChild(item)
  })
}

function updateTopicDropdown() {
  if (!elements.messagingTopicSelect) return

  // Clear existing options except first two
  while (elements.messagingTopicSelect.options.length > 2) {
    elements.messagingTopicSelect.remove(2)
  }

  // Add saved topics
  savedTopics.forEach((topic) => {
    const option = document.createElement('option')
    option.value = topic
    option.textContent = topic
    elements.messagingTopicSelect.appendChild(option)
  })
}

function selectTopic(topic) {
  // Switch to dropdown mode and select the topic
  setTopicInputMode('dropdown')

  if (elements.messagingTopicSelect) {
    // Check if topic exists in dropdown
    const options = Array.from(elements.messagingTopicSelect.options)
    const exists = options.some((opt) => opt.value === topic)

    if (exists) {
      elements.messagingTopicSelect.value = topic
    } else {
      // Topic not in dropdown, switch to custom mode
      setTopicInputMode('custom')
      if (elements.messagingTopic) {
        elements.messagingTopic.value = topic
      }
    }
  }

  // Also set the hidden input
  if (elements.messagingTopic) {
    elements.messagingTopic.value = topic
  }

  showToast('success', 'Topic Selected', `"${topic}" is ready to use`)
}

function addTopic(topicName) {
  const topic = topicName.trim()
  if (!topic) {
    showToast('error', 'Invalid Topic', 'Please enter a topic name')
    return false
  }
  if (topic.length > 80) {
    showToast(
      'error',
      'Topic Too Long',
      'Topic name must be 80 characters or less'
    )
    return false
  }
  if (savedTopics.includes(topic)) {
    showToast('warning', 'Topic Exists', 'This topic is already saved')
    return false
  }

  savedTopics.push(topic)
  saveSavedTopics()
  renderSavedTopics()
  showToast('success', 'Topic Added', `"${topic}" has been saved`)
  return true
}

function deleteTopic(index) {
  const topic = savedTopics[index]
  savedTopics.splice(index, 1)
  saveSavedTopics()
  renderSavedTopics()
  showToast('success', 'Topic Deleted', `"${topic}" has been removed`)
}

function showDeleteTopicModal(index) {
  state.pendingDeleteTopicIndex = index
  const topic = savedTopics[index]
  if (elements.deleteTopicName) {
    elements.deleteTopicName.textContent = topic
  }
  if (elements.modalDeleteTopic) {
    elements.modalDeleteTopic.classList.add('active')
  }
}

function hideDeleteTopicModal() {
  state.pendingDeleteTopicIndex = null
  if (elements.modalDeleteTopic) {
    elements.modalDeleteTopic.classList.remove('active')
  }
}

function confirmDeleteTopic() {
  if (state.pendingDeleteTopicIndex !== null) {
    deleteTopic(state.pendingDeleteTopicIndex)
    hideDeleteTopicModal()
  }
}

function getSelectedTopic() {
  // If custom input is active (visible), use that
  if (elements.messagingTopic?.classList.contains('active')) {
    return elements.messagingTopic.value.trim()
  }
  // Otherwise use dropdown value (but not special values)
  if (elements.messagingTopicSelect) {
    const val = elements.messagingTopicSelect.value
    if (val && val !== '__custom__') {
      return val
    }
  }
  // Fallback to text input value
  return elements.messagingTopic?.value.trim() || ''
}

// Load saved topics on startup
loadSavedTopics()

// Topic dropdown change
if (elements.messagingTopicSelect) {
  elements.messagingTopicSelect.addEventListener('change', (e) => {
    const value = e.target.value
    if (value === '__custom__') {
      // Show custom input, hide dropdown
      setTopicInputMode('custom')
    } else if (value) {
      // Set the value in hidden input for getSelectedTopic
      if (elements.messagingTopic) {
        elements.messagingTopic.value = value
      }
    }
  })
}

// Toggle topic input button
if (elements.btnToggleTopicInput) {
  elements.btnToggleTopicInput.addEventListener('click', () => {
    const isCustomMode = elements.messagingTopic?.classList.contains('active')
    setTopicInputMode(isCustomMode ? 'dropdown' : 'custom')
  })
}

function setTopicInputMode(mode) {
  const selectContainer = document.getElementById('topic-select-container')

  if (mode === 'custom') {
    // Show custom input, hide dropdown
    if (selectContainer) selectContainer.style.display = 'none'
    if (elements.messagingTopic) {
      elements.messagingTopic.classList.add('active')
      elements.messagingTopic.focus()
    }
    if (elements.btnToggleTopicInput) {
      elements.btnToggleTopicInput.classList.add('active')
      elements.btnToggleTopicInput.title = 'Switch to dropdown'
    }
  } else {
    // Show dropdown, hide custom input
    if (selectContainer) selectContainer.style.display = 'block'
    if (elements.messagingTopic) {
      elements.messagingTopic.classList.remove('active')
    }
    if (elements.btnToggleTopicInput) {
      elements.btnToggleTopicInput.classList.remove('active')
      elements.btnToggleTopicInput.title = 'Switch to manual input'
    }
    if (elements.messagingTopicSelect) {
      elements.messagingTopicSelect.value = ''
    }
  }
}

// Add topic button - opens modal
console.log('btnAddTopic element:', elements.btnAddTopic)
if (elements.btnAddTopic) {
  console.log('Attaching click handler to btnAddTopic')
  elements.btnAddTopic.addEventListener('click', () => {
    console.log('Add Topic button clicked!')
    showAddTopicModal()
  })
} else {
  console.error('btnAddTopic element not found!')
}

// Add Topic Modal functions
function showAddTopicModal() {
  if (elements.modalAddTopic) {
    elements.modalAddTopic.classList.add('active')
    if (elements.addTopicInput) {
      elements.addTopicInput.value = ''
      elements.addTopicInput.focus()
    }
  }
}

function hideAddTopicModal() {
  if (elements.modalAddTopic) {
    elements.modalAddTopic.classList.remove('active')
  }
}

// Confirm add topic button
if (elements.btnConfirmAddTopic) {
  elements.btnConfirmAddTopic.addEventListener('click', () => {
    const topic = elements.addTopicInput?.value
    if (topic && topic.trim()) {
      addTopic(topic)
      hideAddTopicModal()
    } else {
      showToast('error', 'Invalid Topic', 'Please enter a topic name')
    }
  })
}

// Close modal on close button or overlay click
if (elements.modalAddTopic) {
  elements.modalAddTopic.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', hideAddTopicModal)
  })
  elements.modalAddTopic.addEventListener('click', (e) => {
    if (e.target === elements.modalAddTopic) {
      hideAddTopicModal()
    }
  })
  // Submit on Enter key
  if (elements.addTopicInput) {
    elements.addTopicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        elements.btnConfirmAddTopic?.click()
      }
    })
  }
}

// Delete Topic Modal event listeners
if (elements.btnConfirmDeleteTopic) {
  elements.btnConfirmDeleteTopic.addEventListener('click', confirmDeleteTopic)
}

if (elements.modalDeleteTopic) {
  elements.modalDeleteTopic.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', hideDeleteTopicModal)
  })
  elements.modalDeleteTopic.addEventListener('click', (e) => {
    if (e.target === elements.modalDeleteTopic) {
      hideDeleteTopicModal()
    }
  })
}

// Shortcuts Modal
function showShortcutsModal() {
  if (elements.modalShortcuts) {
    elements.modalShortcuts.classList.add('active')
  }
}

function hideShortcutsModal() {
  if (elements.modalShortcuts) {
    elements.modalShortcuts.classList.remove('active')
  }
}

if (elements.modalShortcuts) {
  elements.modalShortcuts.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', hideShortcutsModal)
  })
  elements.modalShortcuts.addEventListener('click', (e) => {
    if (e.target === elements.modalShortcuts) {
      hideShortcutsModal()
    }
  })
}

// ============ Keyboard Shortcuts ============

// Helper to check if a key event matches a keybind
function matchesKeybind(e, keybind) {
  if (!keybind) return false
  const keyMatch =
    e.key.toLowerCase() === keybind.key.toLowerCase() ||
    (keybind.key === '?' && e.key === '?')
  return keyMatch && e.ctrlKey === keybind.ctrl && e.shiftKey === keybind.shift
}

// Helper to format keybind for display
function formatKeybind(keybind) {
  if (!keybind) return ''
  const parts = []
  if (keybind.ctrl) parts.push('<kbd>Ctrl</kbd>')
  if (keybind.shift) parts.push('<kbd>Shift</kbd>')
  parts.push(`<kbd>${keybind.key.toUpperCase()}</kbd>`)
  return parts.join(' + ')
}

// Render keybind settings in the Settings tab
function renderKeybindSettings() {
  const keybindRows = document.querySelectorAll('.keybind-row')
  keybindRows.forEach((row) => {
    const action = row.dataset.action
    const keysSpan = row.querySelector('.keybind-keys')
    if (keysSpan && keybinds[action]) {
      keysSpan.innerHTML = formatKeybind(keybinds[action])
    }
  })
}

// Keybind recording state
let recordingKeybind = null

function startRecordingKeybind(action, button) {
  // Stop any existing recording
  stopRecordingKeybind()

  recordingKeybind = action
  button.classList.add('recording')
  button.querySelector('.keybind-keys').innerHTML = '<em>Press keys...</em>'
}

function stopRecordingKeybind() {
  if (recordingKeybind) {
    const btn = document.getElementById(`keybind-${recordingKeybind}`)
    if (btn) {
      btn.classList.remove('recording')
      const keysSpan = btn.querySelector('.keybind-keys')
      if (keysSpan) {
        keysSpan.innerHTML = formatKeybind(keybinds[recordingKeybind])
      }
    }
    recordingKeybind = null
  }
}

function recordKeybind(e) {
  if (!recordingKeybind) return

  // Ignore modifier-only presses
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

  e.preventDefault()
  e.stopPropagation()

  // Save the new keybind
  keybinds[recordingKeybind] = {
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    key: e.key.length === 1 ? e.key.toLowerCase() : e.key,
  }

  saveKeybinds()
  stopRecordingKeybind()
  renderKeybindSettings()
  updateShortcutsModal()
  showToast('success', 'Keybind Updated', 'Your new shortcut has been saved')
}

// Update shortcuts help modal with current keybinds
function updateShortcutsModal() {
  const shortcutItems =
    elements.modalShortcuts?.querySelectorAll('.shortcut-item')
  if (!shortcutItems) return

  const actionMap = {
    'Go to Connection': 'goToConnection',
    'Go to Datastores': 'goToDatastores',
    'Go to Editor': 'goToEditor',
    'Go to Messaging': 'goToMessaging',
    'Save Entry': 'saveEntry',
    'Format JSON': 'formatJson',
    'Minify JSON': 'minifyJson',
    'Refresh Datastores': 'refreshDatastores',
    'Show Shortcuts': 'showShortcuts',
  }

  shortcutItems.forEach((item) => {
    const desc = item.querySelector('.shortcut-desc')?.textContent
    const action = actionMap[desc]
    if (action && keybinds[action]) {
      const keysSpan = item.querySelector('.shortcut-keys')
      if (keysSpan) {
        keysSpan.innerHTML = formatKeybind(keybinds[action])
      }
    }
  })
}

// Setup keybind input click handlers
function setupKeybindInputs() {
  const keybindInputs = document.querySelectorAll('.keybind-input')
  keybindInputs.forEach((btn) => {
    const action = btn.closest('.keybind-row')?.dataset.action
    if (action) {
      btn.addEventListener('click', () => {
        startRecordingKeybind(action, btn)
      })
    }
  })
}

// Main keyboard event handler
document.addEventListener('keydown', (e) => {
  // If recording a keybind, handle it separately
  if (recordingKeybind) {
    recordKeybind(e)
    return
  }

  // Don't trigger shortcuts when typing in inputs/textareas
  const activeEl = document.activeElement
  const isTyping =
    activeEl &&
    (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')

  // Escape always closes modals or stops recording
  if (e.key === 'Escape') {
    if (recordingKeybind) {
      stopRecordingKeybind()
      return
    }
    const activeModal = document.querySelector('.modal.active')
    if (activeModal) {
      activeModal.classList.remove('active')
      return
    }
  }

  // Show shortcuts (check even when not typing for ? key)
  if (matchesKeybind(e, keybinds.showShortcuts) && !isTyping) {
    e.preventDefault()
    showShortcutsModal()
    return
  }

  // Skip other shortcuts if typing
  if (isTyping) return

  // Navigation shortcuts
  if (matchesKeybind(e, keybinds.goToConnection)) {
    e.preventDefault()
    document.querySelector('[data-tab="connection"]')?.click()
  } else if (matchesKeybind(e, keybinds.goToDatastores)) {
    e.preventDefault()
    document.querySelector('[data-tab="datastores"]')?.click()
  } else if (matchesKeybind(e, keybinds.goToEditor)) {
    e.preventDefault()
    document.querySelector('[data-tab="editor"]')?.click()
  } else if (matchesKeybind(e, keybinds.goToMessaging)) {
    e.preventDefault()
    document.querySelector('[data-tab="messaging"]')?.click()
  } else if (matchesKeybind(e, keybinds.goToSettings)) {
    e.preventDefault()
    document.querySelector('[data-tab="settings"]')?.click()
  }

  // Editor shortcuts
  if (matchesKeybind(e, keybinds.saveEntry)) {
    e.preventDefault()
    if (elements.btnSave) {
      elements.btnSave.click()
    }
  } else if (matchesKeybind(e, keybinds.formatJson)) {
    e.preventDefault()
    if (elements.btnFormatJson) {
      elements.btnFormatJson.click()
    }
  } else if (matchesKeybind(e, keybinds.minifyJson)) {
    e.preventDefault()
    if (elements.btnMinifyJson) {
      elements.btnMinifyJson.click()
    }
  }

  // General shortcuts
  if (matchesKeybind(e, keybinds.refreshDatastores)) {
    e.preventDefault()
    if (state.isConnected && elements.btnRefreshDatastores) {
      elements.btnRefreshDatastores.click()
    }
  }
})

// Reset keybinds button
if (elements.btnResetKeybinds) {
  elements.btnResetKeybinds.addEventListener('click', resetKeybinds)
}

// GitHub link
if (elements.linkGithub) {
  elements.linkGithub.addEventListener('click', (e) => {
    e.preventDefault()
    window.electronAPI?.openExternal?.(
      'https://github.com/LordMerc/External-Datastore-Editor'
    ) ||
      window.open(
        'https://github.com/LordMerc/External-Datastore-Editor',
        '_blank'
      )
  })
}

function renderMessageHistory() {
  if (!elements.messageHistory) return

  if (messageHistory.length === 0) {
    elements.historyEmpty.style.display = 'flex'
    // Remove any history items
    const items = elements.messageHistory.querySelectorAll('.history-item')
    items.forEach((item) => item.remove())
    return
  }

  elements.historyEmpty.style.display = 'none'

  // Clear existing items
  const existingItems =
    elements.messageHistory.querySelectorAll('.history-item')
  existingItems.forEach((item) => item.remove())

  // Render history (most recent first)
  messageHistory
    .slice()
    .reverse()
    .forEach((entry) => {
      const item = document.createElement('div')
      item.className = `history-item ${entry.success ? 'success' : 'failed'}`
      item.innerHTML = `
        <div class="history-item-header">
          <span class="history-topic">${escapeHtml(entry.topic)}</span>
          <span class="history-time">${new Date(
            entry.timestamp
          ).toLocaleString()}</span>
          <span class="history-status ${entry.success ? 'success' : 'failed'}">
            ${entry.success ? '✓ Sent' : '✗ Failed'}
          </span>
        </div>
        <div class="history-message">${escapeHtml(
          entry.message.length > 100
            ? entry.message.substring(0, 100) + '...'
            : entry.message
        )}</div>
        ${
          entry.error
            ? `<div class="history-error">${escapeHtml(entry.error)}</div>`
            : ''
        }
      `

      // Click to resend
      item.addEventListener('click', () => {
        selectTopic(entry.topic)
        elements.messagingContent.value = entry.message
        updateMessageCharCount()
        showToast('success', 'Message Loaded', 'You can edit and resend')
      })

      elements.messageHistory.appendChild(item)
    })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function updateMessageCharCount() {
  const count = (elements.messagingContent?.value || '').length
  if (elements.messageCharCount) {
    elements.messageCharCount.textContent = `${count} / 1024`
    elements.messageCharCount.className =
      count > 1024 ? 'char-count over' : 'char-count'
  }
}

// Load message history on startup
loadMessageHistory()

// Message content character count
if (elements.messagingContent) {
  elements.messagingContent.addEventListener('input', updateMessageCharCount)
}

// Clear message form
if (elements.btnClearMessage) {
  elements.btnClearMessage.addEventListener('click', () => {
    // Reset to dropdown mode
    setTopicInputMode('dropdown')
    if (elements.messagingTopic) {
      elements.messagingTopic.value = ''
    }
    elements.messagingContent.value = ''
    updateMessageCharCount()
    hideAlert(elements.messagingAlert)
  })
}

// Clear message history
if (elements.btnClearHistory) {
  elements.btnClearHistory.addEventListener('click', () => {
    messageHistory = []
    saveMessageHistory()
    renderMessageHistory()
    showToast('success', 'History Cleared', 'Message history has been cleared')
  })
}

// Send message
if (elements.btnSendMessage) {
  elements.btnSendMessage.addEventListener('click', async () => {
    if (!state.isConnected) {
      showToast('warning', 'Not Connected', 'Please connect to a game first')
      return
    }

    const topic = getSelectedTopic()
    const message = elements.messagingContent.value

    if (!topic) {
      showAlert(
        elements.messagingAlert,
        'error',
        'Please select or enter a topic name'
      )
      return
    }

    if (topic.length > 80) {
      showAlert(
        elements.messagingAlert,
        'error',
        'Topic name must be 80 characters or less'
      )
      return
    }

    if (!message) {
      showAlert(
        elements.messagingAlert,
        'error',
        'Please enter a message to send'
      )
      return
    }

    if (message.length > 1024) {
      showAlert(
        elements.messagingAlert,
        'error',
        'Message must be 1024 characters or less'
      )
      return
    }

    hideAlert(elements.messagingAlert)
    showLoading('Sending message...')

    const result = await window.electronAPI.publishMessage(
      state.apiKey,
      state.universeId,
      topic,
      message
    )

    hideLoading()

    // Add to history
    messageHistory.push({
      topic,
      message,
      timestamp: Date.now(),
      success: result.success,
      error: result.success ? null : result.message,
    })

    // Keep only last 50 messages
    if (messageHistory.length > 50) {
      messageHistory = messageHistory.slice(-50)
    }

    saveMessageHistory()
    renderMessageHistory()

    if (result.success) {
      showToast('success', 'Message Sent', `Message published to "${topic}"`)
      showAlert(
        elements.messagingAlert,
        'success',
        `Message successfully sent to topic "${topic}"`
      )
    } else {
      showToast('error', 'Send Failed', result.message)
      showAlert(elements.messagingAlert, 'error', result.message)
    }
  })
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
  renderMessageHistory()
  renderSavedTopics()

  // Initialize keybind settings
  renderKeybindSettings()
  setupKeybindInputs()
  updateShortcutsModal()

  // Auto-validate if credentials exist
  if (state.apiKey && state.universeId) {
    elements.btnValidate.click()
  }
})
