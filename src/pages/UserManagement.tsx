import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    UserPlus,
    Trash2,
    ShieldCheck,
    User as UserIcon,
    UserCog,
    Mail,
    Lock,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthContext";
import { Navigate } from "react-router-dom";
import { HTU_STRUCTURE } from "@/lib/htu-structure";
import { 
    SelectGroup, 
    SelectLabel 
} from "@/components/ui/select";

interface UserAccount {
    id: string;
    username: string;
    email: string;
    role: 'super_admin' | 'dean' | 'admin' | 'user';
    department: string | null;
    faculty: string | null;
    status: 'active' | 'pending_approval';
    created_at: string;
}


const UserManagement = () => {
    const { role, userEmail } = useAuth();
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [newUser, setNewUser] = useState<{
        username: string;
        email: string;
        password: string;
        role: 'dean' | 'admin' | 'user';
        department: string;
        faculty: string;
    }>({
        username: "",
        email: "",
        password: "",
        role: "user",
        department: "",
        faculty: ""
    });

    const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        const { data, error } = await api.getUsers();
        if (data) {
            setUsers(data);
        } else {
            toast.error(error || "Failed to fetch users");
        }
        setIsLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        const { error } = await api.createUser(newUser);
        setIsCreating(false);

        if (error) {
            toast.error(error);
        } else {
            toast.success("User account created successfully");
            setOpenAddDialog(false);
            setNewUser({ username: "", email: "", password: "", role: "user", department: "", faculty: "" });
            fetchUsers();
        }
    };

    const handleDeleteUser = async (id: string, email: string) => {
        if (email === userEmail) {
            toast.error("You cannot delete your own account");
            return;
        }

        if (window.confirm(`Are you sure you want to delete account: ${email}?`)) {
            const { error } = await api.deleteUser(id);
            if (error) {
                toast.error(error);
            } else {
                toast.success("User deleted successfully");
                fetchUsers();
            }
        }
    };

    const [isResetting, setIsResetting] = useState<string | null>(null);

    const handleResetPassword = async (id: string, email: string) => {
        if (window.confirm(`Are you sure you want to trigger a password reset for ${email}? An email with a secure token will be sent to them.`)) {
            setIsResetting(id);
            const { error } = await api.resetUserPassword(id);
            setIsResetting(null);

            if (error) {
                toast.error(error);
            } else {
                toast.success(`Reset email sent to ${email}`);
            }
        }
    };

    const [isApproving, setIsApproving] = useState<string | null>(null);

    const handleApproveUser = async (user: UserAccount) => {
        if (window.confirm(`Approve account for ${user.email}? This will send them a congratulations email.`)) {
            setIsApproving(user.id);
            const { error } = await api.approveUser(user.id);
            setIsApproving(null);

            if (error) {
                toast.error(error);
            } else {
                toast.success(`User ${user.email} approved and notified!`);
                fetchUsers();
            }
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setIsUpdating(true);
        const { error } = await api.updateUser(editingUser.id, {
            role: editingUser.role,
            department: editingUser.department || "",
            faculty: editingUser.faculty || ""
        });
        setIsUpdating(false);

        if (error) {
            toast.error(error);
        } else {
            toast.success("User updated successfully");
            setEditingUser(null);
            fetchUsers();
        }
    };


    if (role !== 'super_admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header />

            <main className="flex-1 container py-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <UserCog className="h-8 w-8 text-primary" />
                            User Management
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Grant permissions and manage system administrator accounts.
                        </p>
                    </div>

                    <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
                        <DialogTrigger asChild>
                            <Button className="shadow-md h-11 px-6">
                                <UserPlus className="mr-2 h-5 w-5" />
                                Add New Account
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <form onSubmit={handleCreateUser}>
                                <DialogHeader>
                                    <DialogTitle>Create User Account</DialogTitle>
                                    <DialogDescription>
                                        Add a new member to the Quality Assurance Unit.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="username">Full Name / Username</Label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="username"
                                                className="pl-10"
                                                placeholder="e.g. John Doe"
                                                value={newUser.username}
                                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                className="pl-10"
                                                placeholder="name@htu.edu.gh"
                                                value={newUser.email}
                                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">Initial Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            <Input
                                                id="password"
                                                type="password"
                                                className="pl-10"
                                                placeholder="••••••••"
                                                value={newUser.password}
                                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="role">System Role</Label>
                                        <Select
                                            value={newUser.role}
                                            onValueChange={(val) => setNewUser({ ...newUser, role: val as 'dean' | 'admin' | 'user' })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="dean">Dean (Faculty-wide)</SelectItem>
                                                <SelectItem value="admin">Administrator (Manager)</SelectItem>
                                                <SelectItem value="user">HOD / Viewer (Departmental)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {newUser.role === 'dean' ? (
                                        <div className="grid gap-2">
                                            <Label htmlFor="faculty">Managing Faculty</Label>
                                            <Select
                                                value={newUser.faculty}
                                                onValueChange={(val) => setNewUser({ ...newUser, faculty: val, department: "" })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Faculty" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {HTU_STRUCTURE.map(faculty => (
                                                        <SelectItem key={faculty.name} value={faculty.name}>{faculty.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-muted-foreground">Deans have access to all departments within their faculty.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            <Label htmlFor="department">Managing Department (If HOD)</Label>
                                            <Select
                                                value={newUser.department}
                                                onValueChange={(val) => setNewUser({ ...newUser, department: val, faculty: "" })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Department" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None / General</SelectItem>
                                                    {HTU_STRUCTURE.map(faculty => (
                                                        <SelectGroup key={faculty.name}>
                                                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase mt-2">{faculty.name}</SelectLabel>
                                                            {faculty.departments.map(dept => (
                                                                <SelectItem key={dept.name} value={dept.name}>{dept.name}</SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    ))}
                                                    <SelectItem value="OTHER">Other / Custom</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-muted-foreground">Required for HODs to filter their dashboard view.</p>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="w-full h-11" disabled={isCreating}>
                                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Account
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="border-none shadow-xl overflow-hidden bg-white">
                    <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-6">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Users className="h-6 w-6 text-primary" />
                                System Accounts
                            </CardTitle>
                            <CardDescription>Directory of all registered system users</CardDescription>
                        </div>
                        <Badge variant="outline" className="px-3 py-1 bg-slate-50 border-slate-200 text-slate-600 font-medium capitalize">
                            {users.length} Total Users
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="w-[250px] font-semibold py-4">Identity</TableHead>
                                        <TableHead className="font-semibold py-4">Email Address</TableHead>
                                        <TableHead className="font-semibold py-4">Department</TableHead>
                                        <TableHead className="font-semibold py-4">Faculty</TableHead>
                                        <TableHead className="font-semibold py-4">System Role</TableHead>
                                        <TableHead className="font-semibold py-4">Status</TableHead>
                                        <TableHead className="font-semibold py-4">Joined Date</TableHead>
                                        <TableHead className="text-right font-semibold py-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array(3).fill(0).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse">
                                                <TableCell colSpan={5} className="h-20 bg-slate-50/20"></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        users.map((user) => (
                                            <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${user.role === 'super_admin' ? 'bg-amber-100 text-amber-700' :
                                                            user.role === 'dean' ? 'bg-purple-100 text-purple-700' :
                                                            user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {user.role === 'super_admin' ? <ShieldCheck className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                                                        </div>
                                                        <span className="font-bold text-slate-900">{user.username}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-medium py-4">
                                                    {user.email}
                                                </TableCell>
                                                <TableCell className="text-slate-500 font-medium py-4">
                                                    {user.department || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-slate-500 font-medium py-4">
                                                    {user.faculty || 'N/A'}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge className={`px-2.5 py-1 font-medium capitalize border-none shadow-sm ${user.role === 'super_admin' ? 'bg-amber-500 text-white' :
                                                        user.role === 'dean' ? 'bg-purple-600 text-white' :
                                                        user.role === 'admin' ? 'bg-primary text-white' : 'bg-slate-400 text-white'
                                                        }`}>
                                                        {user.role.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge variant="outline" className={`px-2.5 py-1 font-medium capitalize ${user.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                        {user.status.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500 font-medium py-4">
                                                    {format(new Date(user.created_at), "MMMM d, yyyy")}
                                                </TableCell>
                                                <TableCell className="text-right py-4 space-x-2">
                                                    {user.status === 'pending_approval' && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 h-8 font-bold"
                                                            onClick={() => handleApproveUser(user)}
                                                            disabled={isApproving === user.id}
                                                        >
                                                            {isApproving === user.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                "Approve"
                                                            )}
                                                        </Button>
                                                    )}
                                                    {user.role !== 'super_admin' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                                onClick={() => setEditingUser(user)}
                                                                title="Edit Access"
                                                            >
                                                                <UserCog className="h-5 w-5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors"
                                                                onClick={() => handleResetPassword(user.id, user.email)}
                                                                title="Trigger Password Reset"
                                                                disabled={isResetting === user.id}
                                                            >
                                                                {isResetting === user.id ? (
                                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                                ) : (
                                                                    <Lock className="h-5 w-5" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                onClick={() => handleDeleteUser(user.id, user.email)}
                                                                title="Delete Account"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Edit User Dialog */}
                <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        {editingUser && (
                            <form onSubmit={handleUpdateUser}>
                                <DialogHeader>
                                    <DialogTitle>Edit User Access</DialogTitle>
                                    <DialogDescription>
                                        Update role and department for {editingUser.email}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-role">System Role</Label>
                                        <Select
                                            value={editingUser.role}
                                            onValueChange={(val) => setEditingUser({ ...editingUser, role: val as 'super_admin' | 'dean' | 'admin' | 'user' })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                                <SelectItem value="dean">Dean (Faculty-wide)</SelectItem>
                                                <SelectItem value="admin">Administrator (Manager)</SelectItem>
                                                <SelectItem value="user">HOD / Viewer (Departmental)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {editingUser.role === 'dean' ? (
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-faculty">Assigned Faculty</Label>
                                            <Select
                                                value={editingUser.faculty || ""}
                                                onValueChange={(val) => setEditingUser({ ...editingUser, faculty: val, department: "" })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Faculty" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {HTU_STRUCTURE.map(faculty => (
                                                        <SelectItem key={faculty.name} value={faculty.name}>{faculty.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-department">Assigned Department</Label>
                                            <Select
                                                value={editingUser.department || ""}
                                                onValueChange={(val) => setEditingUser({ ...editingUser, department: val, faculty: "" })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Department" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None / General</SelectItem>
                                                    {HTU_STRUCTURE.map(faculty => (
                                                        <SelectGroup key={faculty.name}>
                                                            <SelectLabel className="text-xs font-bold text-muted-foreground uppercase mt-2">{faculty.name}</SelectLabel>
                                                            {faculty.departments.map(dept => (
                                                                <SelectItem key={dept.name} value={dept.name}>{dept.name}</SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-muted-foreground italic">Important: This must exactly match the "Department" in the accreditations table.</p>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={isUpdating}>
                                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
};


export default UserManagement;
