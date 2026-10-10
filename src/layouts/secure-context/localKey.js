import { getItem } from "./dbUtils";
import { deriveKEK, decryptWithKey, importKey } from "./secureUtils";

// Whether this device has a Mintype setup, i.e. a stored, password-wrapped master key.
export async function hasLocalSetup() {
  const [mkEnc, salt] = await Promise.all([getItem("master_key_enc"), getItem("salt")]);
  return Boolean(mkEnc && salt);
}

// Unwraps this device's master key with the password, or with the recovery key when `isRecovery`.
// Returns null when no wrapped key is stored and throws when the secret is wrong.
export async function unwrapMasterKey(secret, isRecovery = false) {
  const salt = await getItem(isRecovery ? "recovery_salt" : "salt");
  const encBlob = await getItem(isRecovery ? "recovery_key_enc" : "master_key_enc");
  if (!salt || !encBlob) return null;

  const kek = await deriveKEK(secret, salt);
  const decrypted = await decryptWithKey(kek, encBlob.iv, encBlob.ciphertext);
  const rawMK = Uint8Array.from(atob(decrypted), (c) => c.charCodeAt(0));
  return { masterKey: await importKey(rawMK), rawMK };
}
