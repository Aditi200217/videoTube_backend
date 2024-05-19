import {v2 as cloudinary} from 'cloudinary';
// import { response } from 'express';
import fs from "fs"
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary= async (localFilePath)=>{
    try {
        if(!localFilePath){
        console.log(`Path not found`);
        return null;
        }
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"})
        // console.log(`File Uploded Successfull`,response);
        fs.unlinkSync(localFilePath)
        return response;
        
    } 
    catch (error) {
       fs.unlinkSync(localFilePath)//Remove  the temp file 
       return null;
    }
}

export {uploadOnCloudinary}
