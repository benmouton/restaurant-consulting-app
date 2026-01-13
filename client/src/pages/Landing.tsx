import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { motion } from "framer-motion";
import { UtensilsCrossed, ArrowRight } from "lucide-react";

export default function Landing() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        
        {/* Left Side - Brand */}
        <div className="relative flex flex-col justify-between bg-primary p-8 text-primary-foreground lg:p-12 xl:p-20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514362545857-3bc16549766b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/90"></div>
          
          <div className="relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary shadow-lg shadow-black/20">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
          </div>

          <div className="relative z-10 max-w-lg">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-5xl font-bold leading-tight tracking-tight lg:text-6xl"
            >
              Excellence in <span className="text-accent">Service</span> & Operations.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-lg text-primary-foreground/80 leading-relaxed"
            >
              The digital handbook for Mouton's Bistro staff. Master the menu, perfect the service steps, and access instant operational guidance.
            </motion.p>
          </div>

          <div className="relative z-10 mt-12 text-xs font-medium uppercase tracking-widest text-primary-foreground/40">
            © {new Date().getFullYear()} Mouton's Bistro
          </div>
        </div>

        {/* Right Side - Login */}
        <div className="flex flex-col items-center justify-center bg-white p-8 lg:p-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-gray-900">Staff Portal Access</h2>
              <p className="mt-2 text-sm text-gray-500">
                Please authenticate to access the manual and consultant tools.
              </p>
            </div>

            <div className="mt-8">
              <a
                href="/api/login"
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-primary px-8 py-4 text-center font-bold text-white shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90 hover:shadow-2xl hover:shadow-primary/30 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Sign In to Continue
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
              </a>
            </div>

            <div className="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
              <p>Authorized personnel only.</p>
              <p>Use your registered staff account.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
