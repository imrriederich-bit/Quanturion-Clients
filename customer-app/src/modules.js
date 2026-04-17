
export const MODULES = [
  {
    key: 'tax',
    titleKey: 'module_tax_title',
    descKey: 'module_tax_desc',
    fields: [
      { key: 'salaryMode', type: 'select', options: [['gross', 'tax_mode_gross'], ['net', 'tax_mode_net']], labelKey: 'tax_salaryMode' },
      { key: 'salaryAmount', type: 'number', labelKey: 'tax_salaryAmount', required: true },
      { key: 'maritalStatus', type: 'select', options: [['single', 'tax_single'], ['married', 'tax_married']], labelKey: 'tax_maritalStatus' },
      { key: 'children', type: 'number', labelKey: 'tax_children' },
      { key: 'multipleEmployers', type: 'boolean', labelKey: 'tax_multipleEmployers' },
      { key: 'reserveDuty', type: 'boolean', labelKey: 'tax_reserveDuty' },
      { key: 'donations', type: 'boolean', labelKey: 'tax_donations' },
      { key: 'lastRefundWindow', type: 'select', options: [['1_2', 'tax_window_1_2'], ['3_4', 'tax_window_3_4'], ['5_7', 'tax_window_5_7']], labelKey: 'tax_lastRefundWindow' },
    ],
  },
  {
    key: 'mortgage',
    titleKey: 'module_mortgage_title',
    descKey: 'module_mortgage_desc',
    fields: [
      { key: 'loanAmount', type: 'number', labelKey: 'mortgage_loanAmount', required: true },
      { key: 'yearsLeft', type: 'number', labelKey: 'mortgage_yearsLeft', required: true },
      { key: 'rateType', type: 'select', options: [['fixed', 'mortgage_fixed'], ['flexible', 'mortgage_flexible'], ['mixed', 'mortgage_mixed']], labelKey: 'mortgage_rateType' },
      { key: 'currentRate', type: 'number', labelKey: 'mortgage_currentRate', required: true },
      { key: 'currentBank', type: 'text', labelKey: 'mortgage_currentBank' },
      { key: 'propertyValue', type: 'number', labelKey: 'mortgage_propertyValue' },
    ],
  },
  {
    key: 'electricity',
    titleKey: 'module_electricity_title',
    descKey: 'module_electricity_desc',
    fields: [
      { key: 'kwh', type: 'number', labelKey: 'electricity_kwh' },
      { key: 'monthlyBill', type: 'number', labelKey: 'electricity_monthlyBill' },
      { key: 'provider', type: 'text', labelKey: 'electricity_provider' },
      { key: 'hasSmartMeter', type: 'boolean', labelKey: 'electricity_hasSmartMeter' },
    ],
  },
  {
    key: 'insurance',
    titleKey: 'module_insurance_title',
    descKey: 'module_insurance_desc',
    fields: [
      { key: 'age', type: 'number', labelKey: 'insurance_age', required: true },
      { key: 'licenseYears', type: 'number', labelKey: 'insurance_licenseYears', required: true },
      { key: 'vehicleType', type: 'select', options: [['compact', 'insurance_compact'], ['family', 'insurance_family'], ['suv', 'insurance_suv'], ['luxury', 'insurance_luxury']], labelKey: 'insurance_vehicleType' },
      { key: 'claimsLast3Years', type: 'number', labelKey: 'insurance_claimsLast3Years' },
      { key: 'driverCircle', type: 'select', options: [['single', 'insurance_single'], ['familyCircle', 'insurance_familyCircle'], ['open', 'insurance_open']], labelKey: 'insurance_driverCircle' },
      { key: 'city', type: 'text', labelKey: 'insurance_city' },
      { key: 'annualKm', type: 'number', labelKey: 'insurance_annualKm' },
      { key: 'coverage', type: 'select', options: [['basic', 'insurance_basic'], ['plus', 'insurance_plus'], ['full', 'insurance_full']], labelKey: 'insurance_coverage' },
      { key: 'currentPremium', type: 'number', labelKey: 'insurance_currentPremium', required: true },
    ],
  },
];
