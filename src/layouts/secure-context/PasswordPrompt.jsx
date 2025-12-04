// components/PasswordPrompt.jsx
import { Dialog, DialogBackdrop, DialogPanel, Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

export default function PasswordPrompt({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  // on pressing Enter key, submit the form
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSubmit(password, useRecovery);
    }
  };

  return (
    <Dialog open={true} onClose={() => { }}>
      <DialogBackdrop transition className="dialogBackdrop" />
      <div className="dialogWrapper">
        <DialogPanel className="dialogPanel">
          <h2 className="textTitle">
            {useRecovery ? "Enter Recovery Key" : "Enter Password"}
          </h2>
          <input
            type="password"
            className="baseInput"
            autoFocus
            value={password}
            onKeyDown={handleKeyDown}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={useRecovery ? "Recovery Key" : "Password"}
          />
          <button
            className="btnPrimary w-full mb-2"
            onClick={() => onSubmit(password, useRecovery)}
          >
            Unlock
          </button>

          <Disclosure as="div">
            <DisclosureButton className="group flex w-full items-center justify-between">
              <span className="textLabel">
                Forgot Password?
              </span>
              <ChevronDownIcon className="size-4 group-data-[open]:rotate-180 duration-200 text-black dark:text-white" />
            </DisclosureButton>
            <DisclosurePanel className="textRegular space-y-3">
              <p>
                If you have forgotten your password, you can use your recovery key to unlock your secure notes.
              </p>
              <button
                className="btnSecondary w-full text-sm"
                onClick={() => setUseRecovery(!useRecovery)}
              >
                {useRecovery ? "Use Password Instead" : "Use Recovery Key Instead"}
              </button>
            </DisclosurePanel>
          </Disclosure>
        </DialogPanel>
      </div>

    </Dialog>
  );
}
