// context/SecureContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { getItem, setItem, clearStore } from "./dbUtils";
import {
  deriveKEK,
  generateMasterKey,
  encryptWithKey,
  decryptWithKey,
  exportKey,
  importKey,
} from "./secureUtils";
import PasswordPrompt from "./PasswordPrompt";
import SetupDialog from "./SetupDialog";
import toast from "react-hot-toast";
import RecoveryKeyDialog from "./RecoveryKeyDialog";
import dbService from "../../lib/dbService";

export const SecureContext = createContext();

export default function SecureProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [masterKey, setMasterKey] = useState(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recKey, setRecKey] = useState(null);

  // -- check on load --
  useEffect(() => {
    (async () => {
      const mkEnc = await getItem("master_key_enc");
      const salt = await getItem("salt");
      if (!mkEnc || !salt) setSetupNeeded(true);
      else setShowPasswordPrompt(true);
    })();
  }, []);

  // Generate random recovery key
  const generateRecoveryKey = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleSetup = async (password, isImport = false, importData = null) => {
    if (isImport && importData) {
      // Validate the import data structure
      if (!importData.salt || !importData.iv || !importData.ciphertext) {
        toast.error("Invalid backup file format");
        return;
      }
      try {
        // Import existing encrypted key bundle
        const { salt, iv, ciphertext, recoveryKeyEnc, recoverySalt } = importData;
        await setItem("salt", Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)));
        await setItem("master_key_enc", {
          iv: Uint8Array.from(atob(iv), (c) => c.charCodeAt(0)),
          ciphertext: Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0)),
        });
        if (recoveryKeyEnc && recoverySalt) {
          await setItem("recovery_key_enc", {
            iv: Uint8Array.from(atob(recoveryKeyEnc.iv), (c) => c.charCodeAt(0)),
            ciphertext: Uint8Array.from(atob(recoveryKeyEnc.ciphertext), (c) => c.charCodeAt(0))
          });
          await setItem("recovery_salt", Uint8Array.from(atob(recoverySalt), (c) => c.charCodeAt(0)));
        }
        toast.success("Keys imported successfully. Please enter your password to unlock.");
        setSetupNeeded(false);
        setShowPasswordPrompt(true);
      } catch (error) {
        toast.error("Failed to import keys. File may be corrupted.");
        console.error(error);
      }
      return;
    }

    // Normal new setup - validate password first
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Normal new setup
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const recoverySalt = crypto.getRandomValues(new Uint8Array(16));
    const recoveryKey = generateRecoveryKey();
    const masterKey = await generateMasterKey();

    const kek = await deriveKEK(password, salt);
    const rawMK = await exportKey(masterKey);

    const { iv, ciphertext } = await encryptWithKey(kek, btoa(String.fromCharCode(...rawMK)));

    // Encrypt MK with recovery key too
    const recoveryKEK = await deriveKEK(recoveryKey, recoverySalt);
    const { iv: rIV, ciphertext: rCiphertext } = await encryptWithKey(
      recoveryKEK,
      btoa(String.fromCharCode(...rawMK))
    );

    // Store everything
    await setItem("master_key_enc", { iv, ciphertext });
    await setItem("salt", salt);
    await setItem("recovery_key_enc", { iv: rIV, ciphertext: rCiphertext });
    await setItem("recovery_salt", recoverySalt);

    setMasterKey(masterKey);
    setReady(true);
    setSetupNeeded(false);

    setRecKey(recoveryKey);
    setShowRecoveryDialog(true);
  };

  const handleLogin = async (passwordOrRecovery, isRecovery = false) => {
    const salt = isRecovery ? await getItem("recovery_salt") : await getItem("salt");
    const encBlob = isRecovery
      ? await getItem("recovery_key_enc")
      : await getItem("master_key_enc");
    if (!encBlob) return alert("No matching encrypted data found");

    const { iv, ciphertext } = encBlob;
    const kek = await deriveKEK(passwordOrRecovery, salt);

    try {
      const decrypted = await decryptWithKey(kek, iv, ciphertext);
      const rawMK = Uint8Array.from(atob(decrypted), (c) => c.charCodeAt(0));
      const masterKey = await importKey(rawMK);

      setMasterKey(masterKey);
      setReady(true);
      setShowPasswordPrompt(false);
      toast.success("Unlocked");
    } catch (e) {
      toast.error("Failed to unlock");
    }
  };

  const handleChangePassword = async (oldSecret, newPassword, isRecoveryKey = false) => {
    if (!oldSecret || !newPassword) {
      toast.error("Both required values must be provided.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    const salt = await getItem(isRecoveryKey ? "recovery_salt" : "salt");
    const encBlob = await getItem(isRecoveryKey ? "recovery_key_enc" : "master_key_enc");

    if (!encBlob || !salt) {
      toast.error("Required key data not found for validation.");
      return;
    }

    const { iv, ciphertext } = encBlob;

    try {
      // Derive KEK from the old secret (password or recovery key)
      const oldKEK = await deriveKEK(oldSecret, salt);

      let decrypted;
      try {
        decrypted = await decryptWithKey(oldKEK, iv, ciphertext);
      } catch (err) {
        // This is the authentication failure point
        toast.error(`Incorrect ${isRecoveryKey ? 'Recovery Key' : 'old password'}. Please try again.`);
        return;
      }

      // If decryption succeeds, the Master Key (rawMK) is now in memory.
      const rawMK = Uint8Array.from(atob(decrypted), (c) => c.charCodeAt(0));


      // always uses a new salt and targets the 'master_key_enc' slot.
      const newSalt = crypto.getRandomValues(new Uint8Array(16));
      const newKEK = await deriveKEK(newPassword, newSalt);

      const { iv: newIV, ciphertext: newCiphertext } = await encryptWithKey(
        newKEK,
        btoa(String.fromCharCode(...rawMK))
      );

      await setItem("master_key_enc", { iv: newIV, ciphertext: newCiphertext });
      await setItem("salt", newSalt);

      toast.success("Password changed successfully! You are now logged in with your new password.");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };


  const handleExport = async () => {
    const salt = await getItem("salt");
    const { iv, ciphertext } = await getItem("master_key_enc");
    const recoveryKeyEnc = await getItem("recovery_key_enc");
    const recoverySalt = await getItem("recovery_salt");

    const data = {
      version: 1,
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...ciphertext)),
      recoveryKeyEnc: recoveryKeyEnc
        ? {
          iv: btoa(String.fromCharCode(...recoveryKeyEnc.iv)),
          ciphertext: btoa(String.fromCharCode(...recoveryKeyEnc.ciphertext))
        }
        : null,
      recoverySalt: recoverySalt
        ? btoa(String.fromCharCode(...recoverySalt))
        : null,
      created: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "secure_notes_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    await clearStore();
    await dbService.clearNotes();
    await dbService.clearSyncQueue();
    setReady(false);
    setSetupNeeded(true);
    setMasterKey(null);
  };

  const handleLockApp = () => {
    setMasterKey(null);
    setReady(false);
    setShowPasswordPrompt(true);

  }

  const value = {
    ready,
    masterKey,
    handleLockApp,
    handleSetup,
    handleLogin,
    handleChangePassword,
    handleReset,
    handleExport,
  };

  if (setupNeeded) return <SetupDialog onSetup={handleSetup} />;
  if (showPasswordPrompt && !ready)
    return <PasswordPrompt onSubmit={handleLogin} />;

  if (showRecoveryDialog) {
    return <RecoveryKeyDialog onHandleExport={handleExport} recoveryKey={recKey} onClose={() => { toast.success("Setup Complete!"); setShowRecoveryDialog(false) }} showDialog={showRecoveryDialog} />;
  }

  return <SecureContext.Provider value={value}>
    {masterKey &&
      children
    }
  </SecureContext.Provider>;
}
