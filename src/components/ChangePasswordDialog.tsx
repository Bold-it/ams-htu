import { useState } from "react";
import { Shield, Key, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
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
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ChangePasswordDialog() {
    const { role } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Only admins and super_admins can change password via this dialog
    if (role !== "admin" && role !== "super_admin") return null;

    const getStrength = (pwd: string): { label: string; color: string; width: string } => {
        if (pwd.length === 0) return { label: "", color: "bg-slate-200", width: "w-0" };
        if (pwd.length < 8) return { label: "Too short", color: "bg-red-500", width: "w-1/4" };
        const hasUpper = /[A-Z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
        const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
        if (score === 0) return { label: "Weak", color: "bg-orange-400", width: "w-2/4" };
        if (score === 1) return { label: "Fair", color: "bg-yellow-400", width: "w-3/4" };
        return { label: "Strong", color: "bg-green-500", width: "w-full" };
    };

    const strength = getStrength(formData.newPassword);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.newPassword.length < 8) {
            toast.error("New password must be at least 8 characters");
            return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        setIsSubmitting(true);
        const { data, error } = await api.changePassword(
            formData.currentPassword,
            formData.newPassword,
            role,
        );
        setIsSubmitting(false);

        if (error) {
            toast.error(error);
        } else {
            setIsSuccess(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsSuccess(false);
                setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            }, 2000);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setIsSuccess(false);
            setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-white/10"
                    title="Change My Password"
                >
                    <Key className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
                {isSuccess ? (
                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="bg-green-100 p-4 rounded-full">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Password Updated!</h3>
                            <p className="text-sm text-slate-500 mt-1">Your password has been changed successfully.</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                                <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <DialogTitle className="text-center text-xl">Change Password</DialogTitle>
                            <DialogDescription className="text-center">
                                Update your account password. Use a strong password of at least 8 characters.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-6">
                            {/* Current Password */}
                            <div className="space-y-2">
                                <Label htmlFor="current">Current Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="current"
                                        type={showCurrent ? "text" : "password"}
                                        placeholder="Enter current password"
                                        className="pl-10 pr-10"
                                        value={formData.currentPassword}
                                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-slate-700"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                    >
                                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-4">
                                {/* New Password */}
                                <div className="space-y-2">
                                    <Label htmlFor="new">New Password</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="new"
                                            type={showNew ? "text" : "password"}
                                            placeholder="Minimum 8 characters"
                                            className="pl-10 pr-10"
                                            value={formData.newPassword}
                                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-slate-700"
                                            onClick={() => setShowNew(!showNew)}
                                        >
                                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {/* Strength bar */}
                                    {formData.newPassword.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                                            </div>
                                            <p className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <Label htmlFor="confirm">Confirm New Password</Label>
                                    <div className="relative">
                                        <CheckCircle2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirm"
                                            type={showConfirm ? "text" : "password"}
                                            placeholder="Re-enter new password"
                                            className={`pl-10 pr-10 ${formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-slate-700"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                        >
                                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                                        <p className="text-xs text-red-500">Passwords do not match</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                                {isSubmitting ? "Updating..." : "Update Password"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
