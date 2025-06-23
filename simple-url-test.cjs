/**
 * Simple URL Generation Test for Streall /watch/movie/574475 route
 * This script simulates the URL generation logic without requiring a browser
 */

const https = require('https');
const http = require('http');

class StreamUrlTester {
    constructor() {
        this.tmdbApiKey = '17db4e1c6aec4f836a26810b82bb01b6';
    }

    /**
     * Simulate the URL generation logic from the PlayerPage component
     */
    generateStreamUrl(contentId, mediaType = 'movie', season = null, episode = null) {
        console.log('🔧 Generating stream URL...');
        
        const baseUrl = 'https://multiembed.mov';
        let url = '';
        
        if (mediaType === 'movie') {
            url = `${baseUrl}/?video_id=${contentId}&tmdb=1`;
        } else if (mediaType === 'tv') {
            const s = season || '1';
            const e = episode || '1';
            url = `${baseUrl}/?video_id=${contentId}&tmdb=1&s=${s}&e=${e}`;
        }
        
        console.log(`   • Content ID: ${contentId}`);
        console.log(`   • Media Type: ${mediaType}`);
        console.log(`   • Generated URL: ${url}`);
        
        return url;
    }

    /**
     * Fetch content details from TMDB API (simulating what the app does)
     */
    async fetchTmdbDetails(contentId, mediaType = 'movie') {
        return new Promise((resolve, reject) => {
            console.log(`🎬 Fetching TMDB details for ${mediaType} ${contentId}...`);
            
            const endpoint = mediaType === 'movie' ? `movie/${contentId}` : `tv/${contentId}`;
            const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${this.tmdbApiKey}`;
            
            const options = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            https.get(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        
                        if (res.statusCode === 200) {
                            console.log('✅ TMDB data fetched successfully');
                            resolve(jsonData);
                        } else {
                            console.log('❌ TMDB API error:', jsonData);
                            reject(new Error(`TMDB API error: ${jsonData.status_message}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse TMDB response: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`TMDB request failed: ${error.message}`));
            });
        });
    }

    /**
     * Test the embed URL to see if it's accessible
     */
    async testEmbedUrl(embedUrl) {
        return new Promise((resolve) => {
            console.log('🔍 Testing embed URL accessibility...');
            
            const urlObj = new URL(embedUrl);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'HEAD',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };
            
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const req = client.request(options, (res) => {
                console.log(`   • Status Code: ${res.statusCode}`);
                console.log(`   • Content Type: ${res.headers['content-type']}`);
                
                resolve({
                    accessible: res.statusCode < 400,
                    statusCode: res.statusCode,
                    headers: res.headers
                });
            });
            
            req.on('error', (error) => {
                console.log(`   • Error: ${error.message}`);
                resolve({
                    accessible: false,
                    error: error.message
                });
            });
            
            req.on('timeout', () => {
                console.log('   • Timeout: Request timed out');
                req.destroy();
                resolve({
                    accessible: false,
                    error: 'Request timeout'
                });
            });
            
            req.end();
        });
    }

    /**
     * Complete test simulation for the /watch/movie/574475 route
     */
    async testRoute(contentId = '574475', mediaType = 'movie') {
        console.log('🎬 Starting Streall Route Test');
        console.log('===============================\n');
        
        try {
            // Step 1: Generate the stream URL (what the app does)
            const streamUrl = this.generateStreamUrl(contentId, mediaType);
            
            console.log('\n📋 Route Simulation Results:');
            console.log(`   • Route: /watch/${mediaType}/${contentId}`);
            console.log(`   • Generated Stream URL: ${streamUrl}`);
            
            // Step 2: Try to fetch TMDB details (what the app does)
            try {
                const tmdbData = await this.fetchTmdbDetails(contentId, mediaType);
                console.log('\n🎯 Content Information:');
                console.log(`   • Title: ${tmdbData.title || tmdbData.name}`);
                console.log(`   • Release Year: ${tmdbData.release_date ? new Date(tmdbData.release_date).getFullYear() : tmdbData.first_air_date ? new Date(tmdbData.first_air_date).getFullYear() : 'Unknown'}`);
                console.log(`   • Rating: ${tmdbData.vote_average}/10`);
                console.log(`   • Overview: ${tmdbData.overview ? tmdbData.overview.substring(0, 100) + '...' : 'No overview available'}`);
            } catch (error) {
                console.log(`❌ Failed to fetch TMDB details: ${error.message}`);
            }
            
            // Step 3: Test embed URL accessibility
            console.log('\n🔍 Testing Stream URL:');
            const urlTest = await this.testEmbedUrl(streamUrl);
            
            if (urlTest.accessible) {
                console.log('✅ Stream URL is accessible');
            } else {
                console.log('❌ Stream URL is not accessible');
                if (urlTest.error) {
                    console.log(`   • Error: ${urlTest.error}`);
                }
            }
            
            // Step 4: Generate alternative stream URLs (from the codebase analysis)
            console.log('\n🔧 Alternative Stream URLs:');
            
            // From tmdb-service.ts - 2embed patterns
            const alt2embed = `https://www.2embed.cc/embed/${contentId}`;
            const altMultiembed = `https://multiembed.mov/?video_id=${contentId}&tmdb=1`;
            
            console.log(`   • 2embed URL: ${alt2embed}`);
            console.log(`   • Multiembed URL: ${altMultiembed}`);
            
            // Test these alternatives
            console.log('\n🧪 Testing Alternative URLs:');
            
            for (const [name, url] of [['2embed', alt2embed], ['Multiembed', altMultiembed]]) {
                const test = await this.testEmbedUrl(url);
                console.log(`   • ${name}: ${test.accessible ? '✅ Accessible' : '❌ Not accessible'}`);
            }
            
            return {
                contentId,
                mediaType,
                streamUrl,
                urlTest,
                alternatives: {
                    '2embed': alt2embed,
                    'multiembed': altMultiembed
                }
            };
            
        } catch (error) {
            console.error('💥 Test failed:', error.message);
            return null;
        }
    }

    /**
     * Test TV show episode URL generation
     */
    testTvEpisode(contentId = '574475', season = 1, episode = 1) {
        console.log('\n📺 Testing TV Episode URL Generation:');
        
        const streamUrl = this.generateStreamUrl(contentId, 'tv', season, episode);
        
        console.log(`   • Show ID: ${contentId}`);
        console.log(`   • Season: ${season}`);
        console.log(`   • Episode: ${episode}`);
        console.log(`   • Generated URL: ${streamUrl}`);
        
        return streamUrl;
    }
}

/**
 * Main execution function
 */
async function main() {
    const tester = new StreamUrlTester();
    
    console.log('🎬 Streall Stream URL Test Suite');
    console.log('=================================\n');
    
    // Test movie route (the requested test)
    await tester.testRoute('574475', 'movie');
    
    // Test TV episode format for reference
    tester.testTvEpisode('574475', 1, 1);
    
    console.log('\n✨ Test completed!');
    console.log('\n💡 Usage Tips:');
    console.log('   • This script simulates the URL generation logic from the Streall app');
    console.log('   • The actual iframe in the app would load one of these URLs');
    console.log('   • Run the full browser test with: node test-watch-route.js');
    console.log('   • Make sure the Streall app is running with: npm run dev');
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { StreamUrlTester }; 