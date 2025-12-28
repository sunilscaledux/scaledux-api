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

export const extractRelativePath = (urlOrPath: string): string => {
  if (!urlOrPath) return ''
  
  // If it's already a relative path, return as is
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    return urlOrPath
  }
  try {
    const url = new URL(urlOrPath)
    return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
  } catch (error) {
    const parts = urlOrPath.split('/')
    const uploadsIndex = parts.findIndex(part => part === 'uploads')
    if (uploadsIndex !== -1) {
      return parts.slice(uploadsIndex).join('/')
    }
    return urlOrPath
  }
};

export const normalizeUploadedPaths = (docs: any): string[] => {
  if (!docs || !Array.isArray(docs)) return []

  return docs
    .map((d: any) => {
      if (!d) return ''
      if (typeof d === 'string') return extractRelativePath(d)
      if (typeof d?.path === 'string' && d.path) return extractRelativePath(d.path)
      if (typeof d?.url === 'string' && d.url) return extractRelativePath(d.url)
      return ''
    })
    .filter(Boolean)
};

/**
 * Generate a random OTP code
 */
export const generateOtpCode = (length: number = 6): string => {
  const digits = "0123456789";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  return otp;
};

/**
 * Normalize contact input to determine if it's email or phone
 */
export const normalizeContact = (email: string) => {
  const incoming = email;

  if (!incoming) {
    return { email: null, phone: null };
  }

  const isEmail = /@/.test(incoming);
  const digitsOnly = incoming.replace(/\D/g, "");
  const isPhone = /^\d{7,15}$/.test(digitsOnly);

  if (isEmail) {
    return { email: incoming, phone: null };
  } else if (isPhone) {
    return { email: null, phone: digitsOnly };
  } else {
    // Keep as-is and let Joi raise validation error
    return { email: incoming, phone: null };
  }
};