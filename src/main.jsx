import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css"
import { registerSW } from "virtual:pwa-register"
import MainApp from './apps/main/App'

registerSW({
  onNeedRefresh() {
    console.log("New content available, refreshing…")
  },
  onOfflineReady() {
    // triggered when ready to work offline
    console.log("App ready to work offline")
  }
  //onRegisterError - should do it to notify if there was a problem registering the SW
})

createRoot(document.getElementById("root")).render(
  <MainApp />
);
