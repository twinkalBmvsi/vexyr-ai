"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your subscription...");
  const supabase = createClient();

  useEffect(() => {
    const checkSubscription = async () => {
      // 1. Get current user session
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        window.location.href = "/login";
        return;
      }

      const user = authData.session.user;

      // 2. Poll for active subscription
      let attempts = 0;
      let subscriptionActive = false;
      let userRecord = null;

      while (!subscriptionActive && attempts < 10) {
        attempts++;
        
        // Fetch user record to get tenant_id
        const { data: uRecord } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
          
        if (uRecord?.tenant_id) {
          userRecord = uRecord;
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('tenant_id', uRecord.tenant_id)
            .eq('status', 'active')
            .maybeSingle();

          if (sub) {
            subscriptionActive = true;
            break;
          }
        }
        
        // Wait 2 seconds before polling again
        await new Promise(r => setTimeout(r, 2000));
      }

      if (!subscriptionActive || !userRecord) {
        setStatus("error");
        setMessage("We couldn't verify your subscription yet. Please refresh this page or contact support.");
        return;
      }

      setStatus("success");
      setMessage("Subscription verified! Redirecting to your dashboard...");

      // 3. Fetch tenant slug for handoff
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', userRecord.tenant_id)
        .single();

      // Give the user a moment to see the success state before redirecting
      setTimeout(() => {
        if (tenant?.slug) {
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost';
          window.location.href = `http://${tenant.slug}.${rootDomain}:3000/auth/handoff?access_token=${authData.session.access_token}&refresh_token=${authData.session.refresh_token}`;
        } else {
          window.location.href = "/";
        }
      }, 1500);
    };

    checkSubscription();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-[var(--paper)]">
      {/* Decorative subtle background glow matching the gold theme */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
         <div 
           className="absolute w-[600px] h-[600px] rounded-full opacity-10 animate-pulse" 
           style={{ background: 'radial-gradient(circle, var(--gold) 0%, transparent 70%)' }} 
         />
      </div>

      <div 
        className="w-full max-w-xl relative z-10 p-12 text-center transition-all duration-700 ease-out flex flex-col items-center bg-[var(--cream)]"
        style={{ 
          border: '1px solid var(--border-strong)',
          transform: status === 'success' ? 'scale(1.02)' : 'scale(1)',
          boxShadow: status === 'success' ? '0 20px 40px rgba(12,12,12,0.05)' : 'none'
        }}
      >
        
        {/* Status Label (Using the global .section-label design) */}
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.68rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--gold)",
          marginBottom: "2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem"
        }}>
          <div style={{ width: "2rem", height: "1px", background: "var(--gold)" }} />
          Status
          <div style={{ width: "2rem", height: "1px", background: "var(--gold)" }} />
        </div>
        
        {/* Icon Container */}
        <div className="flex justify-center mb-8">
          {status === "verifying" && (
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin" style={{ color: "var(--gold)" }} />
            </div>
          )}
          {status === "success" && (
            <div className="relative animate-in zoom-in duration-500">
              <CheckCircle2 className="w-20 h-20" style={{ color: "#2a7a4a" }} />
            </div>
          )}
          {status === "error" && (
            <div className="relative animate-in zoom-in duration-500">
              <AlertCircle className="w-16 h-16" style={{ color: "#a72828" }} />
            </div>
          )}
        </div>
        
        {/* Typography using Cormorant Garamond */}
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 300,
          lineHeight: 1.1,
          color: "var(--ink)",
          marginBottom: "1.25rem"
        }}>
          {status === "verifying" && <span><em>Verifying</em> Payment</span>}
          {status === "success" && <span>Payment <em>Successful</em></span>}
          {status === "error" && <span>Verification <em>Timeout</em></span>}
        </h2>
        
        {/* Subtitle using DM Sans */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "1rem",
          color: "var(--muted)",
          lineHeight: 1.7,
          fontWeight: 300,
          maxWidth: "38ch",
          marginBottom: status === "error" ? "2.5rem" : "1rem"
        }}>
          {message}
        </p>

        {/* Global Button Class */}
        {status === "error" && (
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary mt-4"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
