import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css"
import { registerSW } from "virtual:pwa-register"
import MainApp from './apps/main/App'
import DocsApp from './apps/docs/App'

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


const getApp = () => {
  const devApp = import.meta.env.VITE_APP
  console.log(devApp)

  if (import.meta.env.DEV) {
    if (devApp === 'docs') return <DocsApp />
    return <MainApp />
  }
  
  // In production, use hostname
  const hostname = window.location.hostname
  if (hostname.includes('docs.')) return <DocsApp />
  return <MainApp />
}

createRoot(document.getElementById("root")).render(
  getApp()
);
