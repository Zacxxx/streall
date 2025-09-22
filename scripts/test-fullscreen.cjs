const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto("https://multiembed.mov/?video_id=tt0137523", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise(resolve => setTimeout(resolve, 5000));
  const result = await page.evaluate(async () => {
    const iframe = document.querySelector('iframe');
    if (!iframe) return 'no iframe';
    try {
      if (iframe.requestFullscreen) {
        await iframe.requestFullscreen();
        return 'requestFullscreen resolved';
      }
      return 'requestFullscreen not available';
    } catch (err) {
      return 'error: ' + err.message;
    }
  });
  console.log(result);
  await browser.close();
})();
