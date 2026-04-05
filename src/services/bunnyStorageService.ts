import axios, { AxiosResponse } from 'axios';
import type { Readable } from 'stream';
import fileConfig from '@config/file';
import { normalizePath } from '@utils/General';

const bunny = fileConfig.disks.bunny;
const { publicZone, privateZone, cdnHostname } = bunny;

function storageUrl(host: string, zone: string, path: string): string {
  const base = `${host.replace(/\/$/, '')}/${zone}/${path}`;
  return base;
}


export async function uploadPublic(
  path: string,
  data: Buffer | Readable,
  contentType?: string
): Promise<{ success: true; url: string } | { success: false; message: string }> {
  const { storageHost, storageZone, storageApiKey } = publicZone;
  const fullPath = normalizePath(path);
  const url = storageUrl(storageHost, storageZone, fullPath);
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
    const raw = err?.response?.data ?? err?.message ?? 'Upload failed';
    const message = String(raw).toLowerCase().includes('invalid url')
      ? 'Bunny public storage URL is invalid. Check BUNNY_PUBLIC_STORAGE_HOST and BUNNY_PUBLIC_STORAGE_ZONE.'
      : String(raw);
    return { success: false, message };
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
  const { storageHost, storageZone, storageApiKey } = privateZone;
  const fullPath = normalizePath(path);
  const url = storageUrl(storageHost, storageZone, fullPath);
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
    const raw = err?.response?.data ?? err?.message ?? 'Upload failed';
    const message = String(raw).toLowerCase().includes('invalid url')
      ? 'Bunny private storage URL is invalid. Check BUNNY_PRIVATE_STORAGE_HOST and BUNNY_PRIVATE_STORAGE_ZONE.'
      : String(raw);
    return { success: false, message };
  }
}

/**
 * Get the public CDN URL for a file in the public folder (does not check existence).
 */
export function getPublicUrl(path: string): string {
  const p = normalizePath(path);
  if (cdnHostname) {
    const base = cdnHostname.replace(/\/$/, '');
    return `${base}/${p}`;
  }
  return storageUrl(publicZone.storageHost, publicZone.storageZone, p);
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

  const { storageHost, storageZone, storageApiKey } = privateZone;
  const fullPath = normalizePath(path);
  const url = storageUrl(storageHost, storageZone, fullPath);
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
  } catch (err: any) {
    console.error(`[getPrivateFile] Failed to fetch from Bunny. url=${url}, status=${err?.response?.status}, error=${err?.message}`);
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
  res.setHeader('Cache-Control', 'private, no-store');
  file.stream.pipe(res);
  return true;
}

/**
 * Delete a file from the public folder.
 */
export async function deletePublic(path: string): Promise<boolean> {
  const { storageHost, storageZone, storageApiKey } = publicZone;
  const url = storageUrl(storageHost, storageZone, normalizePath(path));
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

  const { storageHost, storageZone, storageApiKey } = privateZone;
  const url = storageUrl(storageHost, storageZone, normalizePath(path));
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
