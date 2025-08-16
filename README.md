# Stremio Google Drive Subtitles Addon

A Stremio addon that serves subtitles from a Google Drive folder with automatic matching.

## Features

- 📁 **Google Drive integration**: connect a folder and authorize access
- 🎯 **Smart matching**: automatic subtitle matching by filename, year, season/episode
- 🌍 **Multi-language**: supports `.srt`, `.vtt`, `.ass`, `.ssa`, and `.sub`
- 🔒 **Encrypted storage**: configuration and tokens stored with AES-256-GCM
- 🎨 **Easy setup**: web-based configuration with a "Connect to Google Drive" button

## Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/chensiyue98/stremio-ftp-subtitles)

### Manual Deployment

1. **Fork this repository**
2. **Connect to Render** and create a new Web Service
3. **Configure**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`
   - Plan: `Free`
4. **Set Environment Variables**
   - `ENCRYPTION_KEY`: 32-byte base64 key
5. **Add Disk Storage**
   - Name: `addon-data`
   - Mount Path: `/app/data`
   - Size: 1GB

## Usage

1. Visit your deployed addon URL (e.g., `https://your-app.onrender.com`)
2. Enter your Google Drive folder ID and save
3. Click **Connect to Google Drive** and grant access
4. Copy the generated manifest URL
5. Install in Stremio: `stremio://<manifest-url>`

## Local Development

```bash
npm install
npm start
```

Visit `http://localhost:7777/configure` to set up your Google Drive folder.

## Environment Variables

- `PORT` - Server port (default: 7777)
- `PUBLIC_URL` - Public addon URL
- `NODE_ENV` - Environment mode
- `ENCRYPTION_KEY` - **Required** base64 encoded 32-byte encryption key

## Supported Subtitle Formats

- `.srt`
- `.vtt`
- `.ass`
- `.ssa`
- `.sub`

## License

MIT License - see [LICENSE](LICENSE) file for details.
