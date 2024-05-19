// require('dotenv').config({path:'./env'})
import 'dotenv/config'
import connectDB from "./db/index.js";
import { app } from './app.js';


connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`Server is running at port :${process.env.PORT}`);  
    })
})
.catch((err)=>{
    console.log(`Mongo db connection failed!!! `,err);
    
})































// import express from "express"
// const app=express();

// (async ()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on("error",(err)=>{
//             console.log(`ERR: `,err);
//             throw err;
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`App is listning on port ${process.env.PORT}`);
            
//         })
//     }
//     catch(err){
//         console.log(err);
//         throw err;
//     }
// })