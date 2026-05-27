import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import './App.css';

const GuidePage = lazy(() => import('./pages/GuidePage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<PlayerPage />} />
            <Route path="/guide" element={<GuidePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LanguageProvider>
  );
}
