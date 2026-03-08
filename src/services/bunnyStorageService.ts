import axios, { AxiosResponse } from 'axios';
import type { Readable } from 'stream';
import fileConfig from '@config/file';
import { normalizePath } from '@utils/General';

const bunny = fileConfig.disks.bunny;
const { storageHost, storageZone, storageApiKey, cdnHostname, publicFolder, privateFolder } = bunny;

/** Build full path inside zone: folder + path */
function publicPath(path: string): string {
  const p = normalizePath(path);
  return p ? `${normalizePath(publicFolder)}/${p}` : normalizePath(publicFolder);
}

function privatePath(path: string): string {
  const p = normalizePath(path);
  return p ? `${normalizePath(privateFolder)}/${p}` : normalizePath(privateFolder);
}

function storageUrl(path: string): string {
  return `${storageHost}/${storageZone}/${path}`;
}

/** Check if Bunny storage is configured (single zone) */
export function isConfigured(): boolean {
  return !!(storageZone && storageApiKey);
}

/** Check if public CDN URLs can be built (zone + CDN hostname) */
export function isPublicConfigured(): boolean {
  return !!(storageZone && storageApiKey);
}

/** Same as isConfigured – private uses same zone, different folder */
export function isPrivateConfigured(): boolean {
  return isConfigured();
}

/**
 * Upload a file to the public folder (CDN-served).
 * Returns the public CDN URL on success.
 */
export async function uploadPublic(
  path: string,
  data: Buffer | Readable,
  contentType?: string
): Promise<{ success: true; url: string } | { success: false; message: string }> {
  if (!isConfigured()) {
    return { success: false, message: 'Bunny storage is not configured' };
  }
  const fullPath = publicPath(path);
  const url = storageUrl(fullPath);
  const headers: Record<string, string> = {
    AccessKey: storageApiKey,
  };
  if (contentType) headers['Content-Type'] = contentType;

  try {
    await axios.put(url, data, {
      headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: (s) => s === 201,
    });
    const publicUrl = getPublicUrl(path);
    return { success: true, url: publicUrl };
  } catch (err: any) {
    const message = err?.response?.data ?? err?.message ?? 'Upload failed';
    return { success: false, message: String(message) };
  }
}

/**
 * Upload a file to the private folder (served only via backend after access check).
 */
export async function uploadPrivate(
  path: string,
  data: Buffer | Readable,
  contentType?: string
): Promise<{ success: true; path: string } | { success: false; message: string }> {
  if (!isConfigured()) {
    return { success: false, message: 'Bunny storage is not configured' };
  }
  const fullPath = privatePath(path);
  const url = storageUrl(fullPath);
  const headers: Record<string, string> = {
    AccessKey: storageApiKey,
  };
  if (contentType) headers['Content-Type'] = contentType;

  try {
    await axios.put(url, data, {
      headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: (s) => s === 201,
    });
    return { success: true, path: normalizePath(path) };
  } catch (err: any) {
    const message = err?.response?.data ?? err?.message ?? 'Upload failed';
    return { success: false, message: String(message) };
  }
}

/**
 * Get the public CDN URL for a file in the public folder (does not check existence).
 */
export function getPublicUrl(path: string): string {
  const p = publicPath(path);
  if (cdnHostname) {
    const host = cdnHostname.startsWith('http') ? cdnHostname : `https://${cdnHostname}`;
    return `${host.replace(/\/$/, '')}/${p}`;
  }
  return storageUrl(p);
}

/**
 * Result of fetching a private file: stream and metadata for sending the response.
 * Caller must check access before calling getPrivateFile; then pipe stream to response.
 */
export interface PrivateFileResult {
  stream: Readable;
  contentType: string | null;
  contentLength: number | null;
  /** Suggested filename for Content-Disposition (basename of path) */
  filename: string;
}

/**
 * Fetch a private file from Bunny (private folder). Does not perform access control –
 * the route must check access before calling. Use the returned stream to pipe to response.
 */
export async function getPrivateFile(
  path: string
): Promise<PrivateFileResult | null> {
  if (!isConfigured()) {
    return null;
  }
  const fullPath = privatePath(path);
  const url = storageUrl(fullPath);
  try {
    const response: AxiosResponse<Readable> = await axios.get(url, {
      responseType: 'stream',
      headers: { AccessKey: storageApiKey },
      validateStatus: (s) => s === 200,
    });
    const contentType = response.headers['content-type'] ?? null;
    const contentLength = response.headers['content-length']
      ? parseInt(String(response.headers['content-length']), 10)
      : null;
    const filename = normalizePath(path).split('/').pop() || 'file';
    return {
      stream: response.data,
      contentType,
      contentLength: Number.isNaN(contentLength) ? null : contentLength,
      filename,
    };
  } catch {
    return null;
  }
}

/**
 * Check access, download the private file from Bunny, and send it as the response.
 */
export async function getPrivateFileAndSend(
  path: string,
  checkAccess: () => Promise<boolean>,
  res: import('express').Response
): Promise<boolean> {
  const allowed = await checkAccess();
  if (!allowed) {
    return false;
  }
  const file = await getPrivateFile(path);
  if (!file) {
    return false;
  }
  if (file.contentType) res.setHeader('Content-Type', file.contentType);
  if (file.contentLength != null) res.setHeader('Content-Length', String(file.contentLength));
  res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
  file.stream.pipe(res);
  return true;
}

/**
 * Delete a file from the public folder.
 */
export async function deletePublic(path: string): Promise<boolean> {
  if (!isConfigured()) return false;
  const url = storageUrl(publicPath(path));
  try {
    await axios.delete(url, {
      headers: { AccessKey: storageApiKey },
      validateStatus: (s) => s === 200 || s === 204,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file from the private folder.
 */
export async function deletePrivate(path: string): Promise<boolean> {
  if (!isConfigured()) return false;
  const url = storageUrl(privatePath(path));
  try {
    await axios.delete(url, {
      headers: { AccessKey: storageApiKey },
      validateStatus: (s) => s === 200 || s === 204,
    });
    return true;
  } catch {
    return false;
  }
}
