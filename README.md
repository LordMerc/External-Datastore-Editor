# Roblox Cloud Manager

A powerful desktop application for managing Roblox Open Cloud services including Datastores and MessagingService.

![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### 📦 Datastore Management

- **Browse Datastores** - View all datastores in your game with search/filter
- **View Entries** - List all keys in a datastore with pagination support
- **Edit Entries** - Full JSON editor with syntax highlighting and validation
- **Add New Entries** - Create new datastore entries with User IDs & Attributes
- **Delete Entries** - Remove entries with confirmation dialogs
- **Version History** - View and restore previous versions of entries

### 📨 Messaging Service

- **Send Messages** - Broadcast cross-server messages to topics
- **Saved Topics** - Save frequently used topic names for quick access
- **Message Templates** - Create and reuse message templates
- **Message History** - Track sent messages with success/failure status

### ⚙️ Settings & Customization

- **Customizable Keyboard Shortcuts** - Configure all keybinds to your preference
- **API Permissions Checker** - Verify your API key has the required scopes
- **Dark Theme** - Clean dark interface matching Roblox Creator Hub

### ⌨️ Keyboard Shortcuts

| Shortcut       | Action                |
| -------------- | --------------------- |
| `Ctrl+1-5`     | Navigate between tabs |
| `Ctrl+S`       | Save entry            |
| `Ctrl+Shift+F` | Format JSON           |
| `Ctrl+Shift+M` | Minify JSON           |
| `Ctrl+R`       | Refresh datastores    |
| `?`            | Show shortcuts help   |
| `Escape`       | Close modals          |

_All shortcuts are customizable in Settings!_

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Roblox account with access to Creator Dashboard
- An Open Cloud API key with Datastore permissions

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the application:
   ```bash
   npm start
   ```

### Getting Your API Key

1. Go to [Creator Dashboard](https://create.roblox.com) → **Credentials**
2. Click **Create API Key**
3. Name your key (e.g., "Datastore Editor")
4. Under **Access Permissions**, add:
   - **universe-datastores** - Read, Write, List, Delete access
   - **universe-messaging-service** - Publish access (for messaging features)
5. Add your Universe ID to the allowed experiences
6. Set IP restrictions (use `0.0.0.0/0` to allow all IPs for local development)
7. Copy the generated API key

### Finding Your Universe ID

1. Go to [Creator Dashboard](https://create.roblox.com)
2. Click on your game
3. Look at the URL - it contains the Universe ID
   - Example: `https://create.roblox.com/dashboard/creations/experiences/123456789/overview`
   - The Universe ID is `123456789`

## Usage

### Connecting

1. Launch the application
2. Enter your Open Cloud API Key
3. Enter your Universe ID
4. Click "Validate Connection"
5. The API Permissions Checklist will show which features are available
6. Once connected, navigate using the sidebar tabs

### Browsing Datastores

1. Go to the **Datastores** tab
2. Click on any datastore card to view its entries
3. Use the search box to filter datastores
4. Click "Add Entry" to create a new key
5. Click the history icon on any entry to view version history

### Editing Entries

1. Click "Edit" on any entry, or go to the **Editor** tab
2. The JSON editor supports:
   - Syntax highlighting with line numbers
   - Real-time validation (shows valid/invalid status)
   - Format JSON (pretty print)
   - Minify JSON (compact)
3. Optionally add User IDs and Attributes
4. Click "Save Entry" to update

### Messaging Service

1. Go to the **Messaging** tab
2. Save frequently used topics for quick access
3. Create message templates for common messages
4. Select a topic, enter your message, and click "Send Message"
5. View message history to track sent messages

### Settings

1. Go to the **Settings** tab
2. Click on any keyboard shortcut to customize it
3. Press your desired key combination
4. Click "Reset to Defaults" to restore original shortcuts

## Building for Distribution

To create a distributable package:

```bash
npm run build
```

This will create installers in the `dist` folder.

## Tech Stack

- **Electron** - Desktop application framework
- **Axios** - HTTP client for API requests
- **Vanilla JavaScript** - No frameworks, lightweight and fast

## API Reference

This application uses the [Roblox Open Cloud APIs](https://create.roblox.com/docs/cloud/open-cloud).

### Endpoints Used

**Datastores API:**

- `GET /datastores/v1/universes/{universeId}/standard-datastores` - List datastores
- `GET /datastores/v1/universes/{universeId}/standard-datastores/datastore/entries` - List entries
- `GET /datastores/v1/universes/{universeId}/standard-datastores/datastore/entries/entry` - Get entry
- `POST /datastores/v1/universes/{universeId}/standard-datastores/datastore/entries/entry` - Set entry
- `DELETE /datastores/v1/universes/{universeId}/standard-datastores/datastore/entries/entry` - Delete entry
- `GET /datastores/v1/universes/{universeId}/standard-datastores/datastore/entries/entry/versions` - List versions

**Messaging Service API:**

- `POST /messaging-service/v1/universes/{universeId}/topics/{topic}` - Publish message

## Screenshots

_Coming soon!_

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Disclaimer

This is an unofficial tool and is not affiliated with Roblox Corporation. Use at your own risk. Always backup your data before making changes.
