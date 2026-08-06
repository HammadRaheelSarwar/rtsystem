import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { WORKFLOW_STATUSES } from '../constants/workflow.js';

const { Schema, model } = mongoose;
const softDelete = { isDeleted:{ type:Boolean, default:false, index:true }, deletedAt:Date };

const departmentSchema = new Schema({
  name:{ type:String, required:true, unique:true, trim:true }, code:{ type:String, required:true, unique:true, uppercase:true },
  description:String, isActive:{ type:Boolean, default:true }
}, { timestamps:true });
export const Department = model('Department', departmentSchema);

const roleSchema = new Schema({
  name:{ type:String, required:true, unique:true, uppercase:true }, description:String,
  permissions:[{ type:String }], isActive:{ type:Boolean, default:true }
}, { timestamps:true });
export const Role = model('Role', roleSchema);

const userSchema = new Schema({
  name:{ type:String, required:true, trim:true }, email:{ type:String, required:true, unique:true, lowercase:true, trim:true },
  password:{ type:String, required:true, select:false }, role:{ type:Schema.Types.ObjectId, ref:'Role', required:true },
  department:{ type:Schema.Types.ObjectId, ref:'Department' }, phone:String, designation:String,
  isActive:{ type:Boolean, default:true }, passwordResetToken:{ type:String, select:false }, passwordResetExpires:{ type:Date, select:false },
  refreshTokens:[{ tokenHash:{ type:String, required:true }, expiresAt:Date }], lastLogin:Date, ...softDelete
}, { timestamps:true, optimisticConcurrency:true });
userSchema.pre('save', async function(){ if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12); });
userSchema.methods.comparePassword = function(value){ return bcrypt.compare(value, this.password); };
userSchema.methods.toSafeObject = function(){ const o=this.toObject(); delete o.password; delete o.refreshTokens; delete o.passwordResetToken; return o; };
export const User = model('User', userSchema);

const clientSchema = new Schema({
  clientCode:{ type:String, required:true, unique:true, uppercase:true, trim:true }, companyName:{ type:String, required:true, index:true },
  contactPerson:String, designation:String, email:{ type:String, lowercase:true }, phone:String, alternatePhone:String,
  address:String, city:String, country:String, industry:String, website:String, taxNumber:String, notes:String,
  status:{ type:String, enum:['ACTIVE','INACTIVE'], default:'ACTIVE', index:true }, createdBy:{ type:Schema.Types.ObjectId, ref:'User' }, ...softDelete
}, { timestamps:true, optimisticConcurrency:true });
clientSchema.index({ companyName:'text', clientCode:'text', contactPerson:'text' });
export const Client = model('Client', clientSchema);

const inquirySchema = new Schema({
  inquiryNumber:{ type:String, required:true, unique:true, index:true }, revisionNumber:{ type:Number, default:0 },
  client:{ type:Schema.Types.ObjectId, ref:'Client', required:true, index:true }, consultant:String,
  projectName:{ type:String, required:true }, projectDescription:String, projectLocation:String,
  inquiryType:String, urgency:{ type:String, enum:['LOW','NORMAL','HIGH','CRITICAL'], default:'NORMAL' }, quoteBasis:String,
  proposalSubmissionDate:Date, designRequiredDate:Date, currentDepartment:{ type:Schema.Types.ObjectId, ref:'Department' },
  assignedTo:{ type:Schema.Types.ObjectId, ref:'User' }, currentStatus:{ type:String, enum:WORKFLOW_STATUSES, default:'DRAFT', index:true },
  source:String, priority:{ type:String, enum:['LOW','NORMAL','HIGH','URGENT'], default:'NORMAL' },
  finalResult:{ status:String, lostReason:String, finalAgreedValue:Number, awardDate:Date, purchaseOrderNumber:String, expectedProjectStartDate:Date },
  approvedRevision:Number, approvedAt:Date, packageLocked:{ type:Boolean, default:false }, archivedAt:Date,
  createdBy:{ type:Schema.Types.ObjectId, ref:'User', required:true }, ...softDelete
}, { timestamps:true, optimisticConcurrency:true });
inquirySchema.index({ projectName:'text', inquiryNumber:'text', consultant:'text' });
export const Inquiry = model('Inquiry', inquirySchema);

const attachmentSchema = new Schema({ document:{ type:Schema.Types.ObjectId, ref:'Document' }, label:String }, { _id:false });
const itfSchema = new Schema({
  inquiry:{ type:Schema.Types.ObjectId, ref:'Inquiry', required:true, unique:true }, revision:{ type:Number, default:0 }, status:{ type:String, enum:['DRAFT','SUBMITTED','RETURNED'], default:'DRAFT' },
  clientInfo:{ client:Schema.Types.ObjectId, consultant:String, contactPerson:String, phone:String, email:String, projectName:String, projectLocation:String },
  inquiryInfo:{ inquiryType:String, inquirySource:String, urgency:String, proposalSubmissionDate:Date, quoteBasis:String, requiredCompletionDate:Date },
  requirements:{ projectDescription:String, quantityOfBuildings:Number, buildingUsage:String, approximateWidth:Number, approximateLength:Number, approximateHeight:Number, area:Number, unitOfMeasurement:String, siteConditions:String, clientSpecifications:String, specialRequirements:String, remarks:String },
  attachments:[attachmentSchema], createdBy:{ type:Schema.Types.ObjectId, ref:'User' }, submittedAt:Date
}, { timestamps:true, optimisticConcurrency:true });
export const InquiryTakingForm = model('InquiryTakingForm', itfSchema);

const querySchema = new Schema({
  inquiry:{ type:Schema.Types.ObjectId, ref:'Inquiry', required:true, index:true }, queryNumber:{ type:String, required:true, unique:true },
  title:{ type:String, required:true }, description:{ type:String, required:true }, raisedBy:{ type:Schema.Types.ObjectId, ref:'User' },
  assignedTo:{ type:Schema.Types.ObjectId, ref:'User' }, assignedDepartment:{ type:Schema.Types.ObjectId, ref:'Department' },
  priority:{ type:String, enum:['LOW','NORMAL','HIGH','URGENT'], default:'NORMAL' }, status:{ type:String, enum:['OPEN','IN_PROGRESS','RESPONDED','RESOLVED','REOPENED','CLOSED'], default:'OPEN' },
  response:String, attachments:[attachmentSchema], raisedAt:{ type:Date, default:Date.now }, respondedAt:Date, resolvedAt:Date, type:{ type:String, enum:['ESTIMATION','DESIGN'], default:'ESTIMATION' }
}, { timestamps:true });
export const DesignQuery = model('DesignQuery', querySchema);

const dynamicRow = new Schema({ location:String, thickness:String, description:String, profile:String, density:String, quantity:Number, dimensions:String }, { _id:true });
const jifSchema = new Schema({
  inquiry:{ type:Schema.Types.ObjectId, ref:'Inquiry', required:true, index:true }, revision:{ type:Number, default:0 }, revisionCause:String,
  status:{ type:String, enum:['DRAFT','COMPLETED','SUBMITTED','LOCKED'], default:'DRAFT' }, general:{ type:Schema.Types.Mixed, default:{} },
  project:{ type:Schema.Types.Mixed, default:{} }, buildingParameters:{ type:Schema.Types.Mixed, default:{} }, roofWallConditions:{ type:Schema.Types.Mixed, default:{} },
  cladding:[dynamicRow], insulation:[dynamicRow], accessories:[dynamicRow], canopies:[{ quantity:Number, location:String, eaveCondition:String, width:Number, length:Number, clearHeight:Number, soffitPanelIncluded:Boolean }],
  paintSpecification:{ type:Schema.Types.Mixed, default:{} }, designLoads:{ type:Schema.Types.Mixed, default:{} }, comments:{ type:Schema.Types.Mixed, default:{} },
  review:{ type:Schema.Types.Mixed, default:{} }, checklist:{ type:Map, of:Boolean }, createdBy:{ type:Schema.Types.ObjectId, ref:'User' }, submittedAt:Date, isLocked:{ type:Boolean, default:false }
}, { timestamps:true, optimisticConcurrency:true });
jifSchema.index({ inquiry:1, revision:1 }, { unique:true });
export const JobInquiryForm = model('JobInquiryForm', jifSchema);

const designTaskSchema = new Schema({
  inquiry:{ type:Schema.Types.ObjectId, ref:'Inquiry', required:true, unique:true }, assignedDesigner:{ type:Schema.Types.ObjectId, ref:'User' }, assignedBy:{ type:Schema.Types.ObjectId, ref:'User' },
  startDate:Date, targetDate:Date, actualCompletionDate:Date, priority:{ type:String, default:'NORMAL' },
  designStatus:{ type:String, enum:['PENDING','ACCEPTED','QUERY_RAISED','WAITING_FOR_CLARIFICATION','IN_PROGRESS','COMPLETED','RETURNED_TO_ESTIMATION','OVERDUE'], default:'PENDING' }, remarks:String, internalNotes:[{ text:String, by:Schema.Types.ObjectId, at:{type:Date,default:Date.now} }]
}, { timestamps:true });
export const DesignTask = model('DesignTask', designTaskSchema);

const buildingWeightSchema = new Schema({
  buildingName:String, buildingNumber:String, buildingArea:{ type:Number, min:0 }, mainFrameWeight:{type:Number,default:0}, secondarySteelWeight:{type:Number,default:0}, bracingWeight:{type:Number,default:0}, claddingWeight:{type:Number,default:0}, accessoriesWeight:{type:Number,default:0}, canopyWeight:{type:Number,default:0}, miscellaneousWeight:{type:Number,default:0}, totalSteelWeight:Number, weightPerSquareFoot:Number, weightPerSquareMeter:Number, designAssumptions:String, drawingReferences:[String]
});
const dwsSchema = new Schema({ inquiry:{type:Schema.Types.ObjectId,ref:'Inquiry',required:true,index:true}, revision:{type:Number,default:0}, status:{type:String,enum:['DRAFT','SUBMITTED','LOCKED'],default:'DRAFT'}, buildings:[buildingWeightSchema], preparedBy:Schema.Types.ObjectId, checkedBy:Schema.Types.ObjectId, approvedBy:Schema.Types.ObjectId, completionDate:Date, remarks:String, isLocked:{type:Boolean,default:false} }, {timestamps:true,optimisticConcurrency:true});
dwsSchema.index({inquiry:1,revision:1},{unique:true});
export const DesignWeightSummary = model('DesignWeightSummary', dwsSchema);

const costingSchema = new Schema({
  inquiry:{type:Schema.Types.ObjectId,ref:'Inquiry',required:true,index:true}, revision:{type:Number,default:0}, status:{type:String,enum:['DRAFT','COMPLETED','LOCKED'],default:'DRAFT'},
  basics:{ buildingArea:Number, buildingWeight:Number, weightPerSquareFoot:Number, weightPerSquareMetre:Number, currency:{type:String,default:'BDT'}, exchangeRate:{type:Number,default:1} },
  materialCosts:{ primarySteelRate:{type:Number,default:0}, secondarySteelRate:{type:Number,default:0}, claddingRate:{type:Number,default:0}, insulationRate:{type:Number,default:0}, accessoriesRate:{type:Number,default:0}, canopyRate:{type:Number,default:0}, paintRate:{type:Number,default:0}, nonStandardMaterialRate:{type:Number,default:0} },
  serviceCosts:{ designCost:{type:Number,default:0}, fabricationCost:{type:Number,default:0}, transportationCost:{type:Number,default:0}, erectionCost:{type:Number,default:0}, installationCost:{type:Number,default:0}, testingCost:{type:Number,default:0}, otherCost:{type:Number,default:0} },
  commercial:{ subtotal:Number, overheadPercentage:{type:Number,default:0}, overheadAmount:Number, profitMarginPercentage:{type:Number,default:0}, profitAmount:Number, discountPercentage:{type:Number,default:0}, discountAmount:Number, applicableTaxPercentage:{type:Number,default:0}, taxAmount:Number, finalQuotationAmount:Number, pricePerSquareFoot:Number, pricePerSquareMetre:Number, pricePerKilogram:Number },
  calculationSnapshot:{type:Schema.Types.Mixed}, isLocked:{type:Boolean,default:false}, createdBy:Schema.Types.ObjectId
}, {timestamps:true,optimisticConcurrency:true});
costingSchema.index({inquiry:1,revision:1},{unique:true});
export const CostingSheet = model('CostingSheet', costingSchema);
