// Cloudflare Worker that pings your site every minute
export default {
    async scheduled(event, env, ctx) {
        const urls = [
            'https://evident-petrina-urlsave-2998df90.koyeb.app/'
             // Add your specific endpoints
        ];

        console.log(`🕒 Starting keep-alive ping at ${new Date().toISOString()}`);

        // Ping all URLs concurrently
        const promises = urls.map(async (url) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Cloudflare-Keep-Alive/1.0',
                        'X-Keep-Alive': 'true',
                        'CF-Connecting-IP': '173.245.48.1' // Cloudflare IP
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                const success = response.status >= 200 && response.status < 400;
                const result = {
                    url,
                    status: response.status,
                    success,
                    timestamp: new Date().toISOString()
                };

                if (success) {
                    console.log(`✅ ${url} - Status: ${response.status}`);
                } else {
                    console.log(`⚠️ ${url} - Status: ${response.status}`);
                }

                return result;

            } catch (error) {
                console.log(`❌ ${url} - Error: ${error.message}`);
                return {
                    url,
                    error: error.message,
                    success: false,
                    timestamp: new Date().toISOString()
                };
            }
        });

        const results = await Promise.allSettled(promises);
        
        // Log summary
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;
        
        console.log(`📊 Summary: ${successful} successful, ${failed} failed`);
        
        return new Response(JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Promise rejected' })
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    },
    
    // Optional: Add HTTP endpoint to manually trigger and check status
    async fetch(request) {
        const url = new URL(request.url);
        
        if (url.pathname === '/ping') {
            // Manually trigger the ping logic
            const event = { type: 'scheduled' };
            const env = {};
            const ctx = { waitUntil: promise => promise };
            
            await this.scheduled(event, env, ctx);
            
            return new Response(JSON.stringify({
                message: 'Manual ping executed',
                timestamp: new Date().toISOString()
            }), {
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        return new Response(JSON.stringify({
            endpoints: {
                '/ping': 'Manually trigger keep-alive ping',
                '/': 'This information'
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
