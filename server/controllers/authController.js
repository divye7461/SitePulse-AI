import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Generate JWT Token

import jwt from "jsonwebtoken";

const generateToken=(id)=>{
    return jwt.sign({id},process.env.JWT_SECRET,{expiresIn:"30d"})
}
    
// Register User

export const registerUser=async(req,res)=>{
    try {
        const {name,email,password}=req.body;
        if(!name || !email || !password){
            return res.status(400).json({success:false,message:"All fields are required"})
        }

        // Check if user already exists

        const existingUser=await User.findOne({email});
        if(existingUser){
            return res.status(400).json({success:false,message:"User already exists"})
        }

        // Hash password

        const salt=await bcrypt.genSalt(10);
        const hashedPassword=await bcrypt.hash(password,salt);

        // Create new user

        const newUser=await User.create({
            name,
            email,
            password:hashedPassword
        })

        const token=generateToken(newUser._id);
        res.status(201).json({success:true,message:"User registered successfully",token})

    } catch (error) {
        console.error("Error in registerUser:",error)
        res.status(500).json({success:false,message:"Server error"})
    }
}


// Login User
export const loginUser=async(req,res)=>{
    try {
        const {email,password}=req.body;
        if(!email || !password){
            return res.status(400).json({success:false,message:"All fields are required"})
        }
        // Check if user exists
        const user=await User.findOne({email});
        if(!user){
            return res.status(400).json({success:false,message:"Invalid credentials"})
        }
        // Compare password
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({success:false,message:"Invalid credentials"})
        }
        const token=generateToken(user._id);
        res.status(200).json({success:true,message:"User logged in successfully",token})
    } catch (error) {
        console.error("Error in loginUser:",error)
        res.status(500).json({success:false,message:"Server error"})
    }
}

// Get Current User

export const getCurrentUser=async(req,res)=>{
    try {
        const user=await User.findById(req.userId).select("-password");
        if(!user){
            return res.status(404).json({success:false,message:"User not found"})
        }
        res.status(200).json({success:true,user})
    } catch (error) {
        console.error("Error in getCurrentUser:",error)
        res.status(500).json({success:false,message:"Server error"})
    }
}