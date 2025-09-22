import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        requests = []
        page.on("request", lambda req: requests.append(req.url))
        await page.goto("https://multiembed.mov/?video_id=tt0137523", wait_until="networkidle")
        await asyncio.sleep(5)
        await browser.close()
        for url in requests:
            print(url)

asyncio.run(main())
