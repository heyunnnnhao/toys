import { QueryClientProvider } from '@tanstack/react-query';
import { createHashHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerAllContent } from '@/content';
import { loadImages } from '@/core/assets';
import { queryClient } from '@/persistence/queries';
import { installAudioUnlock } from '@/ui/audio';
import { IMAGE_MANIFEST } from '@/ui/assets-manifest';
import { installViewportVars } from '@/ui/viewport';
import { routeTree } from './routeTree.gen';
import '@/ui/styles.css';

registerAllContent();
installAudioUnlock();
installViewportVars();
void loadImages(IMAGE_MANIFEST);

// hash history: works on any static host without rewrite rules
const router = createRouter({ routeTree, history: createHashHistory(), defaultPreload: false });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
