import cron from 'node-cron';
import User from '../models/User.js';

export const creditResetCron = () => {
    
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting daily reset of analysisCount to 5...');
        
        try {
            const result = await User.updateMany(
                {}, 
                { $set: { analysisCount: 5 } } 
            );
            
            console.log(`[CRON] Daily reset complete. Modified ${result.modifiedCount} users.`);
        } catch (error) {
            console.error('[CRON ERROR] Failed to reset analysisCount:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata" 
    });
};