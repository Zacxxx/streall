const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto("https://streamingnow.mov/?play=SzJHV1NEdUcxTUVkNDdyTVRGb0tTaXFUVStiSnNRdkRNcXFuOWtNdWljZUlnQ1JMeDJka2hFeTN5RGk1RFdRN2Q3SVcvT09YSVo1V0pHbzZjNlhLN2F4MDNZaWhzN2hDUDhRV1dtMFRoUnl4d0YyNFJWQVRlOTAvLzBEay9ZODZwOFdFQnJYUTYvUWRGVjJNQ0ZqbndURzY5QT09", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.mouse.click(400, 300);
  await new Promise(resolve => setTimeout(resolve, 8000));
  const result = await page.evaluate(() => {
    const iframes = Array.from(document.querySelectorAll('iframe')).map((iframe, index) => ({
      index,
      src: iframe.getAttribute('src'),
      sandbox: iframe.getAttribute('sandbox'),
      allowfullscreen: iframe.getAttribute('allowfullscreen'),
      allow: iframe.getAttribute('allow')
    }));
    const videos = Array.from(document.querySelectorAll('video')).map((video, index) => ({
      index,
      controls: video.controls,
      hasFullscreenMethod: typeof video.requestFullscreen === 'function',
      readyState: video.readyState,
      src: video.currentSrc || video.getAttribute('src')
    }));
    return { iframes, videos };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
