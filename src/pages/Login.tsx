import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, ShieldCheck, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api";
import htuLogo from "@/assets/htu-logo.jpg";



const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'pending'>('idle');
    const { login } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please enter both email and password");
            return;
        }

        setIsLoading(true);
        const { data, error } = await api.login(email, password);
        setIsLoading(false);

        if (error) {
            toast.error(error);
        } else if (data) {
            login(data.role, email, data.token);
            toast.success(`Logged in as ${data.role}`);
            navigate(from, { replace: true });
        }
    };

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
                login(data.role, data.email, data.token);
                toast.success(`Logged in as ${data.role}`);
                navigate(from, { replace: true });
            }
        }
    };



    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>

            <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center pb-8">
                    <div className="mx-auto h-20 w-20 flex items-center justify-center mb-4 rounded-full bg-white p-1 shadow-sm border border-slate-100">
                        <img
                            src={htuLogo}
                            alt="HTU Logo"
                            className="h-full w-full rounded-full object-contain"
                        />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access the monitoring system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@htu.edu.gh"
                                        className="pl-10 h-11"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10 h-11"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end -mt-2">
                            <ForgotPasswordDialog />
                        </div>
                        <Button className="w-full h-11 text-base font-medium group" type="submit" disabled={isLoading || status === 'pending'}>
                            {isLoading ? "Authenticating..." : "Sign In"}
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground font-medium">
                                or continue with
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error("Google Login Failed")}
                            useOneTap
                            shape="rectangular"
                            width="100%"
                            theme="outline"
                        />
                    </div>

                    {status === 'pending' && (
                        <Alert className="mt-6 border-amber-200 bg-amber-50 text-amber-800">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="font-bold">Pending Approval</AlertTitle>
                            <AlertDescription>
                                Your `@htu.edu.gh` account is awaiting verification by the Super Admin. You will receive an email once approved.
                            </AlertDescription>
                        </Alert>
                    )}

                </CardContent>
                <CardFooter className="flex flex-col space-y-4 pt-2">

                    <p className="text-center text-xs text-muted-foreground mt-4">
                        Quality Assurance Unit · Ho Technical University
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
