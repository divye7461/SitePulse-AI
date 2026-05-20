import express from 'express';
import { getCurrentUser, loginUser, registerUser } from '../controllers/authController.js';
import auth from '../middleware/auth.js';

const authRouter = express.Router();   

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.get('/user',auth,getCurrentUser)

export default authRouter;