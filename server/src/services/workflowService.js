import { Inquiry, Department, JobInquiryForm, DesignWeightSummary, CostingSheet, CommercialProposal, TechnicalProposal, ProposalDrawing, GMReview } from '../models/index.js';
import { DEPARTMENT_FOR_STATUS } from '../constants/workflow.js';
import { AppError } from '../utils/http.js';
import { notifyRole } from './notificationService.js';

export const TRANSITIONS = {
  DRAFT:['ITF_CREATED','CANCELLED'], ITF_CREATED:['SENT_TO_ESTIMATION'], SENT_TO_ESTIMATION:['UNDER_ESTIMATION_REVIEW'],
  UNDER_ESTIMATION_REVIEW:['CLARIFICATION_REQUIRED','JIF_IN_PROGRESS'], CLARIFICATION_REQUIRED:['CLARIFICATION_RECEIVED'],
  CLARIFICATION_RECEIVED:['JIF_IN_PROGRESS'], JIF_IN_PROGRESS:['JIF_COMPLETED'], JIF_COMPLETED:['SENT_TO_DESIGN'],
  SENT_TO_DESIGN:['UNDER_DESIGN_REVIEW'], UNDER_DESIGN_REVIEW:['DESIGN_QUERY_RAISED','DESIGN_IN_PROGRESS'],
  DESIGN_QUERY_RAISED:['WAITING_FOR_DESIGN_CLARIFICATION'], WAITING_FOR_DESIGN_CLARIFICATION:['DESIGN_IN_PROGRESS'],
  DESIGN_IN_PROGRESS:['DWS_COMPLETED'], DWS_COMPLETED:['RETURNED_TO_ESTIMATION'], RETURNED_TO_ESTIMATION:['COSTING_IN_PROGRESS'],
  COSTING_IN_PROGRESS:['COSTING_COMPLETED'], COSTING_COMPLETED:['COMMERCIAL_PROPOSAL_PREPARED'],
  COMMERCIAL_PROPOSAL_PREPARED:['TECHNICAL_PROPOSAL_PREPARED'], TECHNICAL_PROPOSAL_PREPARED:['PROPOSAL_PACKAGE_COMPLETED'],
  PROPOSAL_PACKAGE_COMPLETED:['SUBMITTED_TO_GM'], SUBMITTED_TO_GM:['UNDER_GM_REVIEW'],
  UNDER_GM_REVIEW:['GM_APPROVED','GM_REVISION_REQUIRED','GM_REJECTED','RETURNED_TO_ESTIMATION','RETURNED_TO_DESIGN'],
  GM_REVISION_REQUIRED:['RETURNED_TO_ESTIMATION','RETURNED_TO_DESIGN'], GM_APPROVED:['FORWARDED_TO_SALES'],
  FORWARDED_TO_SALES:['READY_FOR_CLIENT_SUBMISSION'], READY_FOR_CLIENT_SUBMISSION:['SUBMITTED_TO_CLIENT'],
  SUBMITTED_TO_CLIENT:['CLIENT_REVIEWING','FOLLOW_UP_REQUIRED'], CLIENT_REVIEWING:['FOLLOW_UP_REQUIRED','UNDER_NEGOTIATION','WON','LOST','ON_HOLD','CANCELLED'],
  FOLLOW_UP_REQUIRED:['CLIENT_REVIEWING','UNDER_NEGOTIATION','WON','LOST','ON_HOLD','CANCELLED'],
  UNDER_NEGOTIATION:['REVISED_PROPOSAL_REQUIRED','WON','LOST','ON_HOLD','CANCELLED'],
  REVISED_PROPOSAL_REQUIRED:['RETURNED_TO_ESTIMATION'], ON_HOLD:['CLIENT_REVIEWING','CANCELLED'],
  WON:['ARCHIVED'], LOST:['ARCHIVED'], CANCELLED:['ARCHIVED'], GM_REJECTED:['ARCHIVED']
};

const ROLE_TRANSITIONS = {
  SALES:['ITF_CREATED','SENT_TO_ESTIMATION','CLARIFICATION_RECEIVED','READY_FOR_CLIENT_SUBMISSION','SUBMITTED_TO_CLIENT','CLIENT_REVIEWING','FOLLOW_UP_REQUIRED','UNDER_NEGOTIATION','REVISED_PROPOSAL_REQUIRED','WON','LOST','ON_HOLD','CANCELLED'],
  ESTIMATION:['UNDER_ESTIMATION_REVIEW','CLARIFICATION_REQUIRED','JIF_IN_PROGRESS','JIF_COMPLETED','SENT_TO_DESIGN','DESIGN_IN_PROGRESS','RETURNED_TO_ESTIMATION','COSTING_IN_PROGRESS','COSTING_COMPLETED','COMMERCIAL_PROPOSAL_PREPARED','TECHNICAL_PROPOSAL_PREPARED','PROPOSAL_PACKAGE_COMPLETED','SUBMITTED_TO_GM'],
  DESIGN:['UNDER_DESIGN_REVIEW','DESIGN_QUERY_RAISED','WAITING_FOR_DESIGN_CLARIFICATION','DESIGN_IN_PROGRESS','DWS_COMPLETED','RETURNED_TO_ESTIMATION'],
  GM:['UNDER_GM_REVIEW','GM_APPROVED','GM_REVISION_REQUIRED','GM_REJECTED','RETURNED_TO_ESTIMATION','RETURNED_TO_DESIGN','FORWARDED_TO_SALES'],
  ADMIN:[]
};

async function assertPackageComplete(inquiryId,revision){
  const [jif,dws,costing,commercial,technical,drawing] = await Promise.all([
    JobInquiryForm.findOne({inquiry:inquiryId,revision,status:{$in:['COMPLETED','SUBMITTED']}}),
    DesignWeightSummary.findOne({inquiry:inquiryId,revision,status:'SUBMITTED'}),
    CostingSheet.findOne({inquiry:inquiryId,revision,status:'COMPLETED'}),
    CommercialProposal.findOne({inquiry:inquiryId,revision,status:'COMPLETED'}),
    TechnicalProposal.findOne({inquiry:inquiryId,revision,status:'COMPLETED'}),
    ProposalDrawing.exists({inquiry:inquiryId,revision,status:'COMPLETED'})
  ]);
  const missing=[]; if(!jif)missing.push('JIF');if(!dws)missing.push('DWS');if(!costing)missing.push('Costing Sheet');if(!commercial)missing.push('Commercial Proposal');if(!technical)missing.push('Technical Proposal');if(!drawing)missing.push('Proposal Drawing');
  if(missing.length) throw new AppError(`Package incomplete: ${missing.join(', ')}`,409,'PACKAGE_INCOMPLETE',{missing});
}

export async function transitionInquiry({inquiryId,to,user,comments,returnDepartment}){
  const inquiry=await Inquiry.findById(inquiryId);
  if(!inquiry) throw new AppError('Inquiry not found',404,'NOT_FOUND');
  const role=user.role?.name||user.role;
  const allowed=TRANSITIONS[inquiry.currentStatus]||[];
  if(!allowed.includes(to)) throw new AppError(`Invalid transition: ${inquiry.currentStatus} → ${to}`,409,'INVALID_TRANSITION',{allowed});
  if(role!=='ADMIN' && !(ROLE_TRANSITIONS[role]||[]).includes(to)) throw new AppError(`${role} cannot perform this transition`,403,'FORBIDDEN');
  if(to==='SUBMITTED_TO_GM') await assertPackageComplete(inquiry._id,inquiry.revisionNumber);
  if(['GM_REVISION_REQUIRED','RETURNED_TO_ESTIMATION','RETURNED_TO_DESIGN'].includes(to) && !comments?.trim()) throw new AppError('Revision/return comments are required',422,'COMMENTS_REQUIRED');
  if(to==='SUBMITTED_TO_CLIENT' && (!inquiry.packageLocked || inquiry.approvedRevision!==inquiry.revisionNumber)) throw new AppError('Client submission is blocked until the current revision is approved and locked by GM',409,'GM_APPROVAL_REQUIRED');
  const departmentName=returnDepartment||DEPARTMENT_FOR_STATUS[to];
  const department=departmentName?await Department.findOne({name:departmentName}):null;
  inquiry.currentStatus=to; if(department) inquiry.currentDepartment=department._id;
  if(to==='GM_APPROVED'){ inquiry.packageLocked=true; inquiry.approvedRevision=inquiry.revisionNumber; inquiry.approvedAt=new Date(); await lockRevision(inquiry); }
  await inquiry.save();
  const roleByDepartment={'Sales':'SALES','Estimation':'ESTIMATION','Design':'DESIGN','General Management':'GM','Administration':'ADMIN'};
  const recipientRole=roleByDepartment[departmentName];
  if(recipientRole && recipientRole!==role) await notifyRole({role:recipientRole,title:`Inquiry ${inquiry.inquiryNumber}: ${to.replaceAll('_',' ')}`,message:`${inquiry.projectName} has moved to ${to.replaceAll('_',' ').toLowerCase()}.`,type:'WORKFLOW',link:`/inquiries/${inquiry._id}`,email:['SUBMITTED_TO_GM','GM_REVISION_REQUIRED','GM_APPROVED','FORWARDED_TO_SALES'].includes(to)});
  return inquiry;
}

async function lockRevision(inquiry){
  const filter={inquiry:inquiry._id,revision:inquiry.revisionNumber};
  await Promise.all([JobInquiryForm,DesignWeightSummary,CostingSheet,CommercialProposal,TechnicalProposal,ProposalDrawing].map(M=>M.updateMany(filter,{$set:{isLocked:true,status:'LOCKED'}})));
}

export async function createRevision(inquiryId,user,reason){
  const inquiry=await Inquiry.findById(inquiryId);
  if(!inquiry) throw new AppError('Inquiry not found',404);
  if(!inquiry.packageLocked) throw new AppError('A new revision is only required after approval lock',409);
  inquiry.revisionNumber+=1; inquiry.packageLocked=false; inquiry.currentStatus='RETURNED_TO_ESTIMATION'; inquiry.approvedRevision=undefined;
  await inquiry.save(); return inquiry;
}

export function assertUnlocked(document){ if(document?.isLocked) throw new AppError('Approved revision is locked. Create a new revision to make changes.',423,'REVISION_LOCKED'); }
