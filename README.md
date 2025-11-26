# Roblox Datastore Editor

A desktop application for externally editing Roblox Datastores using the Open Cloud API.

## Features

- **API Key Validation** - Verify your Open Cloud API key is working correctly
- **Browse Datastores** - View all datastores in your game
- **View Entries** - List all keys in a datastore with search/filter support
- **Edit Entries** - Full JSON editor with formatting and validation
- **Add New Entries** - Create new datastore entries
- **Delete Entries** - Remove entries with confirmation
- **User IDs & Attributes** - Support for optional metadata fields
- **Dark Theme** - Matches the Roblox Creator Hub design

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
   - **Datastores** with Read and Write access
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
5. Once connected, you can navigate to Datastores and Editor tabs

### Browsing Datastores

1. Go to the **Datastores** tab
2. Click on any datastore card to view its entries
3. Use the search box to filter datastores
4. Click "Add Entry" to create a new key

### Editing Entries

1. Click "Edit" on any entry, or go to the **Editor** tab
2. The JSON editor supports:
   - Syntax validation (shows valid/invalid status)
   - Format JSON (pretty print)
   - Minify JSON (compact)
3. Optionally add User IDs and Attributes
4. Click "Save Entry" to update

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

This application uses the [Roblox Open Cloud Datastores API](https://create.roblox.com/docs/cloud/open-cloud/data-store-api).

### Endpoints Used

- `GET /datastores/v1/universes/{universeId}/standard-datastores` - List datastores
- `GET /datastores/v1/universes/{universeId}/standard-datastores/datastore/entries` - List entries
- `GET /datastores/v1/universes/{universeId}/standard-datastores/datastore/entries/entry` - Get entry
- `POST /datastores/v1/universes/{universeId}/standard-datastores/datastore/entries/entry` - Set entry
- `DELETE /datastores/v1/universes/{universeId}/standard-datastores/datastore/entries/entry` - Delete entry

## License

MIT License

## Disclaimer

This is an unofficial tool and is not affiliated with Roblox Corporation. Use at your own risk. Always backup your data before making changes.
