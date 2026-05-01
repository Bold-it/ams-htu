import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { AlertCircle, ShieldCheck, Zap, Globe } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api";
import htuLogo from "@/assets/htu-logo.jpg";
import campusHero from "@/assets/campus-hero.jpg";

const Login = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'pending'>('idle');
    const { login } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) return;

        setIsLoading(true);
        const { data, error } = await api.googleLogin(credentialResponse.credential);
        setIsLoading(false);

        if (error) {
            toast.error(error);
        } else if (data) {
            if (data.status === 'pending_approval') {
                setStatus('pending');
                toast.info("Account pending approval");
            } else if (data.role && data.token && data.email) {
                login(data.role, data.email, data.token, data.department, data.faculty);
                toast.success(`Logged in as ${data.role}`);
                navigate(from, { replace: true });
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden">
            {/* Left Side: Full-Bleed Branding & Authentic Imagery */}
            <div className="hidden md:flex flex-col justify-between w-1/2 p-16 relative overflow-hidden group">
                {/* Full-Bleed Background Image */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src={campusHero} 
                        alt="Ho Technical University Campus" 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80" />
                </div>

                <div className="animate-stagger-fade-in space-y-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white p-1 shadow-premium transition-transform hover:rotate-3">
                            <img src={htuLogo} alt="HTU Logo" className="h-full w-full object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black tracking-[0.3em] text-white uppercase hero-text-glow">Accreditation Management</span>
                        </div>
                    </div>
                    
                    <div className="pt-8">
                        <h1 className="text-6xl font-black tracking-tighter text-white leading-[0.9] hero-text-glow">
                            Excellence in <br />
                            <span className="text-white font-light italic">Accreditation</span> <br />
                            <span className="text-white/40">Monitoring.</span>
                        </h1>
                        <p className="mt-8 text-lg text-white/70 max-w-sm leading-relaxed font-medium">
                            Securing HTU's academic standards through unified 
                            compliance tracking and automated GTEC workflows.
                        </p>
                    </div>

                    <div className="flex gap-8 pt-8">
                        <div className="flex flex-col gap-1 border-l-2 border-white/20 pl-4 py-1">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Status</span>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Certified Compliance</span>
                        </div>
                        <div className="flex flex-col gap-1 border-l-2 border-orange-500/40 pl-4 py-1">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">System</span>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Automated Alerts</span>
                        </div>
                    </div>
                </div>

                <div className="mt-auto relative z-10">
                    <div className="mt-8 text-white/30 text-[10px] flex items-center gap-4 uppercase tracking-[0.3em] font-black">
                        <span>© 2026 HTU</span>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <span>OFFICE OF THE PRO-VICE CHANCELLOR</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form (Lively & High Contrast Background) */}
            <div className="flex-1 flex items-center justify-center p-6 relative bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
                {/* Branded Decorative Background Elements */}
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #000 1px, transparent 0)`, backgroundSize: '32px 32px' }} />

                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="md:hidden flex flex-col items-center mb-10 text-center">
                        <img src={htuLogo} alt="HTU Logo" className="h-20 w-20 rounded-full shadow-xl mb-4 bg-white p-1" />
                        <h2 className="text-3xl font-bold text-slate-900 mb-2 uppercase tracking-widest">WOEZOR</h2>
                        <p className="text-slate-500 px-4 text-sm uppercase tracking-wider">OFFICE OF THE PRO-VICE CHANCELLOR</p>
                    </div>

                    <Card className="glass-card border border-white/50 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[3rem] bg-white/90 backdrop-blur-xl transition-all duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)]">
                        <CardHeader className="space-y-2 text-center pb-8 pt-12">
                            <div className="hidden md:flex mx-auto h-28 w-28 items-center justify-center mb-6 rounded-[2.5rem] bg-white p-5 shadow-premium transition-transform hover:scale-110 hover:rotate-3 border border-slate-100">
                                <img src={htuLogo} alt="HTU Logo" className="h-full w-full object-contain" />
                            </div>
                            <CardTitle className="text-4xl font-black tracking-tight text-slate-900 hero-text-glow">Welcome <span className="text-primary italic">Back</span></CardTitle>
                            <CardDescription className="text-primary font-black pt-2 text-[10px] uppercase tracking-[0.3em] opacity-80">
                                Powered by ICT Directorate
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-12 flex flex-col items-center pt-8">
                            <div className="w-full bg-white/80 backdrop-blur-sm p-12 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center transition-all hover:bg-white shadow-inner relative group">
                                <div className="w-full flex justify-center scale-125 origin-center animate-bounce-slow">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => toast.error("Google Login Failed")}
                                        useOneTap
                                        content="signin_with"
                                        shape="pill"
                                        theme="filled_blue"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 text-center leading-relaxed font-bold uppercase tracking-[0.15em] pt-8">
                                    Auth exclusive to <span className="text-primary tracking-normal">@htu.edu.gh</span>
                                </p>
                            </div>

                            {status === 'pending' && (
                                <Alert className="mt-8 border-amber-200 bg-amber-50/90 backdrop-blur-md text-amber-900 animate-in fade-in slide-in-from-top-4 rounded-3xl shadow-md">
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                    <AlertTitle className="font-bold uppercase tracking-tight">Access Verification Needed</AlertTitle>
                                    <AlertDescription className="text-xs leading-relaxed font-medium">
                                        Your account is awaiting Super Admin verification. You will be notified via email once approved.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4 pt-12 pb-14">
                            <div className="flex items-center gap-6 text-slate-200">
                                <span className="h-[1px] w-20 bg-gradient-to-r from-transparent to-slate-100" />
                                <Globe className="h-5 w-5 opacity-40 text-slate-400" />
                                <span className="h-[1px] w-20 bg-gradient-to-l from-transparent to-slate-100" />
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Login;
