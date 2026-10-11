// context/SecureContext.jsx
import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
import { getItem, setItem } from "./dbUtils";
import {
  deriveKEK,
  generateMasterKey,
  encryptWithKey,
  decryptWithKey,
  exportKey,
} from "./secureUtils";
import PasswordPrompt from "./PasswordPrompt";
import SetupDialog from "./SetupDialog";
import toast from "react-hot-toast";
import RecoveryKeyDialog from "./RecoveryKeyDialog";
import { hasLocalSetup, unwrapMasterKey } from "./localKey";
import { buildLocalBundle, reconcileAccountKey, rememberKeyCheck, setWrappedAt } from "../../lib/keyBundle";
import { useSupabaseAuth } from "../auth/SupabaseAuthProvider.jsx";

const ACCOUNT_KEY_CHECK_INTERVAL = 5 * 60 * 1000;

export const SecureContext = createContext();

export default function SecureProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [masterKey, setMasterKey] = useState(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recKey, setRecKey] = useState(null);
  const { accessToken } = useSupabaseAuth();
  // Result of the last comparison with the account's copy of the key (see reconcileAccountKey).
  const [accountKeyStatus, setAccountKeyStatus] = useState(null);
  const accountKeySyncRef = useRef({ running: null, lastRun: 0 });

  // -- check on load --
  useEffect(() => {
    (async () => {
      if (await hasLocalSetup()) setShowPasswordPrompt(true);
      else setSetupNeeded(true);
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
      if (!importData.salt || !importData.iv || !importData.ciphertext || !importData.wrappedAt) {
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
        await setWrappedAt(importData.wrappedAt);
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
    await rememberKeyCheck(rawMK);
    await setWrappedAt(Date.now());

    setMasterKey(masterKey);
    setReady(true);
    setSetupNeeded(false);

    setRecKey(recoveryKey);
    setShowRecoveryDialog(true);
  };

  const handleLogin = async (passwordOrRecovery, isRecovery = false) => {
    let unwrapped;
    try {
      unwrapped = await unwrapMasterKey(passwordOrRecovery, isRecovery);
    } catch {
      toast.error("Failed to unlock");
      return;
    }
    if (!unwrapped) return alert("No matching encrypted data found");

    try {
      const { masterKey, rawMK } = unwrapped;
      await rememberKeyCheck(rawMK);

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
      await setWrappedAt(Date.now());

      toast.success("Password changed successfully!");
      // Save the new copy to the account now so new and existing devices use the new password.
      // If this fails (e.g. offline), the next account key check uploads it.
      syncAccountKey(true);
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };


  const handleExport = async () => {
    const data = await buildLocalBundle();
    if (!data) {
      toast.error("No encryption keys found on this device.");
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mintype_encrypted_keys.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLockApp = () => {
    setMasterKey(null);
    setReady(false);
    setShowPasswordPrompt(true);

  }

  // Keeps this device's copy of the key and the account's copy in line while signed in: uploads a
  // newer local copy, and adopts a newer account copy so a password changed on another device
  // applies here at the next unlock. Runs on unlock and when the app is shown, at most every few
  // minutes unless forced.
  const syncAccountKey = useCallback(async (force = false) => {
    const state = accountKeySyncRef.current;
    if (!accessToken || !masterKey) return null;
    // A forced check must see the latest local copy, so it runs again after one in progress.
    if (state.running) return force ? state.running.then(() => syncAccountKey(true)) : state.running;
    if (!force && Date.now() - state.lastRun < ACCOUNT_KEY_CHECK_INTERVAL) return null;

    state.running = reconcileAccountKey(accessToken)
      .then((result) => {
        state.lastRun = Date.now();
        setAccountKeyStatus(result);
        if (result === "adopted") {
          toast("Your password was changed on another device. Use the new password next time you unlock.", { duration: 8000 });
        }
        return result;
      })
      .catch((error) => {
        console.error("Account key check failed:", error);
        return null;
      })
      .finally(() => {
        state.running = null;
      });
    return state.running;
  }, [accessToken, masterKey]);

  useEffect(() => {
    if (!accessToken || !masterKey) return;
    syncAccountKey(true);
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") syncAccountKey();
    };
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => document.removeEventListener("visibilitychange", checkWhenVisible);
  }, [accessToken, masterKey, syncAccountKey]);

  const value = {
    ready,
    masterKey,
    handleLockApp,
    handleSetup,
    handleLogin,
    handleChangePassword,
    handleExport,
    accountKeyStatus,
    syncAccountKey,
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
