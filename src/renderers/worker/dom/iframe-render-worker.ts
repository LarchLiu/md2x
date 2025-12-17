// Shared iframe render worker entry
// Must be identical across platforms.

import { startIframeRenderWorker } from '../../../platform/shared/iframe-render-worker';

startIframeRenderWorker({
  source: 'iframe-render',
});
