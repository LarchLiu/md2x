const DEFAULT_UPLOAD_CHUNK_SIZE = 255 * 1024;

/**
 * Upload large payloads to the background script using a unified chunk protocol.
 * @param {Object} options - Upload options
 * @param {Function} options.sendMessage - Function that wraps chrome.runtime.sendMessage and returns a promise
 * @param {string} options.purpose - Upload purpose identifier
 * @param {string} [options.encoding='text'] - Chunk encoding ('text' | 'base64')
 * @param {number} options.totalSize - Total payload size in bytes/characters
 * @param {Object} [options.metadata={}] - Extra metadata stored with the session
 * @param {Function} options.getChunk - Function returning chunk string given (offset, size)
 * @param {number} [options.requestedChunkSize] - Preferred chunk size
 * @param {Function} [options.onProgress] - Optional progress callback ({ uploaded, total })
 * @returns {Promise<{token: string, chunkSize: number, finalize: Object}>}
 */
export async function uploadInChunks({
  sendMessage,
  purpose,
  encoding = 'text',
  totalSize,
  metadata = {},
  getChunk,
  requestedChunkSize,
  onProgress
}) {
  if (typeof sendMessage !== 'function') {
    throw new Error('sendMessage function is required');
  }

  if (typeof purpose !== 'string' || !purpose.trim()) {
    throw new Error('Upload purpose is required');
  }

  if (typeof getChunk !== 'function') {
    throw new Error('getChunk function is required');
  }

  const initResponse = await sendMessage({
    type: 'UPLOAD_INIT',
    payload: {
      purpose,
      encoding,
      expectedSize: totalSize,
      metadata,
      chunkSize: requestedChunkSize
    }
  });

  if (!initResponse || !initResponse.success || !initResponse.token) {
    throw new Error(initResponse?.error || 'Upload initialization failed');
  }

  const token = initResponse.token;
  let chunkSize = typeof initResponse.chunkSize === 'number' && initResponse.chunkSize > 0
    ? initResponse.chunkSize
    : (typeof requestedChunkSize === 'number' && requestedChunkSize > 0 ? requestedChunkSize : DEFAULT_UPLOAD_CHUNK_SIZE);

  if (encoding === 'base64') {
    const remainder = chunkSize % 3;
    if (remainder !== 0) {
      chunkSize -= remainder;
    }
    if (chunkSize <= 0) {
      chunkSize = 3;
    }
  }

  let uploaded = 0;
  for (let offset = 0; offset < totalSize; offset += chunkSize) {
    const chunk = getChunk(offset, chunkSize);
    const chunkResponse = await sendMessage({
      type: 'UPLOAD_CHUNK',
      token,
      chunk
    });

    if (!chunkResponse || !chunkResponse.success) {
      throw new Error(chunkResponse?.error || 'Upload chunk failed');
    }

    uploaded = Math.min(totalSize, offset + chunkSize);
    if (typeof onProgress === 'function') {
      try {
        onProgress({ uploaded, total: totalSize });
      } catch (error) {
        console.warn('Upload progress callback error:', error);
      }
    }
  }

  const finalizeResponse = await sendMessage({
    type: 'UPLOAD_FINALIZE',
    token
  });

  if (!finalizeResponse || !finalizeResponse.success) {
    throw new Error(finalizeResponse?.error || 'Upload finalize failed');
  }

  return {
    token,
    chunkSize,
    finalize: finalizeResponse
  };
}

/**
 * Abort an ongoing upload session.
 * @param {Function} sendMessage - Promise-based wrapper around chrome.runtime.sendMessage
 * @param {string} token - Upload session token
 */
export function abortUpload(sendMessage, token) {
  if (typeof sendMessage !== 'function' || !token) {
    return Promise.resolve();
  }
  return sendMessage({ type: 'UPLOAD_ABORT', token }).catch(() => {});
}
