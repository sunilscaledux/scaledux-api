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

// Utility function to extract relative path from full URL for database storage
export const extractRelativePath = (urlOrPath: string): string => {
  if (!urlOrPath) return ''
  
  // If it's already a relative path, return as is
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    return urlOrPath
  }
  
  // Extract relative path from full URL
  // Example: "http://127.0.0.1:4000/uploads/1/file.jpg" -> "uploads/1/file.jpg"
  try {
    const url = new URL(urlOrPath)
    return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
  } catch (error) {
    // If URL parsing fails, try to extract path manually
    const parts = urlOrPath.split('/')
    const uploadsIndex = parts.findIndex(part => part === 'uploads')
    if (uploadsIndex !== -1) {
      return parts.slice(uploadsIndex).join('/')
    }
    return urlOrPath
  }
};