const snake = value => value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const columns = (names, aliases = {}) => Object.fromEntries([
  ...names.map(name => [name, snake(name)]),
  ...Object.entries(aliases)
]);

export const modelSchemas = {
  Department: { columns: columns(['name', 'code', 'description', 'isActive']) },
  Role: { columns: columns(['name', 'code', 'description', 'permissions', 'isActive']) },
  User: {
    table: 'profiles',
    sourceCollection: 'users',
    columns: columns(
      ['email', 'phone', 'designation', 'avatarUrl', 'digitalSignatureUrl', 'roleName', 'isActive', 'isDeleted', 'deletedAt', 'refreshTokens', 'passwordResetToken', 'passwordResetExpires'],
      { name: 'full_name', password: 'password_hash', department: 'department_id', role: 'role_id' }
    )
  },
  Client: { columns: columns(['clientCode', 'companyName', 'contactPerson', 'designation', 'email', 'phone', 'alternatePhone', 'address', 'city', 'country', 'industry', 'website', 'taxNumber', 'notes', 'status', 'createdBy', 'deletedAt']) },
  Inquiry: {
    columns: columns(
      ['inquiryNumber', 'revisionNumber', 'consultantName', 'projectName', 'projectDescription', 'projectLocation', 'inquiryType', 'urgency', 'quoteBasis', 'proposalSubmissionDate', 'designRequiredDate', 'source', 'priority', 'currentStatus', 'finalResult', 'gmApprovedAt', 'forwardedToSalesAt', 'submittedToClientAt', 'createdBy', 'deletedAt'],
      { client: 'client_id', currentDepartment: 'current_department_id', assignedTo: 'assigned_to', packageLocked: 'is_locked' }
    )
  },
  InquiryTakingForm: {
    columns: columns(
      ['contactPerson', 'contactPhone', 'contactEmail', 'quantityOfBuildings', 'buildingUsage', 'approximateWidth', 'approximateLength', 'approximateHeight', 'approximateArea', 'unitOfMeasurement', 'siteConditions', 'clientSpecifications', 'specialRequirements', 'salesRemarks', 'status', 'submittedAt', 'createdBy', 'updatedBy'],
      { inquiry: 'inquiry_id' }
    )
  },
  JobInquiryForm: {
    columns: columns(
      ['revisionNumber', 'revisionCause', 'quantityIdenticalBuildings', 'usage', 'unitOfMeasurement', 'area', 'installationSiteCondition', 'hseLevel', 'preparedDate', 'status', 'isCurrentRevision', 'submittedToDesignAt'],
      { inquiry: 'inquiry_id', revision: 'revision_number', fromDepartment: 'from_department_id', toDepartment: 'to_department_id', createdBy: 'prepared_by', reviewedBy: 'reviewed_by', submittedAt: 'submitted_to_design_at' }
    )
  },
  DesignTask: {
    columns: columns(['jifId', 'assignedDesigner', 'assignedBy', 'startDate', 'targetDate', 'actualCompletionDate', 'priority', 'status', 'remarks'], { inquiry: 'inquiry_id', designStatus: 'status' })
  },
  DesignQuery: {
    columns: columns(['designTaskId', 'queryNumber', 'title', 'description', 'raisedBy', 'assignedTo', 'priority', 'status', 'raisedAt', 'respondedAt', 'resolvedAt'], { inquiry: 'inquiry_id', assignedDepartment: 'assigned_department_id' })
  },
  DesignWeightSummary: {
    columns: columns(['designTaskId', 'revisionNumber', 'preparedBy', 'checkedBy', 'approvedBy', 'completionDate', 'designAssumptions', 'drawingReferences', 'remarks', 'status', 'isCurrentRevision'], { inquiry: 'inquiry_id', revision: 'revision_number' })
  },
  CostingSheet: {
    columns: columns(['dwsId', 'revisionNumber', 'currency', 'exchangeRate', 'buildingArea', 'buildingWeight', 'weightPerSqft', 'weightPerSqm', 'materialSubtotal', 'serviceSubtotal', 'subtotal', 'overheadPercentage', 'overheadAmount', 'profitPercentage', 'profitAmount', 'discountPercentage', 'discountAmount', 'taxPercentage', 'taxAmount', 'finalQuotationAmount', 'pricePerSqft', 'pricePerSqm', 'pricePerKg', 'calculationSnapshot', 'status', 'isCurrentRevision'], { inquiry: 'inquiry_id', revision: 'revision_number', createdBy: 'prepared_by' })
  },
  CommercialProposal: {
    columns: columns(['costingSheetId', 'proposalNumber', 'revisionNumber', 'scopeOfSupply', 'quotedAmount', 'currency', 'taxDetails', 'paymentTerms', 'deliveryPeriod', 'proposalValidity', 'warranty', 'exclusions', 'commercialTerms', 'generalTerms', 'status', 'isLocked'], { inquiry: 'inquiry_id', revision: 'revision_number', createdBy: 'prepared_by' })
  },
  TechnicalProposal: {
    columns: columns(['revisionNumber', 'projectOverview', 'scopeOfWork', 'buildingSpecifications', 'designParameters', 'designLoads', 'materialSpecifications', 'roofSpecifications', 'wallSpecifications', 'claddingSpecifications', 'insulationSpecifications', 'accessories', 'canopies', 'surfacePreparation', 'paintSpecification', 'designCodes', 'standards', 'exclusions', 'technicalNotes', 'status', 'isLocked'], { inquiry: 'inquiry_id', revision: 'revision_number', createdBy: 'prepared_by' })
  },
  ProposalDrawing: {
    columns: columns(['drawingNumber', 'drawingTitle', 'revisionNumber', 'drawingType', 'preparedBy', 'checkedBy', 'approvedBy', 'issueDate', 'storagePath', 'status', 'isLocked', 'remarks'], { inquiry: 'inquiry_id', revision: 'revision_number' })
  },
  GMReview: {
    columns: columns(['reviewedBy', 'reviewDate', 'decision', 'comments', 'approvalNumber', 'digitalSignaturePath', 'approvedRevision', 'forwardedToSales', 'forwardedToSalesBy', 'forwardedDate'], { inquiry: 'inquiry_id' })
  },
  SalesSubmission: {
    columns: columns(['gmReviewId', 'proposalReceivedDate', 'submittedBy', 'submissionDate', 'submissionMethod', 'recipientName', 'recipientEmail', 'recipientPhone', 'clientAcknowledgement', 'proofStoragePath', 'nextFollowUpDate', 'submissionRemarks'], { inquiry: 'inquiry_id' })
  },
  FollowUp: {
    columns: columns(['salesSubmissionId', 'followUpDate', 'followUpType', 'contactPerson', 'discussionSummary', 'clientResponse', 'nextAction', 'nextFollowUpDate', 'createdBy'], { inquiry: 'inquiry_id' })
  },
  Document: {
    columns: columns(['documentType', 'documentNumber', 'title', 'revisionNumber', 'bucketName', 'storagePath', 'fileName', 'mimeType', 'fileSize', 'uploadedBy', 'status', 'isLocked', 'remarks'], { inquiryId: 'inquiry_id', revision: 'revision_number', storageBucket: 'bucket_name' })
  },
  Notification: {
    columns: columns(['inquiryId', 'title', 'message', 'link', 'isRead', 'readAt'], { recipient: 'recipient_id', type: 'notification_type' })
  },
  ActivityLog: {
    columns: columns(['inquiryId', 'action', 'entityType', 'entityId', 'description', 'ipAddress', 'userAgent'], { user: 'user_id', department: 'department_id', oldValue: 'old_values', newValue: 'new_values' })
  },
  MaterialRate: {
    columns: columns(['itemCode', 'category', 'unit', 'rate', 'currency', 'effectiveFrom', 'effectiveTo', 'isActive', 'createdBy'], { name: 'item_name' })
  },
  TaxSetting: {
    columns: columns(['taxCode', 'percentage', 'effectiveFrom', 'effectiveTo', 'isActive'], { name: 'tax_name' })
  },
  ApprovalRule: { columns: columns(['name', 'code', 'description', 'conditions', 'approvers', 'isActive', 'createdBy']) },
  SystemSetting: { columns: columns(['key', 'value', 'description', 'updatedBy']) }
};

export function schemaFor(modelName, fallbackTable) {
  const configured = modelSchemas[modelName] || { columns: {} };
  return { ...configured, table: configured.table || fallbackTable };
}

export function prepareDocument(modelName, input) {
  const doc = { ...input };
  if (modelName === 'Role' && !doc.code) doc.code = doc.name;
  if (modelName === 'User' && !doc.name && doc.fullName) doc.name = doc.fullName;
  if (modelName === 'MaterialRate' && !doc.name && doc.itemName) doc.name = doc.itemName;
  if (modelName === 'TaxSetting' && !doc.name && doc.taxName) doc.name = doc.taxName;
  return doc;
}

const child = (table, foreignKey, source, fields, options = {}) => ({
  table,
  foreignKey,
  source,
  columns: columns(fields, options.aliases || {}),
  ...options
});

export const childSchemas = {
  JobInquiryForm: [
    child('jif_building_parameters', 'jif_id', 'buildingParameters', ['frameType', 'width', 'widthModules', 'gableExtension', 'eaveExtension', 'leftEndWallCondition', 'rightEndWallCondition', 'endWallSpacing', 'sideWallGirtType', 'endWallGirtType', 'length', 'baySpacing', 'clearHeight', 'eaveHeight', 'clearRidgeHeight', 'ridgeLinePosition', 'finishedFloorLevel', 'roofSlope', 'brickWallHeight', 'bracingType', 'stormWaterDrainage', 'buildingShape', 'steelColumnStartLevel', 'impactOnExistingStructure', 'connectionDetails'], { single: true }),
    child('jif_roof_wall_conditions', 'jif_id', 'roofWallConditions', ['location', 'conditionDescription'], { objectAsLocations: true }),
    child('jif_claddings', 'jif_id', 'cladding', ['location', 'thickness', 'description', 'profile', 'sortOrder']),
    child('jif_insulations', 'jif_id', 'insulation', ['location', 'thickness', 'description', 'density', 'sortOrder']),
    child('jif_accessories', 'jif_id', 'accessories', ['location', 'quantity', 'unit', 'description', 'dimensions', 'sortOrder']),
    child('jif_canopies', 'jif_id', 'canopies', ['location', 'eaveCondition', 'width', 'length', 'clearHeight', 'soffitPanelIncluded', 'sortOrder'], { aliases: { quantity: 'quantity_identical' } }),
    child('jif_surface_paint_specs', 'jif_id', 'paintSpecification', ['primarySteelSurfacePreparation', 'secondarySteelSurfacePreparation', 'primer', 'primerThickness', 'paintSystem', 'remarks'], { single: true }),
    child('jif_design_loads', 'jif_id', 'designLoads', ['deadLoad', 'liveLoad', 'collateralLoad', 'solarLoad', 'windSpeed', 'earthquakeZone', 'designSoftware', 'enclosureCondition', 'exposure', 'rainfallIntensity', 'futureExtension', 'designVettingAuthority', 'specialDesignConditions', 'projectLocation'], { single: true }),
    child('jif_comments', 'jif_id', 'comments', ['minimumPlateThickness', 'columnBaseReactions', 'importantNotes'], { single: true, aliases: { gradeOfSteel: 'steel_grade', designOfWallGirts: 'wall_girt_design', typeOfInquiry: 'inquiry_type_notes' } }),
    child('jif_checklist_items', 'jif_id', 'checklist', ['checklistCode', 'checklistLabel', 'isCompleted', 'remarks', 'sortOrder'], { checklist: true })
  ],
  DesignWeightSummary: [
    child('dws_buildings', 'dws_id', 'buildings', ['buildingName', 'buildingNumber', 'buildingArea', 'mainFrameWeight', 'secondarySteelWeight', 'bracingWeight', 'claddingWeight', 'accessoriesWeight', 'canopyWeight', 'miscellaneousWeight', 'totalSteelWeight'], { aliases: { weightPerSquareFoot: 'weight_per_sqft', weightPerSquareMeter: 'weight_per_sqm' } })
  ],
  CostingSheet: [
    child('costing_items', 'costing_sheet_id', 'items', ['category', 'itemName', 'description', 'quantity', 'unit', 'unitRate', 'amount', 'rateSource', 'sortOrder'])
  ],
  GMReview: [
    child('gm_review_items', 'gm_review_id', 'checklist', ['documentType', 'documentId', 'reviewStatus', 'comments'], { checklist: true, gmChecklist: true })
  ]
};
