import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Sparkles, 
  Lock, 
  X, 
  CreditCard,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import type { User as UserType, PaymentRecord } from '../types';

interface SubscriptionViewProps {
  currentUser: UserType;
  onUpgrade: (payload: {
    planName: string;
    amount: number;
    cardNumber: string;
    cardExpiry: string;
    cardCVC: string;
    cardholderName: string;
    simulatedBalance: number;
  }) => Promise<{ success: boolean; message: string }>;
  paymentHistory: PaymentRecord[];
}

export const MOCK_MFS_ACCOUNTS = [
  {
    number: '01743597989',
    name: 'Tamjidul Islam Surovi',
    services: { BKASH: true, NAGAD: true, ROCKET: true },
    balance: 12500.00,
    isActive: true,
  },
  {
    number: '01888123456',
    name: 'Rahim Chowdhury (Low Bal)',
    services: { BKASH: true, NAGAD: false, ROCKET: true },
    balance: 200.00,
    isActive: true,
  },
  {
    number: '01999765432',
    name: 'Karim Uddin (Nagad Only)',
    services: { BKASH: false, NAGAD: true, ROCKET: false },
    balance: 8500.00,
    isActive: true,
  },
  {
    number: '01511223344',
    name: 'Unregistered SIM User',
    services: { BKASH: false, NAGAD: false, ROCKET: false },
    balance: 0.00,
    isActive: false,
  }
];

export default function SubscriptionView({ currentUser, onUpgrade, paymentHistory }: SubscriptionViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priceSettings, setPriceSettings] = useState<{
    basePrice: number;
    offerPrice: number | null;
    customOfferText: string;
  }>({
    basePrice: 1500,
    offerPrice: null,
    customOfferText: ""
  });

  const fetchPriceSettings = async () => {
    try {
      const res = await fetch('/api/payments/price-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.priceSettings) {
          setPriceSettings(data.priceSettings);
        }
      }
    } catch (e) {
      console.error("Failed to fetch custom pricing:", e);
    }
  };

  useEffect(() => {
    fetchPriceSettings();
  }, [isModalOpen]);

  const currentPrice = priceSettings.offerPrice !== null ? priceSettings.offerPrice : priceSettings.basePrice;
  const isDiscounted = priceSettings.offerPrice !== null && priceSettings.offerPrice < priceSettings.basePrice;

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardholderName, setCardholderName] = useState(currentUser?.name || '');
  const [simulatedBalance, setSimulatedBalance] = useState(18000.00);

  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Multi-step Checkout and Payment Methods Support
  const [checkoutStage, setCheckoutStage] = useState<'CONFIRM' | 'PAY'>('CONFIRM');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'PAYPAL' | 'GPAY' | 'BKASH' | 'ROCKET' | 'NAGAD'>('BKASH');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState(currentUser?.email || '');
  const [paypalPassword, setPaypalPassword] = useState('');

  // Bangladeshi Mobile Financial Services (MFS) States
  const [mfsNumber, setMfsNumber] = useState('01743597989');
  const [mfsPin, setMfsPin] = useState('');
  const [mfsOtp, setMfsOtp] = useState('');
  const [mfsStep, setMfsStep] = useState<'NUMBER' | 'OTP' | 'PIN'>('NUMBER');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [isOtpSending, setIsOtpSending] = useState(false);

  // Form input formatting
  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const truncated = digits.slice(0, 16);
    const parts = [];
    for (let i = 0; i < truncated.length; i += 4) {
      parts.push(truncated.slice(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const truncated = digits.slice(0, 4);
    if (truncated.length > 2) {
      setCardExpiry(`${truncated.slice(0, 2)}/${truncated.slice(2)}`);
    } else {
      setCardExpiry(truncated);
    }
  };

  const handleCVCChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setCardCVC(digits.slice(0, 4));
  };

  const applyPreset = (number: string, expiry: string, cvc: string, balance: number) => {
    setCardNumber(number);
    setCardExpiry(expiry);
    setCardCVC(cvc);
    setSimulatedBalance(balance);
    setCardholderName(currentUser?.name || 'John Doe');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleStripeCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    let cardNumToSubmit = cardNumber;
    let cardExpToSubmit = cardExpiry;
    let cardCvcToSubmit = cardCVC;
    let nameToSubmit = cardholderName;
    let balanceToSubmit = simulatedBalance;

    if (paymentMethod === 'BKASH' || paymentMethod === 'NAGAD' || paymentMethod === 'ROCKET') {
      const getProviderName = () => paymentMethod === 'BKASH' ? 'bKash' : paymentMethod === 'NAGAD' ? 'Nagad' : 'Rocket';
      
      if (mfsStep === 'NUMBER') {
        const cleanNumber = mfsNumber.trim();
        if (!cleanNumber || !/^01[3-9]\d{8}$/.test(cleanNumber)) {
          setErrorMessage(`Please enter a valid 11-digit Bangladeshi mobile account number starting with 013-019 (e.g., 01743597989).`);
          return;
        }

        const matchedAcc = MOCK_MFS_ACCOUNTS.find(acc => acc.number === cleanNumber);
        if (matchedAcc) {
          const hasService = matchedAcc.services[paymentMethod as 'BKASH' | 'NAGAD' | 'ROCKET'];
          if (!hasService) {
            setErrorMessage(`Inactive Wallet: This mobile number does not have a registered active ${getProviderName()} personal wallet. Please double check the number or select another payment gateway.`);
            return;
          }
        }
        
        setIsOtpSending(true);
        setTimeout(() => {
          setIsOtpSending(false);
          const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
          setSimulatedOtp(generatedCode);
          setMfsStep('OTP');
        }, 800);
        return;
      }

      if (mfsStep === 'OTP') {
        if (!mfsOtp || mfsOtp !== simulatedOtp) {
          setErrorMessage("Invalid verification code. Please check the simulated SMS alert prompt above.");
          return;
        }
        setMfsStep('PIN');
        return;
      }

      if (mfsStep === 'PIN') {
        if (!mfsPin || mfsPin.length < 4) {
          setErrorMessage(`Please enter your secure ${getProviderName()} personal wallet security PIN.`);
          return;
        }

        const matchedAcc = MOCK_MFS_ACCOUNTS.find(acc => acc.number === mfsNumber);
        const dynamicBalance = matchedAcc ? matchedAcc.balance : 5000.00;

        if (dynamicBalance < currentPrice) {
          setErrorMessage(`Transaction Failed: Insufficient balance in your ${getProviderName()} wallet. Your wallet balance is ৳${dynamicBalance.toLocaleString()}, but the recurring plan subscription requires ৳${currentPrice.toLocaleString()}. Please cash-in your wallet and try again.`);
          // Continue to submit with low balance so the server logs the transaction record as FAILED in payment history
          cardNumToSubmit = '4242 4242 4242 4242';
          cardExpToSubmit = '12/29';
          cardCvcToSubmit = '424';
          nameToSubmit = `${paymentMethod.toUpperCase()} MFS: ${mfsNumber}`;
          balanceToSubmit = dynamicBalance;
        } else {
          // Valid PIN and sufficient balance! Proceed with simulated payment
          cardNumToSubmit = '4242 4242 4242 4242';
          cardExpToSubmit = '12/29';
          cardCvcToSubmit = '424';
          nameToSubmit = `${paymentMethod.toUpperCase()} MFS: ${mfsNumber}`;
          balanceToSubmit = dynamicBalance;
        }
      }
    } else if (paymentMethod === 'PAYPAL') {
      if (!paypalEmail || !paypalPassword) {
        setErrorMessage("Please fill in your PayPal connection credentials.");
        return;
      }
      // Simulate standard card token generation for underlying API validation support
      cardNumToSubmit = '4242 4242 4242 4242';
      cardExpToSubmit = '12/29';
      cardCvcToSubmit = '424';
      nameToSubmit = `PayPal: ${paypalEmail}`;
      balanceToSubmit = 250.00;
    } else if (paymentMethod === 'GPAY') {
      // Google Pay device token auto authorized 
      cardNumToSubmit = '4242 4242 4242 4242';
      cardExpToSubmit = '12/29';
      cardCvcToSubmit = '424';
      nameToSubmit = `Google Pay (${currentUser?.name || 'User'})`;
      balanceToSubmit = 250.00;
    } else {
      // CARD details validation
      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 15 || cleanNum.length > 16) {
        setErrorMessage("Please enter a valid credit card number.");
        return;
      }

      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setErrorMessage("Expiration date must be in MM/YY format.");
        return;
      }
    }

    setSubmittingPayment(true);
    try {
      const result = await onUpgrade({
        planName: 'Premium Archive Ultimate',
        amount: currentPrice,
        cardNumber: cardNumToSubmit,
        cardExpiry: cardExpToSubmit,
        cardCVC: cardCvcToSubmit,
        cardholderName: nameToSubmit,
        simulatedBalance: balanceToSubmit
      });

      if (result.success) {
        setSuccessMessage(result.message || "Payment processed successfully!");
        setCardNumber('');
        setCardExpiry('');
        setCardCVC('');
        setPaypalEmail('');
        setPaypalPassword('');
        setMfsNumber('01743597989');
        setMfsPin('');
        setMfsOtp('');
        setMfsStep('NUMBER');
        setSimulatedOtp('');
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccessMessage('');
          setCheckoutStage('CONFIRM');
          setTermsAccepted(false);
        }, 1800);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reach payment gateway.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const hasPremium = ['PREMIUM_USER', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role || '');

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-8" id="subscription-wrapper">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2" id="billing-title">
            <span>Storage Plans & Billing</span>
            {hasPremium && (
              <span className="bg-blue-500/10 text-blue-400 text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-md border border-blue-500/20 uppercase font-semibold">
                PREMIUM ACTIVE
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose a plan that matches your archival needs. Upgrade or cancel anytime.
          </p>
        </div>
      </div>

      {/* Pricing Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Storage Tier */}
        <div className="bg-slate-900/35 border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between" id="free-tier-card">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block mb-1">STANDARD</span>
            <h3 className="text-lg font-bold text-slate-200">Free Storage</h3>
            <p className="text-xs text-slate-400 mt-2 mb-6">Standard redundant backup space for basic cloud uploads.</p>
            
            <div className="mb-6">
              <span className="text-3xl font-bold text-white">৳0</span>
              <span className="text-xs text-slate-500 ml-1">/ forever</span>
            </div>

            <hr className="border-slate-800/50 mb-6" />

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2.5 text-xs text-slate-300">
                <Check className="w-4 h-4 text-slate-500 shrink-0" />
                5 GB Secure Storage Space
              </li>
              <li className="flex items-center gap-2.5 text-xs text-slate-300">
                <Check className="w-4 h-4 text-slate-500 shrink-0" />
                Standard Photo & Video uploads
              </li>
            </ul>
          </div>

          <button
            disabled
            className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-lg text-xs font-mono font-medium"
          >
            {!hasPremium ? 'Active Plan' : 'Free Tier Standard'}
          </button>
        </div>

        {/* Premium Storage Tier */}
        <div className={`p-6 rounded-xl flex flex-col justify-between relative overflow-hidden border transition-all ${
          hasPremium 
            ? 'bg-blue-950/10 border-blue-500/40 shadow-sm shadow-blue-500/5' 
            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
        }`} id="premium-tier-card">
          {hasPremium && (
            <div className="absolute top-0 right-0 bg-blue-600/90 text-white text-[9px] font-mono tracking-wider font-bold px-2.5 py-1 rounded-bl">
              CURRENT
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase">ARCHIVE PRO</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white">Premium Ultimate</h3>
            <p className="text-xs text-slate-400 mt-2 mb-6">High-performance redundant memory cloud storage for power users.</p>
            
            <div className="mb-6">
              {isDiscounted ? (
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">৳{currentPrice.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 line-through">৳{priceSettings.basePrice.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] font-bold text-[#e2126f] bg-[#e2126f]/10 border border-[#e2126f]/20 uppercase tracking-wider font-mono px-2 py-0.5 rounded inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-bounce" />
                    <span>{priceSettings.customOfferText || "Special Offer!"}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-3xl font-bold text-white">৳{priceSettings.basePrice.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 ml-1">/ month</span>
                </div>
              )}
            </div>

            <hr className="border-slate-800/60 mb-6" />

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2.5 text-xs text-slate-200">
                <Check className="w-4 h-4 text-blue-400 shrink-0" />
                <strong>1 TB (1,000 GB)</strong> Cloud Space
              </li>
              <li className="flex items-center gap-2.5 text-xs text-slate-200">
                <Check className="w-4 h-4 text-blue-400 shrink-0" />
                Instant buffer-free media rendering
              </li>
              <li className="flex items-center gap-2.5 text-xs text-slate-200">
                <Check className="w-4 h-4 text-blue-400 shrink-0" />
                Automated raw-quality backups
              </li>
            </ul>
          </div>

          {hasPremium ? (
            <div className="w-full py-2 bg-blue-500/5 border border-blue-500/25 text-blue-400 text-xs text-center font-mono rounded-lg">
              Authorized Plan Provisioned
            </div>
          ) : (
            <button
              onClick={() => {
                setErrorMessage('');
                setSuccessMessage('');
                setCheckoutStage('CONFIRM');
                setPaymentMethod('BKASH');
                setMfsStep('NUMBER');
                setMfsNumber('01743597989');
                setMfsPin('');
                setMfsOtp('');
                setSimulatedOtp('');
                setTermsAccepted(false);
                setIsModalOpen(true);
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              id="start-checkout-btn"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Subscribe & Upgrade Now
            </button>
          )}
        </div>
      </div>

      {/* Multi-Step Checkout Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fadeIn" id="modal-container">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl space-y-5 animate-scaleUp" id="checkout-panel">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/10">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-sans">
                    {checkoutStage === 'CONFIRM' ? '1. Order Confirmation' : '2. Secure Payment Gateway'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {checkoutStage === 'CONFIRM' ? 'Please review your storage purchase order' : 'Enter your billing details to initiate payment'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 hover:bg-slate-800 transition-all text-xs cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Error / Success feedback inline */}
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs flex items-start gap-2 font-mono" id="checkout-error">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3 text-xs flex items-start gap-2 font-mono" id="checkout-success">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* STAGE 1: PURCHASE CONFIRMATION */}
            {checkoutStage === 'CONFIRM' && (
              <div className="space-y-4 font-sans">
                {/* Product Detail Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Premium Vault Pack</h4>
                      <p className="text-[11px] text-slate-400 mt-1">Unlimited raw file backups & prioritised multi-threaded sync</p>
                    </div>
                    <div className="text-right">
                      {isDiscounted ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-blue-400">৳{currentPrice.toLocaleString()}</span>
                          <span className="text-[9px] text-slate-500 line-through">৳{priceSettings.basePrice.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-blue-400">৳{priceSettings.basePrice.toLocaleString()}</span>
                      )}
                      <span className="text-[10px] text-slate-500 block">/ month</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-900/60 pt-3 flex justify-between text-xs">
                    <span className="text-slate-500">Includes:</span>
                    <span className="text-slate-300 text-[11px] font-mono">1,000 GB (1 TB) Storage Limit</span>
                  </div>
                </div>

                {/* SELECT PAYMENT METHOD */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-mono text-slate-400 tracking-wider">Choose Payment Method</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* OPTION BKASH */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BKASH')}
                      className={`py-3 px-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        paymentMethod === 'BKASH'
                          ? 'bg-[#e2126f]/15 border-[#e2126f] text-[#e2126f] shadow-sm shadow-[#e2126f]/10'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      <span className="font-sans font-black text-xs uppercase tracking-tight text-[#e2126f]">bKash</span>
                      <span className="text-[9px] font-mono tracking-tighter">BKASH</span>
                    </button>

                    {/* OPTION NAGAD */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('NAGAD')}
                      className={`py-3 px-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        paymentMethod === 'NAGAD'
                          ? 'bg-[#f04a23]/15 border-[#f04a23] text-[#f04a23] shadow-sm shadow-[#f04a23]/10'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      <span className="font-sans font-black text-xs uppercase tracking-tight text-[#f04a23]">Nagad</span>
                      <span className="text-[9px] font-mono tracking-tighter">NAGAD</span>
                    </button>

                    {/* OPTION ROCKET */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('ROCKET')}
                      className={`py-3 px-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        paymentMethod === 'ROCKET'
                          ? 'bg-[#8c2d82]/15 border-[#8c2d82] text-[#8c2d82] shadow-sm shadow-[#8c2d82]/10'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      <span className="font-sans font-black text-xs uppercase tracking-tight text-[#8c2d82]">Rocket</span>
                      <span className="text-[9px] font-mono tracking-tighter">ROCKET</span>
                    </button>

                    {/* OPTION CARD */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD')}
                      className={`py-3 px-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        paymentMethod === 'CARD'
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400 shadow-sm shadow-blue-500/10'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 shrink-0 mx-auto" />
                      <span className="text-[9px] font-mono tracking-tighter">CREDIT CARD</span>
                    </button>
                  </div>
                </div>

                {/* TERMS CHECKBOX REQUIRED BEFORE UPGRADE */}
                <div className="bg-slate-950 border border-slate-850/65 rounded-xl p-3.5 mt-2">
                  <label className="flex gap-2.5 items-start cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-850 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-950 accent-blue-500"
                    />
                    <div className="text-xs text-slate-400 leading-normal">
                      <span>I confirm that I want to subscribe to the </span>
                      <strong className="text-white">Premium Archive Ultimate Pack</strong> 
                      <span> and authorize ShamCloud to execute a recurring transaction simulated charge of ৳{currentPrice.toLocaleString()} / month. I acknowledge that I am paying first before acquiring high-tier status in accordance with platform policies.</span>
                    </div>
                  </label>
                </div>

                {/* ACTION TRIGGER BUTTONS */}
                <button
                  type="button"
                  disabled={!termsAccepted}
                  onClick={() => {
                    setErrorMessage('');
                    setCheckoutStage('PAY');
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-blue-600/10"
                >
                  Confirm Purchase & Proceed to Pay
                </button>
              </div>
            )}

            {/* STAGE 2: SECURE PAYMENT DETAILS FORM */}
            {checkoutStage === 'PAY' && (
              <div className="space-y-4">
                
                {/* Exceeded checkout header / Back to confirm order button */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-mono">Billed Total: <strong className="text-white font-sans">৳{currentPrice.toLocaleString()} / month</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setCheckoutStage('CONFIRM');
                    }}
                    className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer flex items-center gap-1"
                  >
                    ← Back to Order Summary
                  </button>
                </div>

                {/* Quick Test Mode Controls (Only relevant for simulating success/failure with the preset accounts) */}
                {paymentMethod === 'CARD' && (
                  <div className="bg-slate-950 border border-slate-850/80 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] uppercase font-mono font-bold text-slate-500">Fill test credit card details</span>
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                        Available Balance: ৳{simulatedBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPreset('4242 4242 4242 4242', '12/29', '424', 30000.00)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-blue-950/45 border border-slate-800 hover:border-blue-900/40 text-slate-300 hover:text-blue-300 rounded text-[10px] font-mono transition-colors cursor-pointer"
                      >
                        Success (Visa)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('5454 5454 5454 9999', '11/28', '999', 500.00)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-red-950/35 border border-slate-800 hover:border-red-900/30 text-slate-300 hover:text-red-300 rounded text-[10px] font-mono transition-colors cursor-pointer"
                      >
                        Decline (Funds)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('4000 1234 5678 1111', '01/23', '111', 12000.00)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-yellow-950/35 border border-slate-800 hover:border-yellow-900/30 text-slate-300 hover:text-yellow-300 rounded text-[10px] font-mono transition-colors cursor-pointer"
                      >
                        Decline (Expired)
                      </button>
                    </div>
                  </div>
                )}

                {/* FORM SPECIFIC CHANNELS */}
                <form onSubmit={handleStripeCheckoutSubmit} className="space-y-4">
                  {/* CARD PAYMENT INTERFACE */}
                  {paymentMethod === 'CARD' && (
                    <div className="space-y-3.5">
                      {/* Cardholder */}
                      <div>
                        <label className="block text-[9px] uppercase font-mono text-slate-400 mb-1">Cardholder Name</label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          value={cardholderName}
                          onChange={e => setCardholderName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Card Number */}
                      <div>
                        <label className="block text-[9px] uppercase font-mono text-slate-400 mb-1">Card Number</label>
                        <input
                          type="text"
                          required
                          placeholder="4242 4242 4242 4242"
                          value={cardNumber}
                          onChange={e => handleCardNumberChange(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none transition-colors font-mono"
                        />
                      </div>

                      {/* Expiry and CVC */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] uppercase font-mono text-slate-400 mb-1">Expires (MM/YY)</label>
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={e => handleExpiryChange(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none transition-colors font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase font-mono text-slate-400 mb-1">CVC / CVV</label>
                          <input
                            type="password"
                            required
                            placeholder="•••"
                            value={cardCVC}
                            onChange={e => handleCVCChange(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none transition-colors font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BANGLADESHI MFS CHANNELS */}
                  {(paymentMethod === 'BKASH' || paymentMethod === 'NAGAD' || paymentMethod === 'ROCKET') && (() => {
                    const config = paymentMethod === 'BKASH' 
                      ? { name: 'bKash', color: '#e2126f', bg: 'bg-[#e2126f]', border: 'border-[#e2126f]/30', text: 'text-[#e2126f]', lightBg: 'bg-[#e2126f]/10' }
                      : paymentMethod === 'NAGAD'
                      ? { name: 'Nagad', color: '#f04a23', bg: 'bg-[#f04a23]', border: 'border-[#f04a23]/30', text: 'text-[#f04a23]', lightBg: 'bg-[#f04a23]/10' }
                      : { name: 'Rocket', color: '#8c2d82', bg: 'bg-[#8c2d82]', border: 'border-[#8c2d82]/30', text: 'text-[#8c2d82]', lightBg: 'bg-[#8c2d82]/10' };

                    return (
                      <div className="space-y-4">
                        {mfsStep === 'NUMBER' && (
                          <div className="space-y-4">
                            <div className={`p-4 rounded-xl border ${config.border} ${config.lightBg} space-y-2`}>
                              <div className="flex justify-between items-center">
                                <span className={`text-[11px] font-bold uppercase font-mono ${config.text}`}>{config.name} Merchant Gateway</span>
                                <span className="text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">Simulated</span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-normal">
                                Please enter your {config.name} personal account wallet number to initiate the secure authorization procedure. You pay first, then subscription acquires instant activation.
                              </p>
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1.5 tracking-wider">Mobile Account Number (11 Digits)</label>
                              <input
                                type="text"
                                required
                                pattern="^01[3-9]\d{8}$"
                                placeholder="e.g. 01743597989"
                                value={mfsNumber}
                                onChange={e => setMfsNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                className="w-full bg-slate-950 border border-slate-800 focus:border-[#3b82f6] text-slate-200 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none transition-colors font-mono tracking-wider"
                              />
                              <p className="text-[10px] text-slate-500 mt-1">Pre-filled with your verified billing phone number.</p>
                            </div>

                            {/* Quick MFS Test Presets helper panel */}
                            <div className="bg-slate-950 border border-slate-850/80 rounded-xl p-3 space-y-1.5 mt-2">
                              <div className="flex justify-between items-center text-[9px] uppercase font-mono font-black text-slate-500 tracking-wider">
                                <span>Quick Test Mobile Wallets</span>
                                <span className="text-[8px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full text-slate-400 lowercase">click to auto-fill</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {MOCK_MFS_ACCOUNTS.map(acc => {
                                  const providerKey = paymentMethod as 'BKASH' | 'NAGAD' | 'ROCKET';
                                  const isRegistered = acc.services[providerKey];
                                  const isSelected = mfsNumber === acc.number;
                                  
                                  return (
                                    <button
                                      key={acc.number}
                                      type="button"
                                      onClick={() => {
                                        setMfsNumber(acc.number);
                                        setErrorMessage('');
                                      }}
                                      className={`flex flex-col items-start p-2 rounded-lg border text-left cursor-pointer transition-all hover:bg-slate-900/60 ${
                                        isSelected 
                                          ? 'border-indigo-500 bg-indigo-500/5' 
                                          : 'border-slate-850 bg-slate-900/20 hover:border-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="text-[10px] font-bold text-slate-200 truncate pr-1">{acc.name}</span>
                                        <span className={`text-[8px] px-1 rounded font-mono font-bold uppercase shrink-0 ${
                                          isRegistered 
                                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                                            : 'text-red-400 bg-red-400/10 border border-red-500/20'
                                        }`}>
                                          {isRegistered ? 'Active' : 'No Account'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between w-full text-[9px] font-mono text-slate-400 mt-1">
                                        <span>{acc.number}</span>
                                        <span className="text-slate-300">৳{acc.balance.toLocaleString()}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {mfsStep === 'OTP' && (
                          <div className="space-y-4">
                            {/* Animated incoming SMS Banner */}
                            <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3.5 space-y-1.5 animate-fadeIn">
                              <div className="flex items-center gap-2 text-blue-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                <span>SMS Alert received on {mfsNumber}</span>
                              </div>
                              <p className="text-xs text-slate-300 font-mono">
                                "ShamCloud billing authentication token is: <strong className="text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 tracking-widest">{simulatedOtp}</strong>. Valid for 5 minutes."
                              </p>
                            </div>

                            <div className={`p-4 rounded-xl border ${config.border} ${config.lightBg} space-y-1.5`}>
                              <h4 className="text-xs font-bold text-white font-mono">{config.name} OTP Verification</h4>
                              <p className="text-[11px] text-slate-300">
                                Enter the system-generated verification digits sent to your mobile wallet above.
                              </p>
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1.5 tracking-wider">Verification Code (OTP)</label>
                              <input
                                type="text"
                                required
                                placeholder={`Enter code: ${simulatedOtp}`}
                                value={mfsOtp}
                                onChange={e => setMfsOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center w-full bg-slate-950 border border-slate-800 focus:border-[#3b82f6] text-slate-200 text-lg font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-colors font-mono tracking-widest"
                              />
                              <div className="flex justify-between items-center mt-1.5 font-mono">
                                <span className="text-[9px] text-slate-500">Simulated OTP Delivery: Active</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const code = String(Math.floor(1000 + Math.random() * 9000));
                                    setSimulatedOtp(code);
                                    setMfsOtp('');
                                  }}
                                  className="text-[10px] text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                                >
                                  Resend Secret OTP
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {mfsStep === 'PIN' && (
                          <div className="space-y-4">
                            <div className={`p-4 rounded-xl border ${config.border} ${config.lightBg} space-y-1.5`}>
                              <h4 className="text-xs font-bold text-white font-mono">{config.name} Secure Mobile PIN Verified</h4>
                              <p className="text-[11px] text-slate-300">
                                Verification successful! Please provide your standard {config.name} PIN to authorize standard ৳{currentPrice.toLocaleString()} subscription dues.
                              </p>
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1.5 tracking-wider">{config.name} Security PIN</label>
                              <input
                                type="password"
                                required
                                placeholder="•••••"
                                value={mfsPin}
                                onChange={e => setMfsPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                                className="text-center w-full bg-slate-950 border border-slate-800 focus:border-[#3b82f6] text-slate-200 text-lg font-bold rounded-xl px-4 py-2.5 focus:outline-none transition-colors font-mono tracking-widest"
                              />
                              <p className="text-[10px] text-slate-500 text-center mt-1.5">Encrypted locally. ShamCloud does not persist or see payment PINs.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono pt-1">
                    <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>Secure simulated checkout environment conforming with payment gateways.</span>
                  </div>

                  {/* Submitting CTA button */}
                  <button
                    type="submit"
                    disabled={submittingPayment || !!successMessage}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
                    id="stripe-checkout-btn"
                  >
                    {submittingPayment ? (
                      <span>Connecting, Authorizing and Paying...</span>
                    ) : successMessage ? (
                      <span>Charged Successfully!</span>
                    ) : isOtpSending ? (
                      <span>Sending OTP Verification Token...</span>
                    ) : (paymentMethod === 'BKASH' || paymentMethod === 'NAGAD' || paymentMethod === 'ROCKET') ? (
                      mfsStep === 'NUMBER' ? (
                        <span>Verify Number & Request OTP Code</span>
                      ) : mfsStep === 'OTP' ? (
                        <span>Verify OTP Security Code</span>
                      ) : (
                        <span>Authorize PIN & Securely Pay ৳{currentPrice.toLocaleString()}</span>
                      )
                    ) : (
                      <span>Securely Pay ৳{currentPrice.toLocaleString()} / Month</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Receipts History */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-5" id="invoices-ledger">
        <h3 className="text-sm font-bold text-white mb-4">Payment Receipts</h3>
        
        {paymentHistory.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            No transactions have been recorded on this wallet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-500 text-[10px]">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Service Plan</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">State</th>
                  <th className="pb-2 text-right">Dated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {paymentHistory.map((invoice) => (
                  <tr key={invoice.id} className="text-slate-300 hover:bg-slate-950/10">
                    <td className="py-2.5 text-slate-500 truncate max-w-[100px]">{invoice.id}</td>
                    <td className="py-2.5 text-slate-200">{invoice.planName}</td>
                    <td className="py-2.5 text-white font-medium">৳{invoice.amount < 150 ? (invoice.amount * 115).toFixed(0) : invoice.amount.toFixed(0)}</td>
                    <td className="py-2.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono ${
                        invoice.status === 'SUCCESS' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                          : 'bg-red-500/10 text-red-500 border border-red-500/10'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400 text-right">{new Date(invoice.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
