import express from 'express';
import auth from "../middleware/auth.js"
import { analyzeUrl, deleteAnalysis, getAllAnalyses, getAnalysisById } from '../controllers/analysisController.js';
const analysisRouter=express.Router();

analysisRouter.post('/analyze',auth,analyzeUrl);
analysisRouter.get('/list',auth,getAllAnalyses);
analysisRouter.get('/:id',auth,getAnalysisById);
analysisRouter.delete('/:id',auth,deleteAnalysis);

export default analysisRouter;