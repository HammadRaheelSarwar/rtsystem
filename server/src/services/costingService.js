const n=v=>Number(v)||0;
export function calculateCosting(input){
  const b=input.basics||{},m=input.materialCosts||{},s=input.serviceCosts||{},c=input.commercial||{};
  const materialTotal=n(m.primarySteelRate)+n(m.secondarySteelRate)+n(m.claddingRate)+n(m.insulationRate)+n(m.accessoriesRate)+n(m.canopyRate)+n(m.paintRate)+n(m.nonStandardMaterialRate);
  const serviceTotal=n(s.designCost)+n(s.fabricationCost)+n(s.transportationCost)+n(s.erectionCost)+n(s.installationCost)+n(s.testingCost)+n(s.otherCost);
  const subtotal=materialTotal+serviceTotal, overheadAmount=subtotal*n(c.overheadPercentage)/100;
  const profitBase=subtotal+overheadAmount, profitAmount=profitBase*n(c.profitMarginPercentage)/100;
  const discountAmount=(profitBase+profitAmount)*n(c.discountPercentage)/100;
  const taxable=profitBase+profitAmount-discountAmount, taxAmount=taxable*n(c.applicableTaxPercentage)/100;
  const finalQuotationAmount=taxable+taxAmount, area=n(b.buildingArea), weight=n(b.buildingWeight);
  return {...input,commercial:{...c,subtotal,overheadAmount,profitAmount,discountAmount,taxAmount,finalQuotationAmount,
    pricePerSquareFoot:area?finalQuotationAmount/area:0,pricePerSquareMetre:area?finalQuotationAmount/(area*0.092903):0,pricePerKilogram:weight?finalQuotationAmount/weight:0},
    calculationSnapshot:{basics:b,materialCosts:m,serviceCosts:s,commercialPercentages:{overheadPercentage:n(c.overheadPercentage),profitMarginPercentage:n(c.profitMarginPercentage),discountPercentage:n(c.discountPercentage),applicableTaxPercentage:n(c.applicableTaxPercentage)},calculatedAt:new Date()}};
}
