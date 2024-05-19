import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/users.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


const generateAccessAndRefreshToken =  async(userId)=> {
    try {
        const user= await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access token")
    }
}

const registerUser=asyncHandler(async (req,res)=>{
    const{fullName,email,username,password}=req.body;
    // console.log(req.body);
    
    if(
        [fullName,email.username,password].some((feild)=>
    feild?.trim()==="")){
        throw new ApiError(400,"All fields required")
    }
    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User already Exists")
    }

    const avatarLocalPath=req.files?.avatar[0]?.path;
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
    coverImageLocalPath=req.files?.coverImage[0]?.path;}
    // console.log(coverImage.LocalPath);
    

    if(!avatarLocalPath)
    throw new ApiError(400,"Avatar file is required");

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // if(coverImageLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
    throw new ApiError(400,"Avatar file is required");

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user ");
    }
    
    return res.status(201).json(
         new ApiResponse(200,createdUser,"User Registered Successfully")
    )
})

const loginUser= asyncHandler(async (req,res)=>{
    //req -> data
    //username and email
    //find one
    //password match
    //access and refresh token
    //send cookie

    const {email,username,password} = req.body;

    if(!username && !email){
        throw new ApiError(400,"username or email required");
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user)
    throw new ApiError(404,"User doesnt exists");

    const validPassword = await user.isPasswordCorrect(password)

    if(!validPassword){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser=await User.findOne(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true, 
        secure:true
    }
    

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            }
        },{
            new :true
        }
    )

    const options ={
        httpOnly:true, 
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
});

const refreshAccessToken =  asyncHandler(async(req,res)=>{  
  const incomingRefreshToken =  req.cookie.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.ACCESS_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401,"Invalid refresh token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh token expired or used")
    }
  
    const options = {
      httpOnly:true,
      secure:true
    }
  
    const {newAccessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    return res
    .status(200)
    .cookie("accessToken",newAccessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
      new ApiResponse(
          200,
          {accessToken,refreshToken:newRefreshToken},
          "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
  }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body;

    const user= await User.findById(req.user?._id)
    const correctPassword = await user.isPasswordCorrect(oldPassword);

    if(!correctPassword){
        throw new ApiError(400,"Incorrect Password");
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed Successfully"));
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(200,req.user,"Current user fetched successfully")
})

const updateAccontDetails = asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName && !email){
        throw new ApiError(400,"Enter data to update");
    }

    User.findByIdAndUpdate(
        req.user?._id,
        {
            if(fullName){
                $set:{
                    fullName
                }
            },
            if(email){
                $set:{
                    email
                }
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated Successfully"))
})

const updateUserAvatar= asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar");
    }

    const user =  User.findByIdAndUpdate(
        req.user?._id,
    {
        $set:{
            avatar:avatar.url
        }
    },{new:true})

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover Image updated Successfully")
    )
})

const updateUserCoverImage= asyncHandler(async(req,res)=>{

    const coverImageLocalPath= req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading cover image");
    }
   
    const user = User.findByIdAndUpdate(
        res.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover Image updated Successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400,"username missing");
    }

    const channel = await User.aggregate([
        {
        $match:{
            username:username?.tolowerCase()
        }
    },
    {
        $lookup:
        {from:"subscription",
        localFeild:"._id",
        foreignFeild:"channel",
        as:"subscribers"}
    },
    {
        $lookup:{
        from:"subscription",
        localFeild:"._id",
        foreignFeild:"subscriber",
        as:"subscribedTo"}
    },
    {
        $addFields:{
            subcribersCount:{
                $size:"$subscribers"
            },
            channelsSubscribedToCount:{
                $size:"$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$.subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{
            fullName:1,
            username:1,
            subcribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
        }
    }
])
    if(!channel?.length){
        throw new ApiError(404,"Channel does not exists");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,"User channel fetched "));
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user =  await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: "videos",
            localFeild:"watchHistory",
            foreignFeild:"_id",
            as:"watchHistory",
            pipeline:[
                {
                    $lookup:{
                        from : "users",
                        localFeild:"owner",
                        foreignFeild:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                            },
                            {
                                $addFields:{
                                    owner:{
                                        $first:"$owner"
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export {registerUser,getWatchHistory,loginUser,getUserChannelProfile,logoutUser,refreshAccessToken,getCurrentUser,updateAccontDetails,changeCurrentPassword,updateUserAvatar, updateUserCoverImage}