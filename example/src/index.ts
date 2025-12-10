/**
 * Example source file to demonstrate obfuscation with TypeScript.
 * This file shows how TypeScript is compiled before obfuscation is applied.
 */

const SECRET_KEY = "my-super-secret-key-12345";
const API_ENDPOINT = "https://api.example.com/v1";

interface User {
  id: number;
  name: string;
  email: string;
}

// TypeScript-specific features that get compiled to JS
type ApiResponse<T> = {
  data: T;
  status: number;
  timestamp: Date;
};

enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

function log(level: LogLevel, message: string): void {
  console.log(`[${level.toUpperCase()}] ${message}`);
}

function encryptData(data: string, key: string): string {
  // Simple XOR encryption for demonstration
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function decryptData(encrypted: string, key: string): string {
  const data = atob(encrypted);
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

async function fetchUserData(userId: number): Promise<ApiResponse<User> | null> {
  try {
    const response = await fetch(`${API_ENDPOINT}/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: User = await response.json();
    return {
      data,
      status: response.status,
      timestamp: new Date(),
    };
  } catch (error) {
    log(LogLevel.ERROR, `Failed to fetch user data: ${error}`);
    return null;
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generic function demonstrating TypeScript features
function createApiClient<T>(baseUrl: string) {
  return {
    get: async (endpoint: string): Promise<T | null> => {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        return await response.json();
      } catch {
        return null;
      }
    },
  };
}

// Main execution
log(LogLevel.INFO, "Application starting...");
const encrypted = encryptData("Hello, World!", SECRET_KEY);
log(LogLevel.DEBUG, `Encrypted: ${encrypted}`);
const decrypted = decryptData(encrypted, SECRET_KEY);
log(LogLevel.DEBUG, `Decrypted: ${decrypted}`);

// Create a typed API client
const userClient = createApiClient<User>(API_ENDPOINT);

export {
  encryptData,
  decryptData,
  fetchUserData,
  validateEmail,
  createApiClient,
  LogLevel,
  log,
  type User,
  type ApiResponse,
};
