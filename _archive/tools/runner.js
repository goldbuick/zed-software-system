// Import puppeteer
const puppeteer = require('puppeteer');

async function runner(seconds) {
  // Launch the browser
  const browser = await puppeteer.launch();

  // Create a page
  const page = await browser.newPage();

  page.on('console', (message) => {
    console.log(message.type(), message.text())
  })

  // Go to your site
  await page.goto('http://localhost:7777');
  
  // Wait X amount of time
  await new Promise((r) => setTimeout(r, seconds * 1000))

  // Close browser.
  await browser.close();
}

async function start() {
  await Promise.all([
    runner(20),
    runner(30),
    runner(40),
    runner(50),
    runner(60),
    runner(60),
    runner(60),
    runner(60),
  ])
}

start()