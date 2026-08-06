import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const revisionBase = {
  inquiry:{type:Schema.Types.ObjectId,ref:'Inquiry',required:true,index:true}, revision:{type:Number,default:0},
  status:{type:String,enum:['DRAFT','COMPLETED','APPROVED','LOCKED'],default:'DRAFT'}, isLocked:{type:Boolean,default:false},
  createdBy:{type:Schema.Types.ObjectId,ref:'User'}
};
const proposalOptions = {timestamps:true,optimisticConcurrency:true};

const commercialSchema = new Schema({ ...revisionBase, proposalNumber:String, client:{type:Schema.Types.ObjectId,ref:'Client'}, project:String,
  scopeOfSupply:String, quotedAmount:Number, currency:{type:String,default:'BDT'}, applicableTaxes:String, paymentTerms:String,
  deliveryPeriod:String, proposalValidity:String, warranty:String, exclusions:String, commercialTerms:String, generalTermsAndConditions:String,
  authorizedSignatory:{type:Schema.Types.ObjectId,ref:'User'} }, proposalOptions);
commercialSchema.index({inquiry:1,revision:1},{unique:true});
export const CommercialProposal=model('CommercialProposal',commercialSchema);

const technicalSchema = new Schema({ ...revisionBase, projectOverview:String, scopeOfWork:String, buildingSpecifications:String,
  designParameters:String, designLoads:String, materialSpecifications:String, roofSpecifications:String, wallSpecifications:String,
  claddingSpecifications:String, insulationSpecifications:String, accessories:String, canopies:String, surfacePreparation:String,
  paintSpecification:String, designCodes:String, standards:String, exclusions:String, technicalNotes:String, drawingReferences:[String] }, proposalOptions);
technicalSchema.index({inquiry:1,revision:1},{unique:true});
export const TechnicalProposal=model('TechnicalProposal',technicalSchema);

const drawingSchema = new Schema({ ...revisionBase, drawingNumber:{type:String,required:true}, drawingTitle:{type:String,required:true}, drawingType:String,
  preparedBy:{type:Schema.Types.ObjectId,ref:'User'}, checkedBy:{type:Schema.Types.ObjectId,ref:'User'}, approvedBy:{type:Schema.Types.ObjectId,ref:'User'}, issueDate:Date,
  document:{type:Schema.Types.ObjectId,ref:'Document'}, remarks:String }, proposalOptions);
drawingSchema.index({inquiry:1,drawingNumber:1,revision:1},{unique:true});
export const ProposalDrawing=model('ProposalDrawing',drawingSchema);

const reviewSchema = new Schema({ inquiry:{type:Schema.Types.ObjectId,ref:'Inquiry',required:true,index:true}, reviewedBy:{type:Schema.Types.ObjectId,ref:'User'},
  reviewDate:Date, decision:{type:String,enum:['PENDING','APPROVED','REVISION_REQUIRED','RETURNED_TO_ESTIMATION','RETURNED_TO_DESIGN','REJECTED'],default:'PENDING'},
  comments:String, approvalNumber:String, digitalSignature:String, approvedRevision:Number, forwardedToSales:{type:Boolean,default:false}, forwardedDate:Date,
  checklist:{type:Map,of:Boolean}, snapshot:{type:Schema.Types.Mixed} }, {timestamps:true,optimisticConcurrency:true});
export const GMReview=model('GMReview',reviewSchema);

const submissionSchema = new Schema({ inquiry:{type:Schema.Types.ObjectId,ref:'Inquiry',required:true,unique:true}, proposalReceivedDate:Date,
  submittedBy:{type:Schema.Types.ObjectId,ref:'User'}, submissionDate:Date, submissionMethod:{type:String,enum:['EMAIL','CLIENT_PORTAL','HAND_DELIVERY','COURIER','WHATSAPP','MEETING','OTHER']},
  recipientName:String,recipientEmail:String,recipientPhone:String,clientAcknowledgement:String,nextFollowUpDate:Date,submissionRemarks:String,
  proofDocument:{type:Schema.Types.ObjectId,ref:'Document'} },{timestamps:true});
export const SalesSubmission=model('SalesSubmission',submissionSchema);

const followUpSchema = new Schema({ inquiry:{type:Schema.Types.ObjectId,ref:'Inquiry',required:true,index:true},followUpDate:{type:Date,required:true},
  followUpType:{type:String,enum:['CALL','EMAIL','MEETING','WHATSAPP','SITE_VISIT','OTHER']},contactPerson:String,discussionSummary:String,
  clientResponse:String,nextAction:String,nextFollowUpDate:Date,createdBy:{type:Schema.Types.ObjectId,ref:'User'},attachments:[{type:Schema.Types.ObjectId,ref:'Document'}] },{timestamps:true});
export const FollowUp=model('FollowUp',followUpSchema);

const documentSchema = new Schema({ inquiryId:{type:Schema.Types.ObjectId,ref:'Inquiry',index:true},documentType:{type:String,required:true,index:true},documentNumber:String,
  title:{type:String,required:true},revision:{type:Number,default:0},fileName:String,filePath:String,mimeType:String,fileSize:Number,uploadedBy:{type:Schema.Types.ObjectId,ref:'User'},
  uploadedAt:{type:Date,default:Date.now},status:{type:String,enum:['ACTIVE','ARCHIVED','DELETED'],default:'ACTIVE'},isLocked:{type:Boolean,default:false},remarks:String },{timestamps:true});
export const Document=model('Document',documentSchema);

const notificationSchema = new Schema({recipient:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},title:String,message:String,type:String,link:String,isRead:{type:Boolean,default:false,index:true}},{timestamps:true});
export const Notification=model('Notification',notificationSchema);

const activitySchema = new Schema({user:{type:Schema.Types.ObjectId,ref:'User'},department:{type:Schema.Types.ObjectId,ref:'Department'},action:{type:String,required:true,index:true},entityType:String,entityId:Schema.Types.ObjectId,oldValue:Schema.Types.Mixed,newValue:Schema.Types.Mixed,description:String,ipAddress:String,userAgent:String,timestamp:{type:Date,default:Date.now,index:true}},{timestamps:false});
export const ActivityLog=model('ActivityLog',activitySchema);

export const MaterialRate=model('MaterialRate',new Schema({name:{type:String,required:true},category:String,unit:String,rate:{type:Number,required:true},currency:{type:String,default:'BDT'},effectiveFrom:Date,effectiveTo:Date,isActive:{type:Boolean,default:true}},{timestamps:true}));
export const TaxSetting=model('TaxSetting',new Schema({name:{type:String,required:true},percentage:{type:Number,required:true,min:0},isDefault:{type:Boolean,default:false},isActive:{type:Boolean,default:true}},{timestamps:true}));
export const ApprovalRule=model('ApprovalRule',new Schema({name:String,minValue:Number,maxValue:Number,requiredRole:String,isActive:{type:Boolean,default:true}},{timestamps:true}));
export const SystemSetting=model('SystemSetting',new Schema({key:{type:String,required:true,unique:true},value:Schema.Types.Mixed,description:String,isSecret:{type:Boolean,default:false}},{timestamps:true}));
