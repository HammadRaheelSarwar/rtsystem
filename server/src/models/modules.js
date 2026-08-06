import { SupabaseModel, modelRegistry } from './base.js';

export const CommercialProposal = new SupabaseModel('CommercialProposal', 'commercial_proposals', {
  inquiry: 'Inquiry',
  client: 'Client',
  createdBy: 'User',
  authorizedSignatory: 'User'
});

export const TechnicalProposal = new SupabaseModel('TechnicalProposal', 'technical_proposals', {
  inquiry: 'Inquiry',
  createdBy: 'User'
});

export const ProposalDrawing = new SupabaseModel('ProposalDrawing', 'proposal_drawings', {
  inquiry: 'Inquiry',
  preparedBy: 'User',
  checkedBy: 'User',
  approvedBy: 'User',
  createdBy: 'User',
  document: 'Document'
});

export const GMReview = new SupabaseModel('GMReview', 'gm_reviews', {
  inquiry: 'Inquiry',
  reviewedBy: 'User'
});

export const SalesSubmission = new SupabaseModel('SalesSubmission', 'sales_submissions', {
  inquiry: 'Inquiry',
  submittedBy: 'User',
  proofDocument: 'Document'
});

export const FollowUp = new SupabaseModel('FollowUp', 'follow_ups', {
  inquiry: 'Inquiry',
  createdBy: 'User'
});

export const Document = new SupabaseModel('Document', 'documents', {
  inquiryId: 'Inquiry',
  uploadedBy: 'User'
});

export const Notification = new SupabaseModel('Notification', 'notifications', {
  recipient: 'User'
});

export const ActivityLog = new SupabaseModel('ActivityLog', 'activity_logs', {
  user: 'User',
  department: 'Department'
});

export const MaterialRate = new SupabaseModel('MaterialRate', 'material_rates');
export const TaxSetting = new SupabaseModel('TaxSetting', 'tax_settings');
export const ApprovalRule = new SupabaseModel('ApprovalRule', 'approval_rules');
export const SystemSetting = new SupabaseModel('SystemSetting', 'system_settings');

// Register models
modelRegistry.CommercialProposal = CommercialProposal;
modelRegistry.TechnicalProposal = TechnicalProposal;
modelRegistry.ProposalDrawing = ProposalDrawing;
modelRegistry.GMReview = GMReview;
modelRegistry.SalesSubmission = SalesSubmission;
modelRegistry.FollowUp = FollowUp;
modelRegistry.Document = Document;
modelRegistry.Notification = Notification;
modelRegistry.ActivityLog = ActivityLog;
modelRegistry.MaterialRate = MaterialRate;
modelRegistry.TaxSetting = TaxSetting;
modelRegistry.ApprovalRule = ApprovalRule;
modelRegistry.SystemSetting = SystemSetting;
