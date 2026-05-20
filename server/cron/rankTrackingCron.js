import cron from "node-cron";
import  KeywordTracking  from  "../models/keywordTracking.js"
import {keywordTracking} from "../services/keywordTrackingService.js"
export function startRankTrackingCron(){
    cron.schedule("0 6 * * *",async (params)=>{
        console.log("Starting Daily Rank Tracking...");
        try {
            const activeTrackings= await KeywordTracking.find({active:true});

            for(const tracking of activeTrackings){
                tracking.status="checking";
                await tracking.save();

                const result=await keywordTracking(tracking);

                // Delay between checks to avoid rate limiting

                await new Promise((r)=>setTimeout(r,10000+Math.random()*5000));
            }
        } catch (error) {
            console.error("[CRON] Rank Tracking Cron Error",error.message);
        }
    })
    console.log("Rank Tracking Cron Job Scheduled");
}