const puppeteer = require('puppeteer');
const path = require('path');

/**
 * Test script for Streall app route /watch/movie/574475
 * This script launches the Electron app, navigates to the route, and extracts the stream URL
 */

class StreamUrlExtractor {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * Initialize the browser and navigate to the app
     */
    async init() {
        console.log('🚀 Starting browser...');
        
        // Launch browser with specific settings for Electron app testing
        this.browser = await puppeteer.launch({
            headless: false, // Set to true if you want headless mode
            devtools: true,
            args: [
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--allow-running-insecure-content',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set viewport
        await this.page.setViewport({ width: 1200, height: 800 });
        
        // Set user agent
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        console.log('✅ Browser initialized');
    }

    /**
     * Navigate to the Streall app
     */
    async navigateToApp() {
        try {
            console.log('🔗 Navigating to Streall app...');
            
            // Assuming the app runs on localhost:5173 (Vite dev server)
            // Adjust this URL based on your setup
            const appUrl = 'http://localhost:5173';
            
            await this.page.goto(appUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            console.log('✅ App loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load app:', error.message);
            return false;
        }
    }

    /**
     * Navigate to the specific movie route and extract stream URL
     */
    async testMovieRoute(movieId = '574475') {
        try {
            console.log(`🎬 Testing route: /watch/movie/${movieId}`);
            
            // Navigate to the specific movie route
            const movieUrl = `http://localhost:5173/watch/movie/${movieId}`;
            await this.page.goto(movieUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            console.log('⏳ Waiting for iframe to load...');

            // Wait for the iframe to appear
            await this.page.waitForSelector('iframe', { timeout: 15000 });

            // Extract iframe src (stream URL)
            const iframeData = await this.page.evaluate(() => {
                const iframe = document.querySelector('iframe');
                if (!iframe) return null;
                
                return {
                    src: iframe.src,
                    title: iframe.title,
                    className: iframe.className,
                    allow: iframe.getAttribute('allow'),
                    frameBorder: iframe.frameBorder,
                    allowFullScreen: iframe.allowFullScreen
                };
            });

            if (iframeData) {
                console.log('🎯 Stream URL extracted successfully!');
                console.log('📊 Iframe Details:');
                console.log(`   • Stream URL: ${iframeData.src}`);
                console.log(`   • Title: ${iframeData.title}`);
                console.log(`   • Allow: ${iframeData.allow}`);
                console.log(`   • Full Screen: ${iframeData.allowFullScreen}`);
                
                return iframeData;
            } else {
                console.log('❌ No iframe found on the page');
                return null;
            }

        } catch (error) {
            console.error('❌ Error testing movie route:', error.message);
            return null;
        }
    }

    /**
     * Get content details from the page
     */
    async getContentDetails() {
        try {
            const contentDetails = await this.page.evaluate(() => {
                // Look for content title and details
                const titleElement = document.querySelector('h1');
                const infoElement = document.querySelector('p.text-sm.text-slate-300');
                
                return {
                    title: titleElement ? titleElement.textContent : null,
                    info: infoElement ? infoElement.textContent : null,
                    url: window.location.href
                };
            });

            console.log('📋 Content Details:');
            console.log(`   • Title: ${contentDetails.title}`);
            console.log(`   • Info: ${contentDetails.info}`);
            console.log(`   • Current URL: ${contentDetails.url}`);

            return contentDetails;
        } catch (error) {
            console.error('❌ Error getting content details:', error.message);
            return null;
        }
    }

    /**
     * Take a screenshot for debugging
     */
    async takeScreenshot(filename = 'test-screenshot.png') {
        try {
            await this.page.screenshot({ 
                path: filename, 
                fullPage: true 
            });
            console.log(`📸 Screenshot saved: ${filename}`);
        } catch (error) {
            console.error('❌ Error taking screenshot:', error.message);
        }
    }

    /**
     * Get network requests related to streaming
     */
    async monitorNetworkRequests() {
        console.log('🔍 Monitoring network requests...');
        
        const requests = [];
        
        this.page.on('request', request => {
            const url = request.url();
            
            // Filter for streaming-related requests
            if (url.includes('multiembed.mov') || 
                url.includes('embed') || 
                url.includes('stream') ||
                url.includes('.m3u8') ||
                url.includes('.mp4')) {
                
                requests.push({
                    url: url,
                    method: request.method(),
                    headers: request.headers()
                });
                
                console.log(`🌐 Network Request: ${request.method()} ${url}`);
            }
        });

        return requests;
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🧹 Browser closed');
        }
    }
}

/**
 * Main test function
 */
async function runTest() {
    const extractor = new StreamUrlExtractor();
    
    try {
        console.log('🎬 Starting Streall Stream URL Extraction Test');
        console.log('='.repeat(50));
        
        // Initialize browser
        await extractor.init();
        
        // Monitor network requests
        await extractor.monitorNetworkRequests();
        
        // Navigate to app
        const appLoaded = await extractor.navigateToApp();
        if (!appLoaded) {
            console.log('💡 Make sure the Streall app is running on http://localhost:5173');
            console.log('   Run: npm run dev');
            return;
        }

        // Wait a bit for the app to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test the specific movie route
        const streamData = await extractor.testMovieRoute('574475');
        
        if (streamData) {
            // Get additional content details
            await extractor.getContentDetails();
            
            // Take screenshot
            await extractor.takeScreenshot('movie-574475-test.png');
            
            console.log('\n🎉 Test completed successfully!');
            console.log('\n📝 Summary:');
            console.log(`   • Movie ID: 574475`);
            console.log(`   • Stream URL: ${streamData.src}`);
            console.log(`   • Expected Pattern: https://multiembed.mov/?video_id=574475&tmdb=1`);
            
            // Validate URL pattern
            const expectedPattern = /https:\/\/multiembed\.mov\/\?video_id=574475&tmdb=1/;
            const isValidPattern = expectedPattern.test(streamData.src);
            console.log(`   • URL Pattern Valid: ${isValidPattern ? '✅' : '❌'}`);
            
        } else {
            console.log('❌ Failed to extract stream URL');
        }
        
    } catch (error) {
        console.error('💥 Test failed with error:', error);
    } finally {
        // Cleanup
        await extractor.cleanup();
    }
}

/**
 * Alternative test function for testing the URL generation logic directly
 */
function testUrlGeneration() {
    console.log('\n🔧 Testing URL generation logic:');
    
    const movieId = '574475';
    const baseUrl = 'https://multiembed.mov';
    const generatedUrl = `${baseUrl}/?video_id=${movieId}&tmdb=1`;
    
    console.log(`   • Movie ID: ${movieId}`);
    console.log(`   • Base URL: ${baseUrl}`);
    console.log(`   • Generated URL: ${generatedUrl}`);
    
    return generatedUrl;
}

// Check if we're running this script directly
if (require.main === module) {
    console.log('🎬 Streall Stream URL Extraction Test');
    console.log('=====================================\n');
    
    // First test URL generation logic
    testUrlGeneration();
    
    // Then run the full browser test
    runTest().catch(console.error);
}

module.exports = {
    StreamUrlExtractor,
    testUrlGeneration
}; 