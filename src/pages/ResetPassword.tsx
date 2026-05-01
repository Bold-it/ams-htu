import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !newPassword) {
      toast.error("Required fields are missing");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await api.resetPassword(token, newPassword);
      if (error) {
        toast.error(error);
      } else {
        setIsSuccess(true);
        toast.success("Password reset successfully!");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50 p-4">
        <Card className="w-full max-w-md border-none shadow-xl bg-white/80 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2">Success!</CardTitle>
            <CardDescription className="text-slate-500 text-lg">
              Your password has been reset successfully. Redirecting you to the login page...
            </CardDescription>
            <Button 
                variant="outline" 
                className="mt-8"
                onClick={() => navigate("/login")}
            >
                Return to Login Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 p-4">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-3xl opacity-50 animate-pulse delay-700"></div>
      </div>

      <Card className="w-full max-w-md border-none shadow-2xl bg-white/90 backdrop-blur-md relative z-10 transition-all duration-300 hover:shadow-blue-500/10">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4 transform hover:rotate-3 transition-transform">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900">Set New Password</CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Please enter your new secure password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" /> Account Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@htu.edu.gh"
                value={email}
                disabled
                className="bg-slate-100/50 border-slate-200 text-slate-500 font-medium cursor-not-allowed"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token" className="text-slate-700 font-semibold">Security Token</Label>
              <Input
                id="token"
                placeholder="Enter 32-character token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="font-mono text-xs border-slate-200 focus-visible:ring-blue-500"
              />
              {!token && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" /> Token is required from your email
                  </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" title="At least 8 characters" className="text-slate-700 font-semibold">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="border-slate-200 focus-visible:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="border-slate-200 focus-visible:ring-blue-500"
              />
            </div>

            <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70" 
                disabled={isLoading}
            >
              {isLoading ? (
                  <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                  </div>
              ) : "Update Password"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 mt-4 pt-4">
          <Link to="/login" className="text-sm font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
