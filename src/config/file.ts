/**
 * File storage config (Laravel-style: default + disks).
 * FILES_DISK env sets the default disk; use fileConfig.default everywhere.
 */
const disk = (process.env.FILES_DISK || 'local').toLowerCase();



export const fileConfig = {
  /** Default disk: "local" or "bunny" */
  default: disk as 'local' | 'bunny',

  /** Laravel-style disks */
  disks: {
    local: {
      driver: 'local' as const,
      url: process.env.ASSET_URL || 'http://127.0.0.1:4000',
    },

    bunny: {
      driver: 'bunny' as const,
      cdnHostname: process.env.BUNNY_CDN_HOSTNAME || '',
      /** Public zone: separate zone, key, host */
      publicZone: {
        storageZone: process.env.BUNNY_PUBLIC_STORAGE_ZONE || '',
        storageApiKey: process.env.BUNNY_PUBLIC_STORAGE_API_KEY || '',
        storageHost: process.env.BUNNY_PUBLIC_STORAGE_HOST || '',
      },
      /** Private zone: separate zone, key, host */
      privateZone: {
        storageZone: process.env.BUNNY_PRIVATE_STORAGE_ZONE || '',
        storageApiKey: process.env.BUNNY_PRIVATE_STORAGE_API_KEY || '',
        storageHost: process.env.BUNNY_PRIVATE_STORAGE_HOST || '',
      },
    },
  },

  /** Whether the default disk is Bunny */
  get isBunny(): boolean {
    return this.default === 'bunny';
  },

  /** Whether the default disk is local */
  get isLocal(): boolean {
    return this.default === 'local';
  },

  /** Base URL for file links when disk is local (for bunny use buildPublicUrl(path)) */
  get url(): string {
    return this.disks.local.url;
  },
};



export default fileConfig;
