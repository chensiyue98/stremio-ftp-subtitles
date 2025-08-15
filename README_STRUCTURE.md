# Project Structure

This project has been refactored into a modular structure for better maintainability:

## Directory Structure

```
stremio-ftp-subtitles/
├── main.js                 # New entry point
├── index.js                # Legacy monolithic file (kept for reference)
├── package.json            # Updated to use main.js
├── src/
│   ├── config.js           # Configuration constants
│   ├── server.js           # HTTP server setup
│   ├── utils/
│   │   ├── helpers.js      # Utility functions
│   │   └── storage.js      # In-memory storage management
│   ├── services/
│   │   ├── addon.js        # Addon runtime creation
│   │   ├── cinemeta.js     # Cinemeta API integration
│   │   └── ftp.js          # FTP operations
│   ├── routes/
│   │   ├── addon.js        # Addon-related routes (manifest, subtitles, file proxy)
│   │   ├── configure.js    # Configuration routes
│   │   └── ftp-test.js     # FTP testing routes
│   └── templates/
│       └── html.js         # HTML page templates
└── README_STRUCTURE.md     # This file
```

## Module Descriptions

### Core Files
- **main.js**: New entry point that starts the server with graceful shutdown handling
- **src/config.js**: Centralized configuration with all constants and environment variables
- **src/server.js**: HTTP server creation and request routing logic

### Utilities
- **src/utils/helpers.js**: Pure utility functions (slugify, language detection, scoring, etc.)
- **src/utils/storage.js**: In-memory storage operations (configs, runtimes, cache)

### Services
- **src/services/addon.js**: Creates addon runtimes with manifest and subtitle handlers
- **src/services/cinemeta.js**: Handles metadata fetching from Cinemeta API
- **src/services/ftp.js**: FTP connection testing, file listing, and downloading

### Routes
- **src/routes/configure.js**: Configuration page handlers (GET/POST for both root and user-specific)
- **src/routes/ftp-test.js**: FTP connection testing endpoints
- **src/routes/addon.js**: Addon-related endpoints (manifest, subtitles, file proxy)

### Templates
- **src/templates/html.js**: HTML page generation (configuration forms, success pages)

## Usage

```bash
# Start with new modular structure
npm start

# For development
npm run dev

# Run legacy monolithic version
npm run legacy
```

## Benefits of This Structure

1. **Separation of Concerns**: Each module has a single responsibility
2. **Easier Testing**: Individual modules can be tested in isolation
3. **Better Maintainability**: Changes are localized to specific modules
4. **Code Reusability**: Utility functions and services can be easily reused
5. **Clearer Dependencies**: Module dependencies are explicit through require statements
6. **Easier Debugging**: Issues can be traced to specific modules
7. **Future Scalability**: New features can be added as new modules without affecting existing code

## Migration Notes

- The original `index.js` is preserved for reference and can be run with `npm run legacy`
- All functionality remains the same; only the code organization has changed
- The new structure follows Node.js best practices for project organization
- Environment variables and configuration remain unchanged
