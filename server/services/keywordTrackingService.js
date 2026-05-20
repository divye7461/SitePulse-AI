import { rankTracker } from './rankTrackerServices.js'; // fixed pluralization mismatch

export async function keywordTracking(tracking) {
    console.log(`\n[TRIPWIRE 2] KeywordTracking service invoked for keyword: "${tracking.keyword}"`);
    try {
        let result;
        
        // Try up to 2 times for reliability
        for (let attempt = 1; attempt <= 2; attempt++) {
            console.log(`[DEBUG] Executing ranking attempt ${attempt}/2...`);
            result = await rankTracker(tracking.keyword, tracking.domain);
            
            if (result.success && result.data.totalResultsScanned > 0) {
                console.log(`[SUCCESS] Attempt ${attempt} extracted search data cleanly.`);
                break;
            }
            
            console.log(`[WARN] Attempt ${attempt} returned no results. Success status: ${result.success}`);
            if (attempt < 2) {
                const delay = result.success ? 3000 : 5000;
                console.log(`[DEBUG] Backing off for ${delay}ms before retrying...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        if (result.success) {
            const previous = tracking.currentPosition;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            tracking.currentPosition = result.data.position;
            tracking.currentPage = result.data.page;
            tracking.competitors = result.data.competitors;
            tracking.lastChecked = new Date();
            tracking.status = 'completed';

            // Calculate position shifts
            tracking.positionChange = previous && result.data.position 
                ? previous - result.data.position 
                : 0;

            // Track historical personal records
            if (result.data.position && (!tracking.bestPosition || result.data.position < tracking.bestPosition)) {
                tracking.bestPosition = result.data.position;
            }

            console.log(`[DEBUG] Service calculated shift. Previous: ${previous || 'None'} -> Current: ${result.data.position || 'Unranked'} (Change: ${tracking.positionChange})`);

            // Update local time series history array
            const historyEntry = {
                date: today,
                position: result.data.position,
                page: result.data.page,
                title: result.data.title,
                snippet: result.data.snippet
            };

            const idx = tracking.rankHistory.findIndex(
                history => history.date.toDateString() === today.toDateString()
            );

            if (idx >= 0) {
                tracking.rankHistory[idx] = historyEntry;
            } else {
                tracking.rankHistory.push(historyEntry);
            }

        } else {
            console.log(`[ERROR] Scraping execution pipeline reported a failure status.`);
            tracking.status = 'failed';
        }

        console.log(`[DEBUG] Writing records down to MongoDB database cluster...`);
        await tracking.save();
        console.log(`[DATABASE OK] Successfully committed keyword tracking state updating entries.`);
        return result;

    } catch (error) {
        console.error('🛑 [RUNTIME ERROR] Critical break inside keywordTracking service loop:', error.message);
        tracking.status = 'failed';
        await tracking.save().catch(() => {});
        return { success: false, error: error.message };
    }
}