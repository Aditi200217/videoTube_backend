import mongoose,{Schema} from "mongoose";
const videoSchema=new Schema({
    videoFile:{
        type:String, //cloudinary
        required:true,
    },
    thumbnail:{
        type:String, //cloudinary
        required:true,
    },
    title:{
        type:String, 
        required:true,
    },
    description:{
        type:String, 
        required:true,
    },
    duration:{
        type:Number,
        required:true,
    },
    views:{
        type:Number, 
        default:0
    },
    isPublished:{
        type:Boolean, 
        default:true,
    },
    ownner:{
        type:Schema.Types.ObjectId, 
        ref:"User"
    },
},{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video=mongoose.model("Video",videoSchema);