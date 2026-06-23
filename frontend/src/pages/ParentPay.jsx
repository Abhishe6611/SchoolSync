import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

export default function ParentPay() {
  const { studentId } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null); // 'success' | 'failed'
  const [demoStatus, setDemoStatus] = useState("success");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/fees/portal/${studentId}`);
        setDetails(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [studentId]);

  const handlePayment = async () => {
    setProcessing(true);
    
    // Simulate 2-second processing delay (opening UPI app, entering PIN)
    setTimeout(async () => {
      try {
        const res = await api.post("/fees/mock-webhook", {
          student_id: Number(studentId),
          amount: details.balance > 0 ? details.balance : 1000,
          mode: "UPI",
          status: demoStatus
        });
        
        if (demoStatus === "success") {
          setResult("success");
        } else {
          setResult("failed");
        }
      } catch (e) {
        setResult("failed");
      } finally {
        setProcessing(false);
      }
    }, 2000);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!details) return <div className="flex h-screen items-center justify-center bg-slate-50"><p className="text-slate-500 font-medium">Student not found.</p></div>;

  if (result === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h2>
          <p className="text-slate-500 mb-6">Thank you. The receipt has been generated and sent to your email.</p>
          <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Student</p>
            <p className="font-semibold text-slate-800 mb-3">{details.student_name} ({details.class_name})</p>
            <p className="text-sm text-slate-500 mb-1">Amount Paid</p>
            <p className="font-bold text-emerald-600 font-mono text-lg">₹{(details.balance > 0 ? details.balance : 1000).toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (result === "failed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Failed</h2>
          <p className="text-slate-500 mb-6">Your transaction could not be processed. Please try again or use a different payment method.</p>
          <button onClick={() => setResult(null)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      {/* Demo Controls Panel (Top right) */}
      <div className="fixed top-4 right-4 bg-white shadow-lg border border-amber-200 rounded-lg p-3 z-50">
        <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">Demo Controls</p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="demo-status" checked={demoStatus === "success"} onChange={() => setDemoStatus("success")} className="text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5" />
            <span className="text-xs font-medium text-slate-700">Simulate Success</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="demo-status" checked={demoStatus === "failed"} onChange={() => setDemoStatus("failed")} className="text-red-500 focus:ring-red-500 w-3.5 h-3.5" />
            <span className="text-xs font-medium text-slate-700">Simulate Failure</span>
          </label>
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-8 text-center">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">School Payment Portal</h1>
          <p className="text-sm text-slate-300">Secure Online Fee Collection</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4 mb-8">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Student Details</p>
              <p className="text-base font-semibold text-slate-800">{details.student_name}</p>
              <p className="text-sm text-slate-500">{details.class_name}</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Outstanding Due</p>
                {details.balance > 0 ? (
                  <p className="text-2xl font-bold font-mono text-red-600">₹{details.balance.toLocaleString("en-IN")}</p>
                ) : (
                  <p className="text-lg font-bold text-emerald-600">Fully Paid</p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing || details.balance <= 0}
            className="w-full flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
          >
            {processing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing UPI...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
                Pay via UPI
              </>
            )}
          </button>
          
          <div className="mt-4 flex items-center justify-center gap-4 opacity-50 grayscale">
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-4" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" className="h-4" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg" alt="PhonePe" className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
