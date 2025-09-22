const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const requests = new Set();

  page.on("request", req => {
    requests.add(req.url());
  });

  await page.goto("https://multiembed.mov/?video_id=tt0137523", { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();

  for (const url of requests) {
    console.log(url);
  }
})();
