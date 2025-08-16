# Stremio FTP Subtitles Addon

A Stremio addon that serves subtitles from your FTP server with automatic matching.

## Features

- 🗂️ **FTP Integration**: Connect to any FTP/FTPS server
- 🎯 **Smart Matching**: Automatic subtitle matching by filename, year, season/episode
- 🌍 **Multi-language**: Supports multiple subtitle formats (.srt, .vtt, .ass, .ssa, .sub)
- ⚡ **Fast Caching**: File listing cache for better performance
- 🔒 **Encrypted Storage**: FTP credentials stored with AES-256-GCM encryption (highest security)
- 🛡️ **Security**: Per-user configurations with secure persistent storage
- 🎨 **Easy Setup**: Web-based configuration with connection testing

## Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/chensiyue98/stremio-ftp-subtitles)

### Manual Deployment

1. **Fork this repository**
2. **Connect to Render**:
   - Go to [render.com](https://render.com)
   - Create new Web Service
   - Connect your GitHub repository
3. **Configure**:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`
   - Plan: `Free`
4. **Add Disk Storage** (for persistence):
   - Name: `addon-data`
   - Mount Path: `/app/data`
   - Size: 1GB

## Usage

1. Visit your deployed addon URL (e.g., `https://your-app.onrender.com`)
2. Configure your FTP server credentials
3. Test the connection
4. Copy the generated manifest URL
5. Install in Stremio: `stremio://your-manifest-url`

## Local Development

```bash
git clone https://github.com/chensiyue98/stremio-ftp-subtitles.git
cd stremio-ftp-subtitles
npm install
npm start
```

Visit `http://localhost:7777/configure` to set up your FTP credentials.

## Environment Variables

- `PORT` - Server port (default: 7777)
- `PUBLIC_URL` - Your public addon URL (auto-detected on Render)
- `NODE_ENV` - Environment mode

## Supported Subtitle Formats

- `.srt` - SubRip
- `.vtt` - WebVTT
- `.ass` - Advanced SSA
- `.ssa` - Sub Station Alpha
- `.sub` - Various subtitle formats

## Language Detection

The addon automatically detects subtitle language from filenames:
- Chinese: `zh`, `chs`, `sc`, `chi`, `cn`, `chinese`
- English: `en`, `eng`, `english`
- Spanish: `es`, `spa`, `spanish`
- French: `fr`, `fre`, `fra`, `french`
- German: `de`, `ger`, `deu`, `german`
- Portuguese: `pt`, `por`, `portuguese`
- Russian: `ru`, `rus`, `russian`

## Troubleshooting

### Connection Issues
- Verify FTP credentials and server accessibility
- Check if your FTP server supports the connection type (FTP vs FTPS)
- Ensure the base directory path is correct

### No Subtitles Found
- Check if subtitle files exist in the configured directory
- Verify file extensions are supported
- Check FTP server permissions

### Performance Issues
- Reduce `MAX_DEPTH` for large directory structures
- Consider organizing subtitles in shallower folder hierarchies

## License

MIT License - see [LICENSE](LICENSE) file for details.
