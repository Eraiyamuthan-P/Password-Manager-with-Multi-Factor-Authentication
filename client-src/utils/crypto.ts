// Crypto utilities for client-side encryption
// Zero-Knowledge Architecture - All encryption happens here

export class CryptoService {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  // Derive encryption key from master password
  static async deriveMasterKey(
    masterPassword: string,
    salt: string
  ): Promise<CryptoKey> {
    const passwordBuffer = this.encoder.encode(masterPassword);
    const saltBuffer = this.encoder.encode(salt);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate random salt
  static generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(salt)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Encrypt data
  static async encrypt(data: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const dataBuffer = this.encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      dataBuffer
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt data
  static async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    try {
      // Decode from base64
      const combined = Uint8Array.from(atob(encryptedData), (c) =>
        c.charCodeAt(0)
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        data
      );

      return this.decoder.decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed - incorrect password or corrupted data');
    }
  }

  // Hash password for server authentication (NOT the encryption key)
  static async hashPassword(password: string): Promise<string> {
    const buffer = this.encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Generate secure random password
  static generatePassword(length: number = 16): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomValues)
      .map((x) => charset[x % charset.length])
      .join('');
  }

  // Calculate password strength
  static calculatePasswordStrength(password: string): {
    score: number;
    strength: 'weak' | 'medium' | 'strong';
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    else if (password.length < 8)
      feedback.push('Use at least 8 characters');

    // Complexity
    if (/[a-z]/.test(password)) score += 10;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 10;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score += 10;
    else feedback.push('Add numbers');

    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    else feedback.push('Add special characters');

    // Variety
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.5) score += 15;

    // Penalties
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Avoid repeating characters');
    }
    if (/123|abc|qwerty|password/i.test(password)) {
      score -= 20;
      feedback.push('Avoid common patterns');
    }

    score = Math.max(0, Math.min(100, score));

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (score >= 80) strength = 'strong';
    else if (score >= 60) strength = 'medium';

    return {
      score,
      strength,
      feedback: feedback.length > 0 ? feedback : ['Password looks good!'],
    };
  }
}

export default CryptoService;
