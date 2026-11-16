import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',timeout:30000,fullyParallel:false,workers:1,
  use:{baseURL:'http://127.0.0.1:4173',headless:true,
    launchOptions:process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:
      process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{},
    screenshot:'only-on-failure'},
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:true},
  reporter:'list'
});
