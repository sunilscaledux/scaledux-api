
// Utility function to get file URL
export const getFileUrl = (path: string|null): string => {
  if (path) {
    return `${process.env.ASSET_URL}/${path}`;
  }
  return "";
  
};

export const getRelativePath = (path:string): string => {
 return path.replace(process.cwd() + '/', '').replace(/\\/g, '/');
};