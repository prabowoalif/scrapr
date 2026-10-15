export interface MediaDownload {
  type: "video" | "audio" | "music" | "photo" | "file" | "link" | string;
  quality?: string;
  url: string;
}

export interface ScraperResponseResult {
  title?: string;
  filename?: string;
  thumbnail?: string;
  type?: string;
  author?: string | Record<string, any>;
  stats?: Record<string, any>;
  size?: string;
  url?: string;
  originalUrl?: string;
  destinationUrl?: string;
  downloads?: MediaDownload[];
  tracks?: any[];
  items?: any[];
  trackCount?: number;
  itemCount?: number;
  [key: string]: any;
}

export interface ScraperResponse {
  status: boolean;
  platform?: string;
  method?: string;
  durationMs?: number;
  attemptsCount?: number;
  result?: ScraperResponseResult;
  message?: string;
  errors?: Array<{ method: string; message: string; durationMs?: number }>;
  originalUrl?: string;
  unshortened?: {
    originalUrl: string;
    destinationUrl: string;
    hops: string[];
  };
}

export interface DetectionResult {
  status: boolean;
  name?: string;
  platform: string | null;
  method: string | null;
  methods: string[];
  fallbackMethods: string[];
  type: "media" | "playlist" | "file_host" | "link_gateway" | "link_unlocker" | "shortlink" | "unknown" | "invalid";
  url: string;
  error?: string;
}

export interface ExtractionOptions {
  /** Explicitly override detected platform (e.g. 'tiktok', 'instagram', 'resolver') */
  platform?: string;
  /** Explicitly override primary scraper method to run first */
  method?: string;
  /** Whether to fall back to alternative scrapers if the primary method fails (default: true) */
  fallback?: boolean;
  /** Custom explicit array of scraper methods to attempt in order */
  methods?: string[];
  /** Timeout in milliseconds per attempt */
  timeout?: number;
  /** Automatically unshorten links and extract media from target destination (default: true) */
  autoUnshorten?: boolean;
  /** If URL domain is unrecognized, attempt HTTP unshortening to find target platform (default: true) */
  fallbackToUnshorten?: boolean;
  /** Callback fired before each scraper execution attempt */
  onAttempt?: (info: { platform: string; method: string; attempt: number; totalAttempts: number; url: string }) => void;
  /** Extra options passed to individual scraper methods (e.g. quality) */
  methodOptions?: Record<string, any>;
}

export interface PlatformInfo {
  name: string;
  platform: string;
  methods: string[];
  type: string;
}

export type ScraperFunction = (url: string, options?: any) => Promise<ScraperResponse>;

export interface ScraprCallable {
  (url: string, options?: ExtractionOptions): Promise<ScraperResponse>;

  /** Universal extractor with auto-detection and smart fallback */
  extract(url: string, options?: ExtractionOptions): Promise<ScraperResponse>;

  /** Universal link & shortlink resolver (alias to extract) */
  resolve(url: string, options?: ExtractionOptions): Promise<ScraperResponse>;

  /** Detect platform and supported scraper methods for a URL */
  detect(url: string): DetectionResult;

  /** List all supported platforms and their capabilities */
  getPlatforms(): PlatformInfo[];

  // Platforms
  bilibili: { direct: ScraperFunction };
  douyin: { direct: ScraperFunction };
  applemusic: { aplmate: ScraperFunction };
  soundcloud: { klickaud: ScraperFunction };
  tiktok: {
    snaptik: ScraperFunction;
    tiktokio: ScraperFunction;
    savetik: ScraperFunction;
    ssstik: ScraperFunction;
    tikdownloader: ScraperFunction;
  };
  youtube: {
    ytmp3: ScraperFunction;
    ytmp3gg: ScraperFunction;
    playlist: ScraperFunction;
  };
  instagram: {
    direct: ScraperFunction;
    indown: ScraperFunction;
    snapsave: ScraperFunction;
    snapinsta: ScraperFunction;
  };
  bandcamp: {
    direct: ScraperFunction;
    bandcampdownloader: ScraperFunction;
  };
  spotify: {
    spotisaver: ScraperFunction;
    spotidown: ScraperFunction;
    spotmate: ScraperFunction;
    soundloaders: ScraperFunction;
  };
  twitter: {
    direct: ScraperFunction;
    tvd: ScraperFunction;
    savetwt: ScraperFunction;
    tweeload: ScraperFunction;
  };
  pinterest: {
    direct: ScraperFunction;
    pindown: ScraperFunction;
  };
  facebook: {
    snapsave: ScraperFunction;
    fdown: ScraperFunction;
  };
  threads: { threadster: ScraperFunction };
  pixiv: { ajax: ScraperFunction };
  rednote: { direct: ScraperFunction };
  reddit: { rapidsave: ScraperFunction };
  terabox: { sechno: ScraperFunction };
  resolver: {
    sfile: ScraperFunction;
    safelinku: ScraperFunction;
    mediafire: ScraperFunction;
    sub2unlock: ScraperFunction;
    rekonise: ScraperFunction;
    unshorten: ScraperFunction;
    pixeldrain: ScraperFunction;
    catbox: ScraperFunction;
    krakenfiles: ScraperFunction;
    doodstream: ScraperFunction;
    gdrive: ScraperFunction;
  };
}

declare const scrapr: ScraprCallable;

export const extract: ScraprCallable["extract"];
export const resolve: ScraprCallable["resolve"];
export const detect: ScraprCallable["detect"];
export const getPlatforms: ScraprCallable["getPlatforms"];

export const bilibili: ScraprCallable["bilibili"];
export const douyin: ScraprCallable["douyin"];
export const applemusic: ScraprCallable["applemusic"];
export const soundcloud: ScraprCallable["soundcloud"];
export const tiktok: ScraprCallable["tiktok"];
export const youtube: ScraprCallable["youtube"];
export const instagram: ScraprCallable["instagram"];
export const bandcamp: ScraprCallable["bandcamp"];
export const spotify: ScraprCallable["spotify"];
export const twitter: ScraprCallable["twitter"];
export const pinterest: ScraprCallable["pinterest"];
export const facebook: ScraprCallable["facebook"];
export const threads: ScraprCallable["threads"];
export const pixiv: ScraprCallable["pixiv"];
export const rednote: ScraprCallable["rednote"];
export const reddit: ScraprCallable["reddit"];
export const terabox: ScraprCallable["terabox"];
export const resolver: ScraprCallable["resolver"];

export default scrapr;
