// Mobile Iframe Render Worker Adapter
// Uses the shared iframe render worker runtime.

import { startIframeRenderWorker } from '../shared/iframe-render-worker';

startIframeRenderWorker({
  source: 'mobile-render-frame',
  enableDebugLogToParent: true,
});
