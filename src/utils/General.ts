// Utility function to get file URL
export const getFileUrl = (path: string|null): string => {
  if (!path) return "";
  
  // If path is already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const baseUrl = process.env.ASSET_URL || 'http://127.0.0.1:4000';
  
  // Ensure proper URL construction without double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBaseUrl}${cleanPath}`;
};

export const getRelativePath = (path:string): string => {
 return path.replace(process.cwd() + '/', '').replace(/\\/g, '/');
};