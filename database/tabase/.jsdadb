import mongoose from 'mongoose';
import {config} from './config.js';
const {Schema}=mongoose;
export const User=mongoose.model('User',new Schema({username:{type:String,unique:true,required:true},name:String,phone:String,passwordHash:{type:String,required:true,select:false},role:{type:String,enum:['customer','staff','admin'],default:'customer'}},{timestamps:true}));
export const Session=mongoose.model('Session',new Schema({digest:{type:String,unique:true},user:{type:Schema.Types.ObjectId,ref:'User'},expiresAt:{type:Date,expires:0}},{timestamps:true}));
export const Queue=mongoose.model('Queue',new Schema({_id:String,revision:{type:Number,default:0},data:Schema.Types.Mixed}));
export async function connectDb(){await mongoose.connect(config.mongoUri,{serverSelectionTimeoutMS:8000});await Promise.all([User.init(),Session.init()]);}
