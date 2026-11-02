import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ScadaApp from '@/features/scada/ScadaApp';
import '@/app/globals.css';
import '@/features/scada/styles/warm-glass.css';

const root = document.getElementById('root');

if (!root) throw new Error('Không tìm thấy phần tử gốc của ứng dụng.');

createRoot(root).render(
  <StrictMode>
    <ScadaApp />
  </StrictMode>,
);
