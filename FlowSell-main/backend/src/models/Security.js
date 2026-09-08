import mongoose from 'mongoose';
const {Schema,model} = mongoose;
const owner={type:Schema.Types.ObjectId,ref:'User',required:true,index:true};
const mediaSchema=new Schema({
  owner, publicId:{type:String,required:true,unique:true}, format:String, bytes:Number,
  state:{type:String,enum:['pending','ready','deleting'],default:'pending'}, legacyUrl:String,
}, {timestamps:true});
export const Media=model('Media',mediaSchema);
const usageSchema=new Schema({owner,month:String,messages:{type:Number,default:0},campaigns:{type:Number,default:0},searches:{type:Number,default:0},mediaBytes:{type:Number,default:0},uploads:{type:Number,default:0}}, {timestamps:true});
usageSchema.index({owner:1,month:1},{unique:true});
usageSchema.index({createdAt:1},{expireAfterSeconds:400*86400});
export const Usage=model('Usage',usageSchema);
const deliverySchema=new Schema({owner,key:{type:String,unique:true},orderId:String,templateId:Schema.Types.ObjectId,phase:String,status:{type:String,enum:['preparing','sending','sent','failed','uncertain','blocked']},reason:String,jobId:String}, {timestamps:true});
deliverySchema.index({createdAt:1},{expireAfterSeconds:400*86400});
export const Delivery=model('Delivery',deliverySchema);
const auditSchema=new Schema({actor:Schema.Types.ObjectId,target:Schema.Types.ObjectId,action:String,details:{plan:String,expiresAt:Date,requestId:String}}, {timestamps:true});
auditSchema.index({createdAt:1},{expireAfterSeconds:180*86400});
export const Audit=model('Audit',auditSchema);
export const PlanRequest=model('PlanRequest',new Schema({owner,plan:{type:String,enum:['free','premium','plus']},status:{type:String,enum:['pending','resolved'],default:'pending'}},{timestamps:true}));
const noticeSchema=new Schema({owner,orderId:String,pending:{type:Boolean,default:true},receivedAt:Date},{timestamps:true});
noticeSchema.index({owner:1,orderId:1},{unique:true});
noticeSchema.index({createdAt:1},{expireAfterSeconds:30*86400});
export const Notice=model('Notice',noticeSchema);
