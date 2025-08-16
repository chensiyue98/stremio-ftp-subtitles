// storage.js - File-based persistence with whole-file AEAD encryption
// Security model: Entire config file is encrypted with AES-256-GCM
// Individual fields (e.g. Google Drive tokens) are stored as plain text within the encrypted file
// This provides strong security while avoiding dual encryption complexity
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const TAG_LENGTH = 16; // GCM auth tag length

// Get consistent key from base64 encoded environment variable
function getKey() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  // Force require encryption key
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required. Please provide a base64 encoded 32-byte key.');
  }
  
  let key;
  try {
    // Decode base64 to get 32 bytes
    key = Buffer.from(encryptionKey, 'base64');
  } catch (e) {
    throw new Error('Invalid ENCRYPTION_KEY format: must be a valid base64 encoded string');
  }
  
  // Validate key length is exactly 32 bytes
  if (key.length !== 32) {
    throw new Error(`Invalid encryption key length: expected 32 bytes, got ${key.length} bytes. Please provide a base64 encoded 32-byte key.`);
  }
  
  return key;
}

// Encrypt function
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('stremio-drive-addon', 'utf8')); // Additional authenticated data
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (e) {
    console.error('Encryption failed:', e.message);
    throw new Error(`Encryption failed: ${e.message}. Data cannot be stored without encryption.`);
  }
}

// Decrypt function
function decrypt(encryptedData) {
  try {
    if (!encryptedData.includes(':')) {
      // Assume it's plain text from old version
      return encryptedData;
    }
    
    const parts = encryptedData.split(':');
    
        // Handle legacy CBC format (2 parts: iv:encrypted)
    if (parts.length === 2) {
      try {
        const [ivHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const key = getKey();
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (e) {
        console.log('Legacy CBC decryption failed, assuming plain text');
        return encryptedData;
      }
    }
    
    // Handle new GCM format (3 parts: iv:authTag:encrypted)
    if (parts.length === 3) {
      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = getKey();
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAAD(Buffer.from('stremio-drive-addon', 'utf8'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    
    // Unknown format, assume plain text
    return encryptedData;
  } catch (e) {
    console.error('Decryption failed:', e.message);
    return encryptedData; // Return as-is if decryption fails
  }
}

// Legacy field decryption for migration - handles old dual-encrypted data
function migrateLegacyField(encryptedData, fieldName) {
  try {
    if (!encryptedData || !encryptedData.includes(':')) {
      // Plain text - already migrated or never encrypted
      return encryptedData;
    }
    
    const parts = encryptedData.split(':');
    
    // Handle legacy CBC format (2 parts: iv:encrypted)
    if (parts.length === 2) {
      try {
        const [ivHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const key = getKey();
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        console.log(`Migrated legacy CBC encrypted field '${fieldName}' to plain text`);
        return decrypted;
      } catch (e) {
        console.warn(`Failed to migrate legacy CBC field '${fieldName}', treating as plain text:`, e.message);
        return encryptedData;
      }
    }
    
    // Handle legacy GCM format (3 parts: iv:authTag:encrypted)
    if (parts.length === 3) {
      try {
        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = getKey();
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAAD(Buffer.from('stremio-drive-addon', 'utf8'));
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        console.log(`Migrated legacy GCM encrypted field '${fieldName}' to plain text`);
        return decrypted;
      } catch (e) {
        console.warn(`Failed to migrate legacy GCM field '${fieldName}', treating as plain text:`, e.message);
        return encryptedData;
      }
    }
    
    // Unknown format, treat as plain text
    return encryptedData;
  } catch (e) {
    console.warn(`Migration failed for field '${fieldName}', treating as plain text:`, e.message);
    return encryptedData;
  }
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
} else {
  // Ensure correct permissions on existing directory
  fs.chmodSync(DATA_DIR, 0o700);
}

// Atomic write function with proper file permissions
function atomicWriteFile(filePath, data, encoding = 'utf8') {
  const tmpPath = filePath + '.tmp';
  
  try {
    // Write to temporary file first
    fs.writeFileSync(tmpPath, data, encoding);
    
    // Set secure file permissions (owner read/write only)
    fs.chmodSync(tmpPath, 0o600);
    
    // Force sync to disk
    const fd = fs.openSync(tmpPath, 'r+');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    
    // Atomic move to final location
    fs.renameSync(tmpPath, filePath);
    
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError.message);
      }
    }
    throw error;
  }
}

class FileStorage {
  constructor() {
    this.configPath = path.join(DATA_DIR, 'configs.json');
    this.cachePath = path.join(DATA_DIR, 'cache.json');
    
    // Validate encryption system on startup
    this.validateEncryption();
    
    this.configs = this.loadConfigs();
    this.cache = this.loadCache();
    this.runtimes = new Map(); // In-memory runtime storage (not persisted)
    
    // Auto-save periodically
    setInterval(() => this.cleanup(), 60000); // Clean cache every minute
  }

  // Validate encryption system
  validateEncryption() {
    try {
      const testData = 'encryption-test-' + Date.now();
      const encrypted = encrypt(testData);
      const decrypted = decrypt(encrypted);
      
      if (decrypted !== testData) {
        throw new Error('Encryption validation failed: decrypted data does not match original');
      }
      
      console.log('✅ Whole-file AEAD encryption system validated successfully');
    } catch (e) {
      console.error('❌ Encryption system validation failed:', e.message);
      throw new Error(`Critical security error: Encryption system is not working properly. ${e.message}`);
    }
  }

  loadConfigs() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const decryptedData = decrypt(data);
        const parsed = JSON.parse(decryptedData);
        // Convert array back to Map and migrate any legacy encrypted fields to plain text
        const configs = new Map();
        for (const [key, config] of parsed) {
          // Migrate legacy encrypted fields to plain text (only during loading for backward compatibility)
          const migratedConfig = {
            ...config
          };
          configs.set(key, migratedConfig);
        }
        return configs;
      }
    } catch (e) {
      console.error('Failed to load configs:', e.message);
      throw new Error(`Critical error: Cannot load encrypted configurations. ${e.message}. Application cannot start safely.`);
    }
    return new Map();
  }

  saveConfigs() {
    try {
      // Store sensitive fields as plain text - security is provided by whole-file encryption
      const configsToSave = [];
      for (const [key, config] of this.configs) {
        // No field-level encryption needed - store config as-is
        configsToSave.push([key, config]);
      }
      const data = JSON.stringify(configsToSave);
      const encryptedData = encrypt(data);
      atomicWriteFile(this.configPath, encryptedData, 'utf8');
      console.log('✅ Configurations saved and encrypted successfully');
    } catch (e) {
      console.error('Failed to save configs:', e.message);
      throw new Error(`Critical error: Unable to save encrypted configuration. ${e.message}. Configuration changes have been rejected to prevent data corruption.`);
    }
  }

  loadCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf8');
        const cacheData = JSON.parse(data);
        // Convert back to Map and filter expired entries
        const now = Date.now();
        const cache = new Map();
        for (const [key, value] of cacheData) {
          if (value.ts && now - value.ts < 60 * 1000) { // 60 second TTL
            cache.set(key, value);
          }
        }
        return cache;
      }
    } catch (e) {
      console.error('Failed to load cache:', e.message);
    }
    return new Map();
  }

  saveCache() {
    try {
      const data = JSON.stringify([...this.cache]);
      atomicWriteFile(this.cachePath, data, 'utf8');
    } catch (e) {
      console.error('Failed to save cache:', e.message);
    }
  }

  // Config methods
  setConfig(key, config) {
    // First try to save with encryption, only update memory if successful
    const originalConfig = this.configs.get(key);
    this.configs.set(key, config);
    
    try {
      this.saveConfigs();
    } catch (e) {
      // Restore original config if save failed
      if (originalConfig) {
        this.configs.set(key, originalConfig);
      } else {
        this.configs.delete(key);
      }
      throw e; // Re-throw the encryption/save error
    }
  }

  getConfig(key) {
    return this.configs.get(key);
  }

  hasConfig(key) {
    return this.configs.has(key);
  }

  // Runtime methods (in-memory only)
  setRuntime(key, runtime) {
    this.runtimes.set(key, runtime);
  }

  getRuntime(key) {
    return this.runtimes.get(key);
  }

  hasRuntime(key) {
    return this.runtimes.has(key);
  }

  // Cache methods (compatible with utils/storage.js interface)
  setCachedFileList(key, data) {
    this.setCache(key, data);
  }

  getCachedFileList(key) {
    return this.getCache(key);
  }

  // Cache methods
  setCache(key, value) {
    this.cache.set(key, { ...value, ts: Date.now() });
    // Periodically save cache (don't save on every write for performance)
    if (Math.random() < 0.1) { // 10% chance to save
      this.saveCache();
    }
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < 60 * 1000) {
      return cached;
    }
    this.cache.delete(key);
    return null;
  }

  // Migration method to handle existing plain text data
  migrateOldData() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        
        // Try to parse as plain JSON (old format)
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            console.log('Migrating old plain text config data...');
            const migratedConfigs = new Map();
            for (const [key, config] of parsed) {
              migratedConfigs.set(key, config);
            }
            this.configs = migratedConfigs;
            this.saveConfigs(); // This will encrypt the data with atomic write
            console.log('Migration completed successfully');
            return true;
          }
        } catch (e) {
          // Not plain JSON, assume it's already encrypted
        }
      }
    } catch (e) {
      console.error('Migration failed:', e.message);
    }
    return false;
  }

  // Cleanup method - call periodically
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of this.cache) {
      if (!value.ts || now - value.ts > 60 * 1000) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.saveCache();
      console.log(`Cleaned ${cleaned} expired cache entries`);
    }
  }
}

module.exports = new FileStorage();
