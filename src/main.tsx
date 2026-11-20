import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import {AppErrorBoundary} from './components/StatusTemplates.tsx';
import {I18nProvider} from './lib/i18n.tsx';
import './index.css';

registerSW({immediate: true});

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <I18nProvider>
      <App />
    </I18nProvider>
  </AppErrorBoundary>
);
