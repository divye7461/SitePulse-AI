import KeywordTrackingModel from '../models/keywordTracking.js';
import { keywordTracking as keywordTrackingService } from '../services/keywordTrackingService.js';

// @desc    Add a new keyword to track
// @route   POST /api/rank/add
export const addKeyword = async (req, res) => {
    try {
        const { keyword, url } = req.body;

        if (!keyword || !url) {
            return res.status(400).json({ success: false, message: 'Keyword and URL are required' });
        }

        // Extract domain from the URL
        let domain;
        try {
            const urlObject = new URL(url.startsWith('http') ? url : `https://${url}`);
            domain = urlObject.hostname.replace('www.', '');
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid URL format' });
        }

        // Check if already tracking this keyword + domain combo for this user
        const existing = await KeywordTrackingModel.findOne({
            userId: req.userId,
            keyword: keyword.toLowerCase().trim(),
            domain
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'Already tracking this keyword for this domain' });
        }

        // Create tracking entry with a pending 'checking' status
        const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
        const tracking = await KeywordTrackingModel.create({
            userId: req.userId,
            keyword: keyword.toLowerCase().trim(),
            url: cleanUrl,
            domain,
            status: 'checking'
        });

        // Send immediate response back to frontend so it doesn't hang
        res.status(201).json({ success: true, message: 'Keyword tracking started', tracking });

        // Run the heavy rank tracking service in the background
        keywordTrackingService(tracking);

    } catch (error) {
        console.error('Add keyword error:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Already tracking this keyword' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all tracked keywords for logged-in user
// @route   GET /api/rank/list
export const getKeywords = async (req, res) => {
    try {
        const keywords = await KeywordTrackingModel.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .select('-rankHistory'); // Exclude full history for light list load

        res.status(200).json({ success: true, keywords });
    } catch (error) {
        console.error('Get keywords error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single keyword with its full history
// @route   GET /api/rank/:id
export const getKeyword = async (req, res) => {
    try {
        const tracking = await KeywordTrackingModel.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Keyword tracking not found' });
        }

        res.status(200).json({ success: true, tracking });
    } catch (error) {
        console.error('Get keyword error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Manually trigger a keyword ranking refresh
// @route   POST /api/rank/:id/refresh
export const refreshKeyword = async (req, res) => {
    try {
        const tracking = await KeywordTrackingModel.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Keyword tracking not found' });
        }

        // Set status back to checking and save immediately
        tracking.status = 'checking';
        await tracking.save();

        res.status(200).json({ success: true, message: 'Rank check started' });

        // Trigger asynchronous update
        keywordTrackingService(tracking);

    } catch (error) {
        console.error('Refresh keyword error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete a keyword tracking entry
// @route   DELETE /api/rank/:id
export const deleteKeyword = async (req, res) => {
    try {
        const tracking = await KeywordTrackingModel.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });

        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Keyword tracking not found' });
        }

        res.status(200).json({ success: true, message: 'Keyword tracking deleted' });
    } catch (error) {
        console.error('Delete keyword error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Toggle daily cron tracking active/inactive
// @route   PUT /api/rank/:id/toggle
export const toggleTracking = async (req, res) => {
    try {
        const tracking = await KeywordTrackingModel.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Keyword tracking not found' });
        }

        // Flip active boolean flag
        tracking.active = !tracking.active;
        await tracking.save();

        res.status(200).json({ success: true, tracking });
    } catch (error) {
        console.error('Toggle tracking error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};