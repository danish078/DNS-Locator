import {createRoot, hydrateRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import {AppErrorBoundary} from './components/StatusTemplates.tsx';
import {I18nProvider} from './lib/i18n.tsx';
import './index.css';

registerSW({immediate: true});

const rootElement = document.getElementById('root')!;
const appTree = (
  <AppErrorBoundary>
    <I18nProvider>
      <App />
    </I18nProvider>
  </AppErrorBoundary>
);

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, appTree);
} else {
  createRoot(rootElement).render(appTree);
}
