# Project Structure

This project has been refactored into a modular structure for better maintainability:

## Directory Structure

```
stremio-ftp-subtitles/
├── index.js                # Main entry point
├── main.js                 # Alternative entry point
├── package.json            # Node.js package configuration
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── Dockerfile              # Docker container configuration
├── docker-compose.yml      # Docker Compose setup
├── render.yaml             # Render.com deployment configuration
├── ENCRYPTION_SETUP.md     # Encryption setup guide
├── README.md               # Main project documentation
├── data/
│   ├── .gitkeep            # Keeps data directory in git
│   ├── cache.json          # Runtime cache data
│   └── configs.json        # User configurations
├── src/
│   ├── config.js           # Configuration constants
│   ├── server.js           # HTTP server setup
│   ├── utils/
│   │   ├── helpers.js      # Utility functions
│   │   └── storage.js      # Encrypted storage management
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
- **index.js**: Main entry point for the application
- **main.js**: Alternative entry point (kept for reference)
- **src/config.js**: Centralized configuration with all constants and environment variables
- **src/server.js**: HTTP server creation and request routing logic

### Utilities
- **src/utils/helpers.js**: Pure utility functions (slugify, language detection, scoring, etc.)
- **src/utils/storage.js**: Encrypted file-based storage operations (configs, runtimes, cache) with AES-256-GCM

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

### Configuration & Deployment
- **.env.example**: Template for environment variables configuration
- **Dockerfile**: Container configuration for Docker deployment
- **docker-compose.yml**: Multi-container Docker application setup
- **render.yaml**: Deployment configuration for Render.com platform
- **ENCRYPTION_SETUP.md**: Detailed guide for setting up encryption features

### Data Directory
- **data/.gitkeep**: Ensures the data directory is tracked in Git
- **data/cache.json**: Runtime cache for improved performance
- **data/configs.json**: Encrypted storage for user configurations

## Usage

```bash
# Start the application
npm start

# For development (with auto-restart)
npm run dev

# Test encryption functionality
npm run test-encryption
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

- The project has been refactored into a modular structure while maintaining `index.js` as the main entry point
- `main.js` serves as an alternative entry point with additional features
- All functionality remains the same; only the code organization has been improved
- The new structure follows Node.js best practices for project organization
- Environment variables and configuration remain unchanged
- Added comprehensive Docker support with `Dockerfile` and `docker-compose.yml`
- Included deployment configuration for Render.com via `render.yaml`
