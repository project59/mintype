import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../index.css';
import '../../App.css';
import { SidebarProvider } from '../../layouts/root/SidebarContext.jsx';
import { EditorProvider } from '../../render/editor/EditorContext.jsx';
import ParityPage from './ParityPage.jsx';

// Page links use the router to navigate, so the page needs one even though it never navigates.
createRoot(document.getElementById('root')).render(
  <MemoryRouter>
    <SidebarProvider>
      <EditorProvider>
        <ParityPage />
      </EditorProvider>
    </SidebarProvider>
  </MemoryRouter>,
);
