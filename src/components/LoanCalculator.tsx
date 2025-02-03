import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { calculateEMI, calculateSubLoanSplit, calculatePartnerLoan } from '../utils/calculations';
import Modal from './Modal'; // Import the Modal component

interface CalculationResults {
  bankEMI: number;
  partnerAShare: number;
  partnerAEMI: number;
  partnerBCDShare: number;
  partnerBCDEMI: number;
  effectiveOwnershipCost: number;
  totalOutflow: number;
  partnerLoanPrincipal?: number;
  partnerLoanEMI?: number;
  finalPartnerAShare?: number;
  finalPartnerAEMI?: number;
  finalPartnerBCDTotalEMI?: number;
  initialPartnerAShare: number;
  initialPartnerAEMI: number;
  initialPartnerBCDShare: number;
  initialPartnerBCDEMI: number;
}

export default function LoanCalculator() {
  const [inputs, setInputs] = useState({
    projectCapex: 10000000, // 1 Cr
    equityShare: 20,
    bankLoan: 10000000,
    bankRate: 10,
    tenureYears: 4,
    premiumRate: 2.5,
    partnerLoanRate: 12,
    targetShare: 50
  });

  const [results, setResults] = useState<CalculationResults | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value)
    }));
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-IN');
  };

  const calculateResults = () => {
    // Validate inputs
    if (Object.values(inputs).some(value => value === '' || isNaN(value) || value < 0)) {
      setModalMessage('Please enter valid positive numbers for all fields');
      return;
    }

    // Calculate minimum required funding for Partner A based on equity share
    const minRequiredFundingA = (inputs.projectCapex * inputs.equityShare) / 100;

    // Validate if bank loan is sufficient for Partner A's minimum share
    if (inputs.bankLoan < minRequiredFundingA) {
      setModalMessage(`Bank loan amount is insufficient. Partner A needs minimum ₹${formatNumber(minRequiredFundingA)} based on their ${inputs.equityShare}% equity share.`);
      return;
    }

    // Calculate bank EMI
    const bankEMI = calculateEMI(inputs.bankLoan, inputs.bankRate, inputs.tenureYears);

    // Calculate Partner A's principal
    let partnerAPrincipal;
    if (inputs.bankLoan <= minRequiredFundingA) {
      // If bank loan is exactly equal to or less than minimum required, use entire amount
      partnerAPrincipal = inputs.bankLoan;
    } else {
      // If bank loan is more than minimum required, calculate proportional share
      partnerAPrincipal = Math.max(
        minRequiredFundingA,
        Math.min(
          inputs.bankLoan,
          (inputs.projectCapex * inputs.equityShare) / 100
        )
      );
    }

    // Calculate initial split without premium
    const initialPartnerAShare = (partnerAPrincipal / inputs.bankLoan) * 100;
    const initialPartnerAEMI = calculateEMI(partnerAPrincipal, inputs.bankRate, inputs.tenureYears);
    const initialPartnerBCDShare = 100 - initialPartnerAShare;
    const initialPartnerBCDEMI = bankEMI - initialPartnerAEMI;

    // Calculate split with premium
    const splitResults = calculateSubLoanSplit(
      inputs.bankLoan,
      partnerAPrincipal,
      inputs.bankRate,
      inputs.premiumRate,
      inputs.tenureYears
    );

    // Calculate effective ownership cost
    const partnerALoanShare = (splitResults.partnerAShare / 100) * inputs.bankLoan;
    const effectiveOwnershipCost = (partnerALoanShare / inputs.projectCapex) * 100;

    // Calculate total outflow over tenure
    const totalMonths = inputs.tenureYears * 12;
    const totalOutflow = splitResults.partnerAEMI * totalMonths;

    // Calculate partner loan if target share is less than current share
    let partnerLoanResults;
    let finalPartnerAEMI = splitResults.partnerAEMI;
    let finalPartnerBCDTotalEMI = splitResults.partnerBCDEMI;

    if (inputs.targetShare < splitResults.partnerAShare) {
      partnerLoanResults = calculatePartnerLoan(
        bankEMI,
        splitResults.partnerAShare,
        inputs.targetShare,
        inputs.partnerLoanRate,
        inputs.tenureYears
      );
      
      finalPartnerAEMI = (inputs.targetShare / 100) * bankEMI;
      finalPartnerBCDTotalEMI = splitResults.partnerBCDEMI + (partnerLoanResults?.monthlyPayment || 0);
    }

    setResults({
      bankEMI,
      partnerAShare: splitResults.partnerAShare,
      partnerAEMI: splitResults.partnerAEMI,
      partnerBCDShare: splitResults.partnerBCDShare,
      partnerBCDEMI: splitResults.partnerBCDEMI,
      effectiveOwnershipCost,
      totalOutflow,
      partnerLoanPrincipal: partnerLoanResults?.partnerLoanPrincipal,
      partnerLoanEMI: partnerLoanResults?.monthlyPayment,
      finalPartnerAShare: inputs.targetShare,
      finalPartnerAEMI,
      finalPartnerBCDTotalEMI,
      initialPartnerAShare,
      initialPartnerAEMI,
      initialPartnerBCDShare,
      initialPartnerBCDEMI
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Modal for displaying validation messages */}
        {modalMessage && (
          <Modal message={modalMessage} onClose={() => setModalMessage(null)} />
        )}
        <div className="text-center mb-8">
          <Calculator className="mx-auto h-12 w-12 text-indigo-600" />
          <h1 className="mt-3 text-3xl font-extrabold text-gray-900">
            Collateral Premium & Partner Loan Calculator
          </h1>
          <p className="mt-2 text-gray-600">
            Calculate EMI splits and partner loan details based on collateral premium arrangements
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Project CAPEX (₹)
              </label>
              <input
                type="number"
                name="projectCapex"
                value={inputs.projectCapex}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Partner A's Equity Share (%)
              </label>
              <input
                type="number"
                name="equityShare"
                value={inputs.equityShare}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bank Loan Amount (₹)
              </label>
              <input
                type="number"
                name="bankLoan"
                value={inputs.bankLoan}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bank Interest Rate (%)
              </label>
              <input
                type="number"
                name="bankRate"
                value={inputs.bankRate}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tenure (Years)
              </label>
              <input
                type="number"
                name="tenureYears"
                value={inputs.tenureYears}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Collateral Premium Rate (%)
              </label>
              <input
                type="number"
                name="premiumRate"
                value={inputs.premiumRate}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Partner Loan Rate (%)
              </label>
              <input
                type="number"
                name="partnerLoanRate"
                value={inputs.partnerLoanRate}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Target EMI Share of A (%)
              </label>
              <input
                type="number"
                name="targetShare"
                value={inputs.targetShare}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={calculateResults}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Calculate
            </button>
          </div>
        </div>

        {results && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Results</h2>
            
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Bank Loan Details</h3>
                <p className="text-sm text-gray-600">Monthly EMI: ₹{formatNumber(results.bankEMI)}</p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Initial Split (Before Premium)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Partner A</p>
                    <p className="text-sm text-gray-900">Share: {results.initialPartnerAShare.toFixed(2)}%</p>
                    <p className="text-sm text-gray-900">EMI: ₹{formatNumber(results.initialPartnerAEMI)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Partners B, C, D</p>
                    <p className="text-sm text-gray-900">Share: {results.initialPartnerBCDShare.toFixed(2)}%</p>
                    <p className="text-sm text-gray-900">EMI: ₹{formatNumber(results.initialPartnerBCDEMI)}</p>
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Initial Split with Premium</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Partner A</p>
                    <p className="text-sm text-gray-900">Share: {results.partnerAShare.toFixed(2)}%</p>
                    <p className="text-sm text-gray-900">EMI: ₹{formatNumber(results.partnerAEMI)}</p>
                    <p className="text-sm text-gray-900">Effective Ownership Cost: {results.effectiveOwnershipCost.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Partners B, C, D</p>
                    <p className="text-sm text-gray-900">Share: {results.partnerBCDShare.toFixed(2)}%</p>
                    <p className="text-sm text-gray-900">EMI: ₹{formatNumber(results.partnerBCDEMI)}</p>
                  </div>
                </div>
              </div>

              {results.partnerLoanPrincipal && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Partner Loan Details</h3>
                    <p className="text-sm text-gray-500">Loan Amount: <span className="font-semibold text-gray-900">₹{formatNumber(results.partnerLoanPrincipal)}</span></p>
                    <p className="text-sm text-gray-500">Partner Loan EMI: ₹{formatNumber(results.partnerLoanEMI)}</p>
                  </div>
                  
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Partner A's Final Position</h3>
                    <p className="text-sm text-gray-500">Share: {results.finalPartnerAShare}%</p>
                    <p className="text-sm text-gray-500">Final Bank EMI: ₹{formatNumber(results.finalPartnerAEMI)}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Partners B, C, D's Final Position</h3>
                    <p className="text-sm text-gray-500">Bank EMI with Premium: ₹{formatNumber(results.partnerBCDEMI)}</p>
                    <p className="text-sm text-gray-500">Partner Loan EMI: ₹{formatNumber(results.partnerLoanEMI)}</p>
                    <p className="text-sm font-medium text-gray-900 mt-2">Total Monthly Payment: ₹{formatNumber(results.finalPartnerBCDTotalEMI)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}