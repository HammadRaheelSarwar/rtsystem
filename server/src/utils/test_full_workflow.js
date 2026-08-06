import 'dotenv/config';

const API_URL = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${url} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function login(email, password) {
  const data = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  return data.data.accessToken;
}

async function runFullWorkflow() {
  console.log('\n================================================================');
  console.log('🚀 RUNNING COMPLETE STAGE 1 THROUGH STAGE 8 AUTOMATED WORKFLOW');
  console.log('================================================================\n');

  // 🟢 1. Sales Creates & Submits ITF
  console.log('🟢 STAGE 1: Sales Creates & Submits ITF');
  const salesToken = await login('sales@rt.com', 'Sales123!');
  const salesHeaders = { Authorization: `Bearer ${salesToken}` };

  const clientsRes = await req('/clients', { headers: salesHeaders });
  const client = clientsRes.data[0];
  if (!client) throw new Error('No client found. Run seed script first.');

  const inqNum = `IQN-${String(new Date().getFullYear()).slice(-2)}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
  const createInqRes = await req('/inquiries', {
    method: 'POST',
    headers: salesHeaders,
    body: JSON.stringify({
      inquiryNumber: inqNum,
      client: client._id,
      projectName: 'Dhaka High-Tech PEB Facility',
      projectDescription: 'Pre-engineered steel factory building with heavy crane beam system.',
      projectLocation: 'Kanchpur Industrial Zone',
      inquiryType: 'PEB',
      urgency: 'HIGH',
      priority: 'HIGH'
    })
  });
  const inquiry = createInqRes.data;
  console.log(`  ✓ Inquiry Created: ${inquiry.inquiryNumber} (ID: ${inquiry._id})`);

  await req(`/inquiries/${inquiry._id}/itf`, {
    method: 'POST',
    headers: salesHeaders,
    body: JSON.stringify({
      clientInfo: { consultant: 'Bureau Veritas', contactPerson: 'Engr. Rahman', phone: '+8801700112233', email: 'rahman@bv.example' },
      inquiryInfo: { inquiryType: 'PEB', urgency: 'HIGH', quoteBasis: 'Turnkey Design-Build' },
      requirements: { projectDescription: 'Industrial manufacturing facility with 25m clear span.', quantityOfBuildings: 1, area: 3000 }
    })
  });
  console.log('  ✓ ITF Draft Saved');

  const itfSubmitRes = await req(`/inquiries/${inquiry._id}/itf/submit`, {
    method: 'POST',
    headers: salesHeaders
  });
  console.log(`  ✓ ITF Submitted to Estimation. Current status: ${itfSubmitRes.data.inquiry.currentStatus}\n`);

  // 🔵 2. Estimation Accepts Inquiry & Submits JIF to Design
  console.log('🔵 STAGE 2: Estimation Accepts Inquiry & Submits JIF to Design');
  const estToken = await login('estimation@rt.com', 'Estimate123!');
  const estHeaders = { Authorization: `Bearer ${estToken}` };

  await req(`/inquiries/${inquiry._id}/estimation/accept`, {
    method: 'POST',
    headers: estHeaders
  });
  console.log('  ✓ Inquiry Accepted by Estimation');

  await req(`/inquiries/${inquiry._id}/jif`, {
    method: 'POST',
    headers: estHeaders,
    body: JSON.stringify({
      general: { fromDepartment: 'Estimation', toDepartment: 'Design', quoteBasis: 'Built up' },
      project: { quantityOfIdenticalBuildings: 1, usage: 'Factory', area: 3000, unitOfMeasurement: 'SQM' },
      buildingParameters: { frameType: 'Rigid Frame', width: 25, length: 120, eaveHeight: 9 },
      cladding: [{ location: 'Roof', thickness: '0.5mm', description: 'Galvalume Sheet', profile: 'TR-1000' }],
      checklist: { 'Job Inquiry Form': true, 'Building area': true, 'Costing Sheet': true }
    })
  });
  console.log('  ✓ JIF Form Saved');

  const jifSubmitRes = await req(`/inquiries/${inquiry._id}/jif/submit-to-design`, {
    method: 'POST',
    headers: estHeaders
  });
  console.log(`  ✓ JIF Submitted to Design. Current status: ${jifSubmitRes.data.inquiry.currentStatus}\n`);

  // 🟣 3. Design Prepares & Submits DWS
  console.log('🟣 STAGE 3: Design Prepares & Submits DWS to Estimation');
  const designToken = await login('design@rt.com', 'Design123!');
  const designHeaders = { Authorization: `Bearer ${designToken}` };

  const taskRes = await req(`/inquiries/${inquiry._id}/design-task`, { headers: designHeaders });
  if (taskRes.data) {
    await req(`/design-tasks/${taskRes.data._id}`, {
      method: 'PUT',
      headers: designHeaders,
      body: JSON.stringify({ designStatus: 'IN_PROGRESS' })
    });
    console.log('  ✓ Design Task set to IN_PROGRESS');
  }

  await req(`/inquiries/${inquiry._id}/dws`, {
    method: 'POST',
    headers: designHeaders,
    body: JSON.stringify({
      buildings: [{
        buildingName: 'Main PEB Factory Unit',
        buildingNumber: 'B-01',
        buildingArea: 3000,
        mainFrameWeight: 52000,
        secondarySteelWeight: 18000,
        bracingWeight: 4200,
        claddingWeight: 6000,
        accessoriesWeight: 1800
      }],
      remarks: 'DWS weight calculated according to BNBC 2020 and MBMA standards.'
    })
  });
  console.log('  ✓ DWS Created with Steel Weights');

  const dwsSubmitRes = await req(`/inquiries/${inquiry._id}/dws/submit`, {
    method: 'POST',
    headers: designHeaders
  });
  console.log(`  ✓ DWS Submitted to Estimation. Current status: ${dwsSubmitRes.data.inquiry.currentStatus}\n`);

  // 🟡 4. Estimation Prepares Costing, Proposals & Drawings
  console.log('🟡 STAGE 4: Estimation Prepares Costing, Proposals & Drawings');
  await req(`/inquiries/${inquiry._id}/costing`, {
    method: 'POST',
    headers: estHeaders,
    body: JSON.stringify({
      basics: { buildingArea: 3000, buildingWeight: 82000, currency: 'BDT' },
      materialCosts: { primarySteelRate: 110, secondarySteelRate: 120, claddingRate: 950 },
      serviceCosts: { designCost: 60000, fabricationCost: 180000, transportationCost: 90000 },
      commercial: { subtotal: 11200000, overheadPercentage: 5, profitMarginPercentage: 12, applicableTaxPercentage: 7.5 }
    })
  });
  await req(`/inquiries/${inquiry._id}/costing/complete`, { method: 'POST', headers: estHeaders });
  console.log('  ✓ Costing Sheet Completed');

  await req(`/inquiries/${inquiry._id}/commercial-proposal`, {
    method: 'POST',
    headers: estHeaders,
    body: JSON.stringify({
      proposalNumber: `PROP-${inqNum}`,
      scopeOfSupply: 'Complete PEB structural steel supply, roof cladding, and crane beams.',
      quotedAmount: 13500000,
      paymentTerms: '30% advance, 70% upon delivery',
      deliveryPeriod: '8 Weeks',
      proposalValidity: '30 Days'
    })
  });
  await req(`/inquiries/${inquiry._id}/commercial-proposal/complete`, { method: 'POST', headers: estHeaders });
  console.log('  ✓ Commercial Proposal Completed');

  await req(`/inquiries/${inquiry._id}/technical-proposal`, {
    method: 'POST',
    headers: estHeaders,
    body: JSON.stringify({
      projectOverview: 'Single-story PEB warehouse with 25m clear span.',
      designCodes: 'AISC 360-16 / MBMA 2010',
      designLoads: 'Dead load: 0.15 kN/m2, Wind speed: 160 km/h'
    })
  });
  await req(`/inquiries/${inquiry._id}/technical-proposal/complete`, { method: 'POST', headers: estHeaders });
  console.log('  ✓ Technical Proposal Completed');

  await req(`/inquiries/${inquiry._id}/drawings`, {
    method: 'POST',
    headers: estHeaders,
    body: JSON.stringify({
      drawingNumber: 'DWG-001',
      drawingTitle: 'General Arrangement & Structural Framing Layout',
      drawingType: 'GA Drawing'
    })
  });
  console.log('  ✓ Proposal Drawing Uploaded');

  await req(`/inquiries/${inquiry._id}/package/complete`, { method: 'POST', headers: estHeaders });
  const gmSubmitRes = await req(`/inquiries/${inquiry._id}/package/submit-to-gm`, { method: 'POST', headers: estHeaders });
  console.log(`  ✓ Package Submitted to GM. Current status: ${gmSubmitRes.data.currentStatus}\n`);

  // 🟠 5. GM Reviews & Approves Package
  console.log('🟠 STAGE 5: GM Reviews & Approves Package');
  const gmToken = await login('gm@rt.com', 'Manager123!');
  const gmHeaders = { Authorization: `Bearer ${gmToken}` };

  await req(`/inquiries/${inquiry._id}/gm-review`, {
    method: 'POST',
    headers: gmHeaders,
    body: JSON.stringify({
      decision: 'APPROVED',
      comments: 'Commercial terms and technical specifications fully approved.',
      approvalNumber: `APPR-GM-${Date.now()}`
    })
  });
  console.log('  ✓ GM Review Recorded');

  const approveRes = await req(`/inquiries/${inquiry._id}/status`, {
    method: 'PATCH',
    headers: gmHeaders,
    body: JSON.stringify({ status: 'GM_APPROVED' })
  });
  console.log(`  ✓ GM APPROVED! Approved Revision: ${approveRes.data.approvedRevision}, Package Locked: ${approveRes.data.packageLocked}`);

  const forwardRes = await req(`/inquiries/${inquiry._id}/status`, {
    method: 'PATCH',
    headers: gmHeaders,
    body: JSON.stringify({ status: 'FORWARDED_TO_SALES' })
  });
  console.log(`  ✓ Forwarded to Sales. Current status: ${forwardRes.data.currentStatus}\n`);

  // 🟢 6. Sales Submits Proposal to Client
  console.log('🟢 STAGE 6: Sales Submits Proposal to Client');
  await req(`/inquiries/${inquiry._id}/status`, {
    method: 'PATCH',
    headers: salesHeaders,
    body: JSON.stringify({ status: 'READY_FOR_CLIENT_SUBMISSION' })
  });
  const clientSubRes = await req(`/inquiries/${inquiry._id}/status`, {
    method: 'PATCH',
    headers: salesHeaders,
    body: JSON.stringify({ status: 'SUBMITTED_TO_CLIENT' })
  });
  console.log(`  ✓ Submitted to Client! Current status: ${clientSubRes.data.currentStatus}\n`);

  // 🔵 7. Follow-up & Negotiation
  console.log('🔵 STAGE 7: Follow-up & Negotiation');
  await req(`/inquiries/${inquiry._id}/follow-ups`, {
    method: 'POST',
    headers: salesHeaders,
    body: JSON.stringify({
      followUpDate: new Date(),
      followUpType: 'MEETING',
      contactPerson: 'Engr. Rahman',
      discussionSummary: 'Client presented proposal to board. Requested 2% discount on final contract value.',
      clientResponse: 'Favorable interest.',
      nextAction: 'Final price agreement.'
    })
  });
  console.log('  ✓ Follow-up Meeting Logged');

  await req(`/inquiries/${inquiry._id}/status`, {
    method: 'PATCH',
    headers: salesHeaders,
    body: JSON.stringify({ status: 'UNDER_NEGOTIATION' })
  });

  console.log('  ✓ Status updated to UNDER_NEGOTIATION\n');

  // 🟢 8. Final Outcome: WON
  console.log('🏆 STAGE 8: Final Outcome - Marking Inquiry WON');
  const finalRes = await req(`/inquiries/${inquiry._id}/final-status`, {
    method: 'PATCH',
    headers: salesHeaders,
    body: JSON.stringify({
      status: 'WON',
      finalAgreedValue: 13200000,
      awardDate: new Date(),
      purchaseOrderNumber: 'PO-2026-DH-9901',
      expectedProjectStartDate: new Date(Date.now() + 14 * 86400000)
    })
  });

  console.log('\n================================================================');
  console.log(`🎉 SUCCESS! Inquiry ${inquiry.inquiryNumber} Marked WON!`);
  console.log(`   Final Status: ${finalRes.data.currentStatus}`);
  console.log(`   Final Agreed Value: BDT ${finalRes.data.finalResult?.finalAgreedValue?.toLocaleString()}`);
  console.log(`   Purchase Order Number: ${finalRes.data.finalResult?.purchaseOrderNumber}`);
  console.log('================================================================\n');
}

runFullWorkflow().catch(err => {
  console.error('\n❌ Workflow Execution Error:', err.message);
  process.exit(1);
});
