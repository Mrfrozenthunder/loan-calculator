// EMI calculation function
export const calculateEMI = (principal: number, annualRate: number, tenureYears: number): number => {
  const monthlyRate = annualRate / (12 * 100); // Convert annual rate to monthly decimal
  const totalMonths = tenureYears * 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
              (Math.pow(1 + monthlyRate, totalMonths) - 1);
  return Math.round(emi * 100) / 100;
};

// Calculate sub-loan EMIs with premium
export const calculateSubLoanSplit = (
  totalLoan: number,
  partnerAPrincipal: number,
  bankRate: number,
  premiumRate: number,
  tenureYears: number
) => {
  // Calculate total bank EMI
  const totalEMI = calculateEMI(totalLoan, bankRate, tenureYears);
  
  // Calculate Partners B,C,D's EMI with premium
  const partnerBCDPrincipal = totalLoan - partnerAPrincipal;
  const partnerBCDEMI = calculateEMI(partnerBCDPrincipal, bankRate + premiumRate, tenureYears);
  
  // Partner A's EMI is the remaining amount
  const partnerAEMI = totalEMI - partnerBCDEMI;
  
  // Calculate shares based on EMI
  const partnerAShare = (partnerAEMI / totalEMI) * 100;
  const partnerBCDShare = 100 - partnerAShare;
  
  return {
    partnerAEMI,
    partnerBCDEMI,
    totalEMI,
    partnerAShare,
    partnerBCDShare
  };
};

// Calculate partner loan details
export const calculatePartnerLoan = (
  currentEMI: number,
  currentShare: number,
  targetShare: number,
  partnerLoanRate: number,
  tenureYears: number
) => {
  const shareDifference = currentShare - targetShare;
  const monthlyDifference = (currentEMI * shareDifference) / 100;
  
  // Calculate partner loan principal using the EMI formula in reverse
  const monthlyRate = partnerLoanRate / (12 * 100);
  const totalMonths = tenureYears * 12;
  const denominator = monthlyRate * Math.pow(1 + monthlyRate, totalMonths) / 
                     (Math.pow(1 + monthlyRate, totalMonths) - 1);
  
  const partnerLoanPrincipal = monthlyDifference / denominator;
  
  return {
    partnerLoanPrincipal: Math.round(partnerLoanPrincipal * 100) / 100,
    monthlyPayment: monthlyDifference,
    shareDifference
  };
};