/// <reference types="vite/client" />

declare module "virtual:histrips-endcard" {
  const html: string;
  export default html;
}

interface Window {
  mraid?: {
    addEventListener?: (event: string, listener: (...args: unknown[]) => void) => void;
    getState?: () => string;
    isViewable?: () => boolean;
    open?: (target?: string) => void;
  };
  ALPlayableAnalytics?: {
    trackEvent?: (event: string) => void;
  };
  clickTag?: string;
  clickTag1?: string;
  clickthrough?: string;
  clickThrough?: string;
  trackMraidReadiness?: (mraid: Window["mraid"]) => void;
  isMraidUsable: (mraid: Window["mraid"]) => boolean;
  handleClickAction?: () => void;
  __creativeBootPromise?: Promise<void>;
  getCreativeNow: () => Date;
  gameReady?: () => void;
  gameStart?: () => void;
  gameEnd?: () => void;
  gameClose?: () => void;
}
