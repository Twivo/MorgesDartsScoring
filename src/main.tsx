import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import { App } from './App';
import { AuthProvider } from './store/AuthContext';
import { RosterProvider } from './store/RosterContext';
import { LangProvider } from './store/LangContext';
import { ConfirmProvider } from './components/ui/ConfirmProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LangProvider>
        <AuthProvider>
          <RosterProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </RosterProvider>
        </AuthProvider>
      </LangProvider>
    </HashRouter>
  </StrictMode>,
);
