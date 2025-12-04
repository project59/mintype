// utils/cryptoUtils.js

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function deriveKEK(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 200000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function generateMasterKey() {
  return await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function encryptWithKey(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(data));
  return { iv, ciphertext: new Uint8Array(enc) };
}

export async function decryptWithKey(key, iv, ciphertext) {
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return textDecoder.decode(dec);
}

export async function exportKey(key) {
  return new Uint8Array(await crypto.subtle.exportKey("raw", key));
}

export async function importKey(raw) {
  return await crypto.subtle.importKey(
    "raw", 
    raw, 
    "AES-GCM", 
    true, // not extractable
    ["encrypt", "decrypt"]
  );
}

// Base64 helpers
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Encrypt data with master key (returns Base64)
export async function encryptDataWithMasterKey(masterKey, data) {
  console.log("Encrypting")
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    encodedData
  );
  return {
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(encrypted),
  };
}

// Decrypt data with master key (accepts Base64)
export async function decryptDataWithMasterKey(masterKey, ivB64, ciphertextB64) {
  console.log("Decrypting")
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
  const ciphertext = base64ToArrayBuffer(ciphertextB64);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    masterKey,
    ciphertext
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}