import { SupabaseModel, modelRegistry } from './base.js';

export const Department = new SupabaseModel('Department', 'departments');
export const Role = new SupabaseModel('Role', 'roles');

export const User = new SupabaseModel('User', 'profiles', {
  role: 'Role',
  department: 'Department'
});

export const Client = new SupabaseModel('Client', 'clients', {
  createdBy: 'User'
});

export const Inquiry = new SupabaseModel('Inquiry', 'inquiries', {
  client: 'Client',
  currentDepartment: 'Department',
  assignedTo: 'User',
  createdBy: 'User'
});

export const InquiryTakingForm = new SupabaseModel('InquiryTakingForm', 'inquiry_taking_forms', {
  inquiry: 'Inquiry',
  createdBy: 'User'
});

export const DesignQuery = new SupabaseModel('DesignQuery', 'design_queries', {
  inquiry: 'Inquiry',
  raisedBy: 'User',
  assignedTo: 'User',
  assignedDepartment: 'Department'
});

export const JobInquiryForm = new SupabaseModel('JobInquiryForm', 'job_inquiry_forms', {
  inquiry: 'Inquiry',
  createdBy: 'User'
});

export const DesignTask = new SupabaseModel('DesignTask', 'design_tasks', {
  inquiry: 'Inquiry',
  assignedDesigner: 'User',
  assignedBy: 'User'
});

export const DesignWeightSummary = new SupabaseModel('DesignWeightSummary', 'design_weight_summaries', {
  inquiry: 'Inquiry',
  preparedBy: 'User',
  checkedBy: 'User',
  approvedBy: 'User'
});

export const CostingSheet = new SupabaseModel('CostingSheet', 'costing_sheets', {
  inquiry: 'Inquiry',
  createdBy: 'User'
});

// Register models
modelRegistry.Department = Department;
modelRegistry.Role = Role;
modelRegistry.User = User;
modelRegistry.Client = Client;
modelRegistry.Inquiry = Inquiry;
modelRegistry.InquiryTakingForm = InquiryTakingForm;
modelRegistry.DesignQuery = DesignQuery;
modelRegistry.JobInquiryForm = JobInquiryForm;
modelRegistry.DesignTask = DesignTask;
modelRegistry.DesignWeightSummary = DesignWeightSummary;
modelRegistry.CostingSheet = CostingSheet;
