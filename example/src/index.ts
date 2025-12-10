/**
 * Example source file to demonstrate obfuscation.
 */

const SECRET_KEY = "my-super-secret-key-12345";
const API_ENDPOINT = "https://api.example.com/v1";

interface User {
  id: number;
  name: string;
  email: string;
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

async function fetchUserData(userId: number): Promise<User | null> {
  try {
    const response = await fetch(`${API_ENDPOINT}/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    return null;
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Main execution
console.log("Application starting...");
const encrypted = encryptData("Hello, World!", SECRET_KEY);
console.log("Encrypted:", encrypted);
const decrypted = decryptData(encrypted, SECRET_KEY);
console.log("Decrypted:", decrypted);

export { encryptData, decryptData, fetchUserData, validateEmail };
