import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import './App.css';
import LogoBanner from "./components/LogoBanner";

const GuidePage = lazy(() => import('./pages/GuidePage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

export default function App() {
  return (
  <LanguageProvider>
    <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<PlayerPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Suspense>
    </BrowserRouter>
  </LanguageProvider>
);
}