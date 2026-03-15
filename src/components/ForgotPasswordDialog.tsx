import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Mail, KeyRound, Loader2, ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface ForgotPasswordDialogProps {
    trigger?: React.ReactNode;
}

export function ForgotPasswordDialog({ trigger }: ForgotPasswordDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"request" | "reset">("request");
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleRequestToken = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        const { data, error } = await api.forgotPassword(email);
        setIsLoading(false);

        if (error) {
            toast.error(error);
        } else {
            toast.success("Reset token sent to your email");
            setStep("reset");
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            toast.error("Please enter the reset token");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters");
            return;
        }

        setIsLoading(true);
        const { data, error } = await api.resetPassword(token, newPassword);
        setIsLoading(false);

        if (error) {
            toast.error(error);
        } else {
            toast.success("Password reset successfully!");
            setIsSuccess(true);
            setTimeout(() => {
                setOpen(false);
                // Reset state for next time
                setStep("request");
                setIsSuccess(false);
                setEmail("");
                setToken("");
                setNewPassword("");
                setShowPassword(false);
            }, 2500);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen && !isSuccess) {
            // Reset to request step if closed before success
            setStep("request");
            setToken("");
            setNewPassword("");
            setShowPassword(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="link" className="px-0 font-normal text-primary hover:text-primary/80 transition-colors">
                        Forgot password?
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                        {step === "request" ? <Mail className="h-6 w-6 text-primary" /> : <ShieldCheck className="h-6 w-6 text-primary" />}
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">
                        {step === "request" ? "Reset Password" : "Secure Password Reset"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {step === "request"
                            ? "Enter your registered email and we'll send you a secure reset token."
                            : "Check your email for the token and set a strong new password below."}
                    </DialogDescription>
                </DialogHeader>

                {isSuccess ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-100 p-4 rounded-full">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Success!</h3>
                            <p className="text-sm text-slate-500 mt-1">Your password has been reset. You can now login.</p>
                        </div>
                    </div>
                ) : step === "request" ? (
                    <form onSubmit={handleRequestToken} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reset-email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="reset-email"
                                    type="email"
                                    placeholder="name@htu.edu.gh"
                                    className="pl-10 h-11"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="submit" className="w-full h-11 text-base group" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        Send Reset Token
                                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="token" className="flex items-center gap-2">
                                <KeyRound className="h-3 w-3" />
                                6-digit Secure Token
                            </Label>
                            <Input
                                id="token"
                                placeholder="Enter secure token from email"
                                className="h-11 font-mono tracking-widest text-center text-lg"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                maxLength={6}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Secure Password</Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Minimum 8 characters"
                                    className="h-11 pr-10"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-slate-700 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {newPassword && newPassword.length < 8 && (
                                <p className="text-[10px] text-red-500 font-medium">Password must be at least 8 characters.</p>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setStep("request")}
                                className="text-muted-foreground order-2 sm:order-1"
                            >
                                Back to request
                            </Button>
                            <Button type="submit" className="w-full sm:w-auto h-11 px-8 order-1 sm:order-2" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Reset Password
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
