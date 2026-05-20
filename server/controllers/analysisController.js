import { scrapUrl } from "../services/scraperService.js";
import User from "../models/User.js";

// Analyze a URL

import Analysis from "../models/Analysis.js";
import { analyzeSeoData } from "../services/geminiService.js";

export const analyzeUrl = async (req, res) => {
    try {
        const { url } = req.body;
        // Validate URL
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Validate URL format

        let validUrl;
        try {
            validUrl=new URL(url.startsWith('http') ? url : `http://${url}`);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // CREDIT CHECK: Block user immediately if they have 0 or fewer credits
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }
        
        if (user.analysisCount <= 0) {
            return res.status(403).json({ 
                success: false, 
                message: "You have exhausted your daily limit of 5 scans. Your balance resets at midnight!" 
            });
        }

        // Create analysis record with pending status

        const analysis = await Analysis.create({ userId:req.userId,url: validUrl.href, status: 'processing' });

        // Send immediate response with analysis ID
        
        res.json({success:true,message:'Analysis started', analysisId: analysis._id });

        // Run Scraping and Analysis in Background

        try {
            // Step 1: Scrape the URL

            const scrappedData = await scrapUrl(validUrl.href);

            if(!scrappedData.success){
                analysis.status="failed";
                await analysis.save();
                return;
            }

            // Step 2:- Analyze with Gemini AI

            const aiResult=await analyzeSeoData(scrappedData.data);

            if(!aiResult.success){
                analysis.status="failed";
                await analysis.save();
                return;
            }

            // Step 3:- Save results to DB

            analysis.overallScore=aiResult.data.overallScore || 0;
            analysis.categories=aiResult.data.categories || {};
            analysis.metaData=scrappedData.data.metaData || {};
            analysis.headings=scrappedData.data.headings || {};
            analysis.links=scrappedData.data.links || {};
            analysis.images=scrappedData.data.images || {};
            analysis.keywords=aiResult.data.keywords || [];
            analysis.issues=aiResult.data.issues || [];
            analysis.loadTime=scrappedData.data.loadTime || 0;
            analysis.wordCount=scrappedData.data.wordCount || 0;
            analysis.pageSize=scrappedData.data.pageSize || 0;
            analysis.status="completed";
            await analysis.save();

            // CONSUME CREDIT: Decrement the pool by 1 on a successful run
            await User.findByIdAndUpdate(req.userId, {
                $inc: { analysisCount: -1 } 
            });

        } catch (bgError) {
            console.error('Background analysis of URL failed:', bgError.message);
            try {
                analysis.status="failed";
                await analysis.save();
            } catch (saveError) {
                console.error('Failed to update analysis status:', saveError.message);
            }
        }


    } catch (error) {
        console.error('Analysis of URL failed:', error.message);
        if(!res.headersSent){
            res.status(500).json({ error: 'Server error' });
        }
    }
}

// Get Analysis By ID
export const getAnalysisById = async (req, res) => {
    try {
        const analysis=await Analysis.findOne({_id:req.params.id,userId:req.userId});
        if(!analysis){
            return res.status(404).json({error:'Analysis not found'});
        }
        res.json({success:true,analysis});
    } catch (error) {
        console.error('Failed to retrieve analysis:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
}


// Get All Analyses
export const getAllAnalyses = async (req, res) => {
    try {
        const page=parseInt(req.query.page) || 1;

        const limit=parseInt(req.query.limit) || 10;

        const skip=(page-1)*limit;

        const analyses=await Analysis.find({userId:req.userId}).sort({createdAt:-1}).skip(skip).limit(limit).select('-issues -keywords');

        const total=await Analysis.countDocuments({userId:req.userId});

        if(!analyses){
            return res.status(404).json({error:'Analysis not found'});
        }
        res.json({success:true,analyses,pagination:{total,page,limit,pages:Math.ceil(total/limit)}});

    } catch (error) {
        console.error('Failed to retrieve all analysis:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
}

// Delete Analysis
export const deleteAnalysis = async (req, res) => {
   try {
        await Analysis.findOneAndDelete({_id:req.params.id,userId:req.userId});
        res.json({success:true,message:"Analysis Deleted"});
    } catch (error) {
        console.error("Delete Analysis Error: ",error.message);
        res.status(500).json({success:false,message:"Server Error"});
    }
}
