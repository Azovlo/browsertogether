import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { EventEmitter } from 'events';
import os from 'os';

interface RoomBrowser {
  context: BrowserContext;
  page: Page;
  roomId: string;
  screenshotInterval: NodeJS.Timeout | null;
  currentFps: number;
  currentQuality: number;
  manualPreset: string | null;
  lastLatency: number;
}

type QualityPreset = 'low' | 'medium' | 'high' | 'auto';

const PRESETS: Record<Exclude<QualityPreset, 'auto'>, { fps: number; quality: number }> = {
  low:    { fps: 5,  quality: 40 },
  medium: { fps: 15, quality: 70 },
  high:   { fps: 24, quality: 85 },
};

export class BrowserService extends EventEmitter {
  private browser: Browser | null = null;
  private roomBrowsers: Map<string, RoomBrowser> = new Map();

  async init(): Promise<void> {
    if (this.browser) return;

    console.log('Launching Chromium browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-crash-reporter',
        '--disable-oopr-debug-crash-dump',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-crash-upload',
        '--safebrowsing-disable-auto-update',
      ],
    });

    console.log('Chromium launched successfully');
  }

  async createRoomBrowser(roomId: string, initialUrl = 'https://www.google.com'): Promise<void> {
    await this.init();
    if (!this.browser) throw new Error('Browser not initialized');

    if (this.roomBrowsers.has(roomId)) {
      await this.closeRoomBrowser(roomId);
    }

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Handle dialogs automatically
    page.on('dialog', dialog => dialog.dismiss().catch(() => {}));

    // Handle new pages (popups) - redirect to current page
    context.on('page', async (newPage) => {
      const url = newPage.url();
      await newPage.close();
      if (url && url !== 'about:blank') {
        await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
    });

    try {
      await page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch {
      console.warn(`Failed to navigate to ${initialUrl}, using blank page`);
    }

    const roomBrowser: RoomBrowser = {
      context,
      page,
      roomId,
      screenshotInterval: null,
      currentFps: 15,
      currentQuality: 70,
      manualPreset: null,
      lastLatency: 0,
    };

    this.roomBrowsers.set(roomId, roomBrowser);

    // Start streaming
    this.startScreenshotStream(roomId);
    console.log(`Browser created for room ${roomId}`);
  }

  private startScreenshotStream(roomId: string): void {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return;

    if (roomBrowser.screenshotInterval) {
      clearInterval(roomBrowser.screenshotInterval);
    }

    const interval = Math.floor(1000 / roomBrowser.currentFps);

    roomBrowser.screenshotInterval = setInterval(async () => {
      try {
        const rb = this.roomBrowsers.get(roomId);
        if (!rb) return;

        const screenshot = await rb.page.screenshot({
          type: 'jpeg',
          quality: rb.currentQuality,
          fullPage: false,
        });

        const currentUrl = rb.page.url();
        this.emit('screenshot', { roomId, data: screenshot, url: currentUrl });
      } catch (err) {
        // Page might have navigated or closed
      }
    }, interval);
  }

  private restartStreamWithNewSettings(roomId: string): void {
    const rb = this.roomBrowsers.get(roomId);
    if (!rb) return;

    if (rb.screenshotInterval) {
      clearInterval(rb.screenshotInterval);
      rb.screenshotInterval = null;
    }
    this.startScreenshotStream(roomId);
  }

  /**
   * Adapt quality based on latency, CPU load, and user count.
   * Returns { changed, fps, quality, reason } so caller can emit event.
   */
  adaptQuality(
    roomId: string,
    latency: number,
    userCount: number
  ): { changed: boolean; fps: number; quality: number; reason: string } | null {
    const rb = this.roomBrowsers.get(roomId);
    if (!rb) return null;

    // If manual preset is set, ignore adaptive logic
    if (rb.manualPreset !== null) {
      return null;
    }

    rb.lastLatency = latency;

    const cpuLoad = os.loadavg()[0];

    let fps: number;
    let quality: number;
    let reason: string;

    if (latency < 100 && cpuLoad < 0.5 && userCount <= 2) {
      fps = 24;
      quality = 85;
      reason = 'optimal';
    } else if (latency < 200 && cpuLoad < 0.7) {
      fps = 15;
      quality = 70;
      reason = 'good';
    } else if (latency < 400) {
      fps = 10;
      quality = 55;
      reason = 'degraded';
    } else {
      fps = 5;
      quality = 40;
      reason = 'poor';
    }

    // Cap fps if CPU is high
    if (cpuLoad > 0.8 && fps > 10) {
      fps = 10;
      reason += '+cpu-cap';
    }

    const changed = rb.currentFps !== fps || rb.currentQuality !== quality;
    if (changed) {
      rb.currentFps = fps;
      rb.currentQuality = quality;
      this.restartStreamWithNewSettings(roomId);
    }

    return { changed, fps, quality, reason };
  }

  /**
   * Apply a manual quality preset. 'auto' re-enables adaptive mode.
   */
  setQualityPreset(
    roomId: string,
    preset: QualityPreset
  ): { fps: number; quality: number; reason: string } | null {
    const rb = this.roomBrowsers.get(roomId);
    if (!rb) return null;

    if (preset === 'auto') {
      rb.manualPreset = null;
      return { fps: rb.currentFps, quality: rb.currentQuality, reason: 'auto' };
    }

    const settings = PRESETS[preset];
    rb.manualPreset = preset;
    rb.currentFps = settings.fps;
    rb.currentQuality = settings.quality;
    this.restartStreamWithNewSettings(roomId);

    return { fps: settings.fps, quality: settings.quality, reason: `preset:${preset}` };
  }

  getRoomBrowserInfo(roomId: string): Pick<RoomBrowser, 'currentFps' | 'currentQuality' | 'manualPreset' | 'lastLatency'> | null {
    const rb = this.roomBrowsers.get(roomId);
    if (!rb) return null;
    return {
      currentFps: rb.currentFps,
      currentQuality: rb.currentQuality,
      manualPreset: rb.manualPreset,
      lastLatency: rb.lastLatency,
    };
  }

  async navigate(roomId: string, url: string): Promise<string> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) throw new Error('No browser for this room');

    // Auto-add https if no protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    await roomBrowser.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    return roomBrowser.page.url();
  }

  async click(roomId: string, x: number, y: number): Promise<void> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return;

    await roomBrowser.page.mouse.click(x, y);
  }

  async scroll(roomId: string, x: number, y: number, deltaX: number, deltaY: number): Promise<void> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return;

    await roomBrowser.page.mouse.move(x, y);
    await roomBrowser.page.mouse.wheel(deltaX, deltaY);
  }

  async mouseMove(roomId: string, x: number, y: number): Promise<void> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return;

    await roomBrowser.page.mouse.move(x, y);
  }

  async keyPress(roomId: string, key: string): Promise<void> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return;

    await roomBrowser.page.keyboard.press(key);
  }

  async typeText(roomId: string, text: string): Promise<void> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return;

    await roomBrowser.page.keyboard.type(text);
  }

  async goBack(roomId: string): Promise<string> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return '';

    await roomBrowser.page.goBack({ waitUntil: 'domcontentloaded' });
    return roomBrowser.page.url();
  }

  async goForward(roomId: string): Promise<string> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return '';

    await roomBrowser.page.goForward({ waitUntil: 'domcontentloaded' });
    return roomBrowser.page.url();
  }

  async getPageTitle(roomId: string): Promise<string> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return '';

    return roomBrowser.page.title();
  }

  async closeRoomBrowser(roomId: string): Promise<void> {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return;

    if (roomBrowser.screenshotInterval) {
      clearInterval(roomBrowser.screenshotInterval);
    }

    await roomBrowser.page.close().catch(() => {});
    await roomBrowser.context.close().catch(() => {});

    this.roomBrowsers.delete(roomId);
    console.log(`Browser closed for room ${roomId}`);
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up browser service...');

    for (const roomId of this.roomBrowsers.keys()) {
      await this.closeRoomBrowser(roomId);
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
