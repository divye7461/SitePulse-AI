import { scrapUrl } from "../services/scraperService.js";
import User from "../models/User.js";
import PDFDocument from 'pdfkit';
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

// PDF Generation
export const exportReportPDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Fetch full analysis dataset from MongoDB
    const analysis = await Analysis.findById(id);
    if (!analysis) {
      return res.status(404).json({ success: false, message: "Analysis dataset not found" });
    }

    const hostname = new URL(analysis.url).hostname;

    // 2. Set streaming headers for attachment download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Comprehensive_SEO_Report_${hostname}.pdf`);

    // 3. Initialize PDF document (A4: 595 x 842 points)
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // --- HELPER FUNCTION FOR PAGE OVERFLOW BOUNDARY GUARDS ---
    const checkPageOverflow = (neededHeight = 50) => {
      if (doc.y + neededHeight > 780) {
        doc.addPage();
        // Render a clean running header watermark on the new page
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(`SitePulse AI | Comprehensive Audit: ${hostname}`, 40, 22);
        doc.moveTo(40, 34).lineTo(555, 34).strokeColor('#f1f5f9').lineWidth(1).stroke();
        doc.y = 50; // Set starting y-coordinate safely past the top header rule
      }
    };

    // ==========================================
    // PAGE 1: EXECUTIVE BRIEFING & CORE VITALS
    // ==========================================
    
    // 🎉 UPDATED: Brand header centered cleanly at the very top
    doc.fillColor('#4f46e5').fontSize(26).font('Helvetica-Bold').text('SitePulse AI', { align: 'center' });
    doc.moveDown(0.2);
    
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`Generated on: ${new Date(analysis.createdAt).toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(0.8);
    
    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text('Comprehensive Search Engine Optimization Audit', { align: 'center' });
    doc.moveDown(0.4);
    
    // Left-aligned targeted URL metric tracking block
    doc.fillColor('#4f46e5').fontSize(10).font('Helvetica-Bold').text(`Target Domain: `, { continued: true }).fillColor('#475569').font('Helvetica').text(analysis.url);
    doc.moveDown(0.8);
    
    // Divider Line
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.moveDown(1.5);

    // --- OVERALL SCORE HERO BLOCK ---
    const scoreBlockY = doc.y;
    
    // Render Left-Aligned Score Block
    doc.rect(40, scoreBlockY, 130, 80).fill('#4f46e5');
    doc.fillColor('#ffffff').fontSize(32).font('Helvetica-Bold').text(`${analysis.overallScore}`, 40, scoreBlockY + 14, { width: 130, align: 'center' });
    doc.fontSize(10).font('Helvetica-Bold').text('OVERALL SCORE', 40, scoreBlockY + 54, { width: 130, align: 'center' });

    // Render Right-Aligned Core Operational Pillars Ratings
    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Core Operational Pillars Ratings', 190, scoreBlockY);
    
    const pillars = [
      { label: 'Search Optimization Index', score: analysis.categories.seo },
      { label: 'Core Web Performance Speed', score: analysis.categories.performance },
      { label: 'Interface Accessibility Profile', score: analysis.categories.accessibility },
      { label: 'Best Compliance Practices', score: analysis.categories.bestPractices }
    ];

    pillars.forEach((pillar, i) => {
      const rowY = scoreBlockY + 24 + (i * 14);
      doc.fillColor('#475569').fontSize(9.5).font('Helvetica').text(`• ${pillar.label}: `, 190, rowY);
      
      const textWidth = doc.widthOfString(`• ${pillar.label}: `);
      const scoreColor = pillar.score >= 80 ? '#10b981' : pillar.score >= 50 ? '#f59e0b' : '#ef4444';
      
      doc.fillColor(scoreColor).font('Helvetica-Bold').text(`${pillar.score} / 100`, 190 + textWidth + 4, rowY);
    });
    
    doc.y = scoreBlockY + 95;
    doc.moveDown(1.5);

    // --- FOUNDATIONAL PAGE VITALS MATRIX TABLE ---
    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Foundational Page Vitals Network Metrics', 40);
    doc.moveDown(0.5);
    
    const tableY = doc.y;
    const colWidth = 171;
    
    // Box 1: Load Speed Response
    doc.rect(40, tableY, colWidth, 45).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${analysis.loadTime}ms`, 40, tableY + 10, { width: colWidth, align: 'center' });
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Load Response Speed', 40, tableY + 25, { width: colWidth, align: 'center' });
    
    // Box 2: Payload Size Dimensions
    doc.rect(40 + colWidth, tableY, colWidth, 45).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${Math.round(analysis.pageSize / 1024)} KB`, 40 + colWidth, tableY + 10, { width: colWidth, align: 'center' });
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Total Payload Size', 40 + colWidth, tableY + 25, { width: colWidth, align: 'center' });
    
    // Box 3: Total Page Word Count
    doc.rect(40 + (colWidth * 2), tableY, colWidth + 2, 45).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${analysis.wordCount.toLocaleString()}`, 40 + (colWidth * 2), tableY + 10, { width: colWidth + 2, align: 'center' });
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Crawlable Word Count', 40 + (colWidth * 2), tableY + 25, { width: colWidth + 2, align: 'center' });

    doc.y = tableY + 60;
    doc.moveDown(1.5);

    // --- CRAWLED META DATA LOG CARDS (🎉 UPDATED: Isolated wrapping boundaries to avoid overflows) ---
    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Crawled Meta Parameters Profile', 40);
    doc.moveDown(0.5);

    const renderMetaCard = (label, val, description = '') => {
      const safeVal = val ? val : 'Missing / Not Found';
      
      // Dynamically measure variable value text height boundaries prior to box vector rendering
      const computedValueHeight = doc.heightOfString(safeVal, { width: 375 });
      const computedDescHeight = description ? doc.heightOfString(description, { width: 490 }) : 0;
      const dynamicCardHeight = Math.max(14 + computedValueHeight + computedDescHeight + 14, 46);

      checkPageOverflow(dynamicCardHeight + 5);
      const cardTopY = doc.y;
      
      doc.rect(40, cardTopY, 515, dynamicCardHeight - 6).fill('#fdfdfd').stroke('#f1f5f9');
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text(label, 52, cardTopY + 10, { width: 110 });
      
      doc.fillColor(val ? '#0f172a' : '#ef4444')
         .font(val ? 'Helvetica' : 'Helvetica-Oblique')
         .fontSize(9)
         .text(safeVal, 165, cardTopY + 10, { width: 375 });
      
      if (description) {
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(description, 52, cardTopY + 10 + computedValueHeight + 4, { width: 490 });
      }
      
      doc.y = cardTopY + dynamicCardHeight;
    };

    renderMetaCard('Meta Document Title', analysis.metaData.title, `Ideal Span: 50-60 chars | Collected Length: ${analysis.metaData.title?.length || 0} characters`);
    renderMetaCard('Meta Description', analysis.metaData.description, `Ideal Span: 150-160 chars | Collected Length: ${analysis.metaData.description?.length || 0} characters`);
    renderMetaCard('Canonical Router Tag', analysis.metaData.canonical);
    renderMetaCard('Indexation Rules (Robots)', analysis.metaData.robots);
    renderMetaCard('OpenGraph Title (OG)', analysis.metaData.ogTitle || analysis.metaData.title);

    // ==========================================
    // PAGE 2: ASSET DISTRIBUTION & ANALYSIS
    // ==========================================
    doc.addPage();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(`SitePulse AI | Comprehensive Audit: ${hostname}`, 40, 22);
    doc.moveTo(40, 34).lineTo(555, 34).strokeColor('#f1f5f9').lineWidth(1).stroke();
    doc.y = 50;

    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Document Object Model Asset Distribution', 40);
    doc.moveDown(0.6);

    const assetBlockY = doc.y;
    const halfWidth = 252;
    
    // Column Left: Anchor Link Structure Matrix
    doc.rect(40, assetBlockY, halfWidth, 75).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Hyperlink Connectivity Core', 52, assetBlockY + 10);
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    doc.text(`• Total Crawled Network Anchors: ${analysis.links.total}`, 55, assetBlockY + 28);
    doc.text(`• Internal Direct Routing Paths: ${analysis.links.internal}`, 55, assetBlockY + 41);
    doc.text(`• External Outbound References: ${analysis.links.external}`, 55, assetBlockY + 54);

    // Column Right: Accessibility Alt tags map
    doc.rect(303, assetBlockY, halfWidth, 75).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Image Optimization & Accessibility', 315, assetBlockY + 10);
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    doc.text(`• Total Discoverable Image Tags: ${analysis.images.total}`, 318, assetBlockY + 28);
    doc.text(`• Fully Documented Alt Formats: ${analysis.images.withAlt}`, 318, assetBlockY + 41);
    
    const imageAlertColor = analysis.images.withoutAlt > 0 ? '#ef4444' : '#10b981';
    doc.text(`• Missing Alt Attribute Violations: `, 318, assetBlockY + 54, { continued: true })
       .fillColor(imageAlertColor).font('Helvetica-Bold').text(`${analysis.images.withoutAlt} Alert`);

    doc.y = assetBlockY + 90;
    doc.moveDown(1.5);

    // --- STRUCTURAL HEADING ELEMENTS DIAGRAM ---
    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Semantic Structural Elements Architecture', 40);
    doc.moveDown(0.5);

    const headingTypes = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const maxHeadingCount = Math.max(analysis.headings.h1, analysis.headings.h2, analysis.headings.h3, analysis.headings.h4, analysis.headings.h5, analysis.headings.h6, 1);
    
    headingTypes.forEach((tag) => {
      const currentCount = analysis.headings[tag] || 0;
      const proportionalBarWidth = Math.max((currentCount / maxHeadingCount) * 415, currentCount > 0 ? 6 : 0);
      const rowY = doc.y;

      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(tag.toUpperCase(), 40, rowY + 4);
      
      doc.rect(70, rowY + 2, 440, 14).fill('#f1f5f9');
      if (proportionalBarWidth > 0) {
        doc.rect(70, rowY + 2, proportionalBarWidth, 14).fill(tag === 'h1' && currentCount !== 1 ? '#ef4444' : '#4f46e5');
      }

      doc.fillColor(tag === 'h1' && currentCount !== 1 ? '#ef4444' : '#0f172a').font('Helvetica-Bold').text(`${currentCount}`, 515, rowY + 4, { width: 40, align: 'right' });
      doc.y = rowY + 20;
    });

    if (analysis.headings.h1Texts && analysis.headings.h1Texts.length > 0) {
      doc.moveDown(0.4);
      const h1TextBoxY = doc.y;
      doc.rect(40, h1TextBoxY, 515, 38).fill('#f8fafc').stroke('#e2e8f0');
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Bold').text('First Extracted H1 Header String Value:', 50, h1TextBoxY + 6);
      doc.fillColor('#334155').font('Helvetica-Oblique').text(`"${analysis.headings.h1Texts[0]}"`, 50, h1TextBoxY + 18, { width: 495, height: 14, truncate: true });
      doc.y = h1TextBoxY + 44;
    }

    doc.moveDown(1.5);

    // --- KEYWORDS DENSITY METRICS INDEX ---
    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Target Keywords Density Focus Profiles', 40);
    doc.moveDown(0.5);

    if (analysis.keywords && analysis.keywords.length > 0) {
      const keywordHeaderY = doc.y;
      
      doc.rect(40, keywordHeaderY, 515, 18).fill('#4f46e5');
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('RANKING RELEVANT TERM', 55, keywordHeaderY + 5);
      doc.text('OCCURRENCES FREQUENCY', 260, keywordHeaderY + 5);
      doc.text('DENSITY PERCENTAGE BALANCE', 410, keywordHeaderY + 5);
      
      doc.y = keywordHeaderY + 18;

      analysis.keywords.slice(0, 5).forEach((kw, index) => {
        const keywordRowTopY = doc.y;
        doc.rect(40, keywordRowTopY, 515, 20).fill(index % 2 === 0 ? '#ffffff' : '#f8fafc').stroke('#f1f5f9');
        
        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(`#${index + 1}  ${kw.word}`, 55, keywordRowTopY + 5);
        doc.font('Helvetica').fillColor('#475569').text(`${kw.count} times`, 260, keywordRowTopY + 5);
        
        const isStuffingDanger = kw.density > 4.5;
        doc.fillColor(isStuffingDanger ? '#ef4444' : '#10b981')
           .font('Helvetica-Bold')
           .text(`${kw.density}% ${isStuffingDanger ? '(Stuffing Danger)' : '(Optimized)'}`, 410, keywordRowTopY + 5);
        
        doc.y = keywordRowTopY + 20;
      });
    } else {
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique').text('No primary density data extracted from target HTML parsing components.', 40);
    }

    // ==========================================
    // PAGE 3: ACTION RECOMMENDED AUDIT INDEX
    // ==========================================
    doc.addPage();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(`SitePulse AI | Comprehensive Audit: ${hostname}`, 40, 22);
    doc.moveTo(40, 34).lineTo(555, 34).strokeColor('#f1f5f9').lineWidth(1).stroke();
    doc.y = 50;

    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(`Action Item Recommendation Audit Index (${analysis.issues.length} flags)`, 40);
    doc.moveDown(0.6);

    analysis.issues.forEach((issue) => {
      const calculatedRecHeight = doc.heightOfString(`Recommendation Strategy: ${issue.recommendation}`, { width: 490 });
      const dynamicBoxCardHeight = 34 + calculatedRecHeight + 12;

      checkPageOverflow(dynamicBoxCardHeight);

      const boxY = doc.y;
      const isCritical = issue.severity === 'critical';
      const isWarning = issue.severity === 'warning';
      
      const themeBgColor = isCritical ? '#fef2f2' : isWarning ? '#fffbeb' : '#f0fdf4';
      const themeStrokeColor = isCritical ? '#fee2e2' : isWarning ? '#fef3c7' : '#dcfce7';
      const themeTextColor = isCritical ? '#991b1b' : isWarning ? '#9a3412' : '#166534';

      doc.rect(40, boxY, 515, dynamicBoxCardHeight - 8).fill(themeBgColor).stroke(themeStrokeColor);
      doc.fillColor(themeTextColor).fontSize(9.5).font('Helvetica-Bold').text(`[${issue.severity.toUpperCase()}] ${issue.message}`, 52, boxY + 10, { width: 490 });
      
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(`Recommendation Strategy: `, 52, boxY + 24, { continued: true })
         .fillColor('#475569').text(issue.recommendation, { width: 490 });
      
      doc.y = boxY + dynamicBoxCardHeight;
    });

    doc.end();

  } catch (error) {
    console.error("Comprehensive PDF compiling error encountered:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server tracking runtime compilation failure profiles." });
    }
  }
};