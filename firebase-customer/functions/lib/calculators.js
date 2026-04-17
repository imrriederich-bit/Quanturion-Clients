
const round = (value) => Math.max(0, Math.round(Number(value || 0)));

function monthlyNetToGross(net) {
  const n = Number(net || 0);
  if (n <= 7000) return n * 1.12;
  if (n <= 12000) return n * 1.18;
  if (n <= 20000) return n * 1.25;
  return n * 1.32;
}

function calculateTax(input, options = {}) {
  const taxCap = Number(options.taxRefundCap || 35000);
  const monthlyGross = input.salaryMode === 'net' ? monthlyNetToGross(input.salaryAmount) : Number(input.salaryAmount || 0);
  const annualGross = monthlyGross * 12;
  let score = 0.02 * annualGross;
  score += Number(input.children || 0) * 850;
  if (input.maritalStatus === 'married') score += 1200;
  if (input.multipleEmployers) score += 1800;
  if (input.reserveDuty) score += 1500;
  if (input.donations) score += 1300;
  if (input.lastRefundWindow === '3_4') score *= 1.15;
  if (input.lastRefundWindow === '5_7') score *= 1.35;
  const estimateMin = round(Math.min(score * 0.7, taxCap));
  const estimateMax = round(Math.min(score * 1.05, taxCap));
  return {
    type: 'tax',
    estimateMin,
    estimateMax,
    monthlyPotential: round(estimateMax / 12),
    annualPotential: estimateMax,
    totalPotential: estimateMax,
    displayText: `₪ ${estimateMin.toLocaleString()} – ₪ ${estimateMax.toLocaleString()}`,
  };
}

function annuityPayment(principal, annualRate, years) {
  const p = Number(principal || 0);
  const r = Number(annualRate || 0) / 100 / 12;
  const n = Number(years || 0) * 12;
  if (!p || !n) return 0;
  if (!r) return p / n;
  return p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calculateMortgage(input, options = {}) {
  const currentRate = Number(input.currentRate || 0);
  const benchmarkRate = Number(options.mortgageFallbackRate || 4.8);
  let targetRate = Math.min(currentRate, benchmarkRate);
  if (currentRate > benchmarkRate) targetRate = benchmarkRate;
  if (input.rateType === 'fixed') targetRate -= 0.15;
  if (input.rateType === 'mixed') targetRate -= 0.05;
  targetRate = Math.max(2.4, round(targetRate * 100) / 100);
  const currentMonthly = annuityPayment(input.loanAmount, currentRate, input.yearsLeft);
  const targetMonthly = annuityPayment(input.loanAmount, targetRate, input.yearsLeft);
  const monthlyPotential = round(Math.max(currentMonthly - targetMonthly, 0));
  const annualPotential = round(monthlyPotential * 12);
  const totalPotential = round(monthlyPotential * Number(input.yearsLeft || 0) * 12);
  return {
    type: 'mortgage',
    estimateMin: monthlyPotential,
    estimateMax: totalPotential,
    monthlyPotential,
    annualPotential,
    totalPotential,
    benchmarkRate: targetRate,
    displayText: `₪ ${monthlyPotential.toLocaleString()} / חודש`,
  };
}

function calculateElectricity(input, options = {}) {
  const benchmark = Number(options.electricityBenchmarkIlsPerKwh || 0.52);
  const currentMonthlyBill = Number(input.monthlyBill || 0);
  const kwh = Number(input.kwh || 0) || (currentMonthlyBill && benchmark ? currentMonthlyBill / benchmark : 0);
  const currentRate = kwh > 0 ? (currentMonthlyBill > 0 ? currentMonthlyBill / kwh : benchmark * 1.12) : benchmark * 1.12;
  const smartMeterFactor = input.hasSmartMeter ? 0.96 : 1;
  const targetRate = benchmark * smartMeterFactor;
  const targetMonthly = round(kwh * targetRate);
  const referenceMonthly = currentMonthlyBill > 0 ? currentMonthlyBill : round(kwh * currentRate);
  const monthlyPotential = round(Math.max(referenceMonthly - targetMonthly, 0));
  const annualPotential = round(monthlyPotential * 12);
  return {
    type: 'electricity',
    estimateMin: monthlyPotential,
    estimateMax: annualPotential,
    monthlyPotential,
    annualPotential,
    totalPotential: annualPotential,
    displayText: `₪ ${monthlyPotential.toLocaleString()} / חודש`,
  };
}

function calculateInsurance(input, options = {}) {
  const base = Number(options.insuranceBaseMonthlyIls || 420);
  let risk = base;
  risk += Number(input.claimsLast3Years || 0) * 85;
  if (Number(input.age || 0) < 24) risk += 140;
  if (Number(input.licenseYears || 0) < 3) risk += 110;
  if (input.vehicleType === 'suv') risk += 90;
  if (input.vehicleType === 'luxury') risk += 180;
  if (input.driverCircle === 'familyCircle') risk += 45;
  if (input.driverCircle === 'open') risk += 95;
  if (input.coverage === 'plus') risk += 60;
  if (input.coverage === 'full') risk += 120;
  if (Number(input.annualKm || 0) > 24000) risk += 70;
  const currentPremium = Number(input.currentPremium || risk);
  const targetMonthly = round(Math.max(risk * 0.88, 180));
  const monthlyPotential = round(Math.max(currentPremium - targetMonthly, 0));
  const annualPotential = round(monthlyPotential * 12);
  return {
    type: 'insurance',
    estimateMin: monthlyPotential,
    estimateMax: annualPotential,
    monthlyPotential,
    annualPotential,
    totalPotential: annualPotential,
    targetMonthly,
    displayText: `₪ ${monthlyPotential.toLocaleString()} / חודש`,
  };
}

function calculateModule(moduleKey, input, options = {}) {
  switch (moduleKey) {
    case 'tax': return calculateTax(input, options);
    case 'mortgage': return calculateMortgage(input, options);
    case 'electricity': return calculateElectricity(input, options);
    case 'insurance': return calculateInsurance(input, options);
    default: return { type: moduleKey, estimateMin: 0, estimateMax: 0, monthlyPotential: 0, annualPotential: 0, totalPotential: 0, displayText: '—' };
  }
}

module.exports = { calculateTax, calculateMortgage, calculateElectricity, calculateInsurance, calculateModule };
