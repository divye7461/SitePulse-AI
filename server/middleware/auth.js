import jwt from "jsonwebtoken";

const auth=async(req,res,next)=>{
    const authHeader=req.headers.authorization;     
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({success:false,message:"Unauthorized, No token"})
    }
    const token=authHeader.split(" ")[1];
    try {
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        req.userId=decoded.id;
        next();
    } catch (error) {
        console.error("Error in auth middleware:",error);
        res.status(401).json({success:false,message:"Unauthorized,token failed"})
    }
}

export default auth;