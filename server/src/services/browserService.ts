import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { EventEmitter } from 'events';

interface RoomBrowser {
  context: BrowserContext;
  page: Page;
  roomId: string;
  screenshotInterval: NodeJS.Timeout | null;
}

export class BrowserService extends EventEmitter {
  private browser: Browser | null = null;
  private roomBrowsers: Map<string, RoomBrowser> = new Map();
  private readonly FPS = 15;
  private readonly SCREENSHOT_INTERVAL = Math.floor(1000 / 15); // ~67ms for 15fps

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
    };

    this.roomBrowsers.set(roomId, roomBrowser);

    // Start streaming
    this.startScreenshotStream(roomId);
    console.log(`Browser created for room ${roomId}`);
  }

  private startScreenshotStream(roomId: string): void {
    const roomBrowser = this.roomBrowsers.get(roomId);
    if (!roomBrowser) return;

    roomBrowser.screenshotInterval = setInterval(async () => {
      try {
        const rb = this.roomBrowsers.get(roomId);
        if (!rb) return;

        const screenshot = await rb.page.screenshot({
          type: 'jpeg',
          quality: 70,
          fullPage: false,
        });

        const currentUrl = rb.page.url();
        this.emit('screenshot', { roomId, data: screenshot, url: currentUrl });
      } catch (err) {
        // Page might have navigated or closed
      }
    }, this.SCREENSHOT_INTERVAL);
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
