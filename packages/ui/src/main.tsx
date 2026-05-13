import './i18n';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'remixicon/fonts/remixicon.css'
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ConfigProvider } from '@/components/ConfigProvider';

// Terminal Forge: dark theme is the only theme
document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>,
)
