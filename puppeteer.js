const puppeteer = require("puppeteer");

(async () => {
  // Create a browser instance
  const browser = await puppeteer.launch({ headless: false });

  // Create a new page
  const page = await browser.newPage();

  page
    .on("console", (message) =>
      console.log(
        `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`
      )
    )
    .on("pageerror", ({ message }) => console.log(message))
    .on("response", (response) =>
      console.log(`${response.status()} ${response.url()}`)
    )
    .on("requestfailed", (request) =>
      console.log(`${request.failure().errorText} ${request.url()}`)
    );

  // Set viewport width and height
  await page.setViewport({ width: 2048, height: 2048 });

  const website_url = "http://localhost:9000/?page";

  // Open URL in current page
  await page.goto(website_url, { waitUntil: "networkidle0" });

  let xrange = 2;
  let yrange = 4;

  for (let x = -xrange; x <= xrange; x++) {
    for (let y = -yrange; y <= yrange; y++) {
      await page.evaluate(`setTile(${x}, ${y})`);
      await page.waitForTimeout(8000);
      await page.screenshot({
        path: `images/screenshot-${xrange + x}-${yrange + y}.jpg`,
        fullPage: true,
      });
    }
  }

  // Close the browser instance
  await browser.close();
})();
