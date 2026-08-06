import {describe,it,expect} from 'vitest';
import {buildPackageDocument,buildPackageWorkbook,packageSections} from '../src/services/packageExportService.js';

const fixture={
  revision:0,
  inquiry:{inquiryNumber:'IQN-26-08-002',revisionNumber:0,projectName:'Test Building',projectLocation:'Lahore',currentStatus:'SUBMITTED_TO_GM',client:{companyName:'Izhar',contactPerson:'Farooq',email:'client@example.com'}},
  itf:{status:'SUBMITTED',requirements:{quantityOfBuildings:1,buildingUsage:'Warehouse',approximateArea:25000}},
  jif:{status:'SUBMITTED',project:{usage:'Warehouse',area:25000},buildingParameters:{frameType:'Gable',width:100,length:250},designLoads:{windSpeed:130,earthquakeZone:'2A'},cladding:[{location:'Roof',thickness:'0.5 mm'}]},
  dws:{status:'SUBMITTED',buildings:[{buildingName:'Building 1',buildingArea:25000,totalSteelWeight:116997,weightPerSquareFoot:4.68}]},
  costing:{status:'COMPLETED',basics:{buildingArea:25000,buildingWeight:116997,currency:'BDT'},commercial:{profitMarginPercentage:10,finalQuotationAmount:20144990.25}},
  commercial:{status:'COMPLETED',proposalNumber:'CP-IQN-26-08-002-R0',quotedAmount:20144990.25,currency:'BDT'},
  technical:{status:'COMPLETED',scopeOfWork:'Complete steel building package',designCodes:'Applicable design codes'},
  drawings:[{drawingNumber:'GA-IQN-26-08-002-R0',drawingTitle:'General Arrangement',drawingType:'GA',status:'COMPLETED'}]
};

describe('GM package exports',()=>{
  it('organizes every inquiry lifecycle document into export sections',()=>{
    const names=packageSections(fixture).map(([name])=>name);
    expect(names).toEqual(['Inquiry & Client','Inquiry Taking Form (ITF)','Job Inquiry Form (JIF)','Design Weight Summary (DWS)','Costing Sheet','Commercial Proposal','Technical Proposal','Proposal Drawings']);
  });

  it('builds an Excel workbook with a separate auditable sheet for every section',async()=>{
    const workbook=await buildPackageWorkbook(fixture);
    expect(workbook.worksheets.map(sheet=>sheet.name)).toEqual(['Inquiry & Client','ITF','JIF','DWS','Costing Sheet','Commercial Proposal','Technical Proposal','Proposal Drawings']);
    expect(workbook.getWorksheet('JIF').getCell('A1').value).toBe('Job Inquiry Form (JIF)');
    const buffer=await workbook.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(10000);
  });

  it('builds a valid Word OOXML package containing the complete lifecycle sections',async()=>{
    const buffer=await buildPackageDocument(fixture);
    expect(buffer.byteLength).toBeGreaterThan(5000);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
