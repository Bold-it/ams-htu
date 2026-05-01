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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    History,
    ChevronRight,
    ChevronDown,
    User,
    Clock,
    Activity,
    Info
} from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthContext";
import { Navigate } from "react-router-dom";
import { generateAuditLogExport } from "@/lib/ReportGenerator";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface AuditLog {
    id: number;
    user_email: string;
    action: string;
    method: string;
    path: string;
    details: string;
    ip_address: string;
    timestamp: string;
    status?: number;
}

const AuditTrail = () => {
    const { role } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [analytics, setAnalytics] = useState<{
        totalActionsToday: number;
        mostActiveAdmin: string;
        lastCriticalAction: AuditLog | null;
    } | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            const { data, error } = await api.getAuditLogs();
            if (data) {
                setLogs(data);
                setFilteredLogs(data);
            }
            setIsLoading(false);
        };

        const fetchAnalytics = async () => {
            setAnalyticsLoading(true);
            const { data } = await api.getAuditAnalytics();
            if (data) {
                setAnalytics(data);
            }
            setAnalyticsLoading(false);
        };

        fetchLogs();
        fetchAnalytics();
    }, []);

    useEffect(() => {
        const results = logs.filter(log =>
            log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.path?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredLogs(results);
    }, [searchTerm, logs]);

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const getFriendlyAction = (log: AuditLog) => {
        let details: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        try {
            details = JSON.parse(log.details) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        } catch (e) {
            details = {};
        }

        const body = (details.body || {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        const params = (details.params || {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        const query = (details.query || {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        const resourceName = (details.resourceName as string) || '';
        const user = log.user_email === 'anonymous' ? 'A guest or system process' : `The user (${log.user_email})`;
        const statusMsg = log.status && log.status >= 400 ? ' (failed)' : '';

        if (log.action === 'User Login') return `${user} successfully logged into the system.`;
        if (log.action === 'Excel Upload') return `${user} uploaded multiple programme records via Excel.`;
        
        if (log.action === 'Create Accreditation') {
            return `${user} registered a new programme: "${resourceName || (body.programme_name as string) || 'Unknown'}"${statusMsg}.`;
        }
        if (log.action === 'Update Accreditation') {
            return `${user} updated the record for "${resourceName || (body.programme_name as string) || 'a programme'}"${statusMsg}.`;
        }
        if (log.action === 'Delete Accreditation') {
            return `${user} permanently deleted the programme: "${resourceName || 'Unknown registration'}"${statusMsg}.`;
        }
        
        if (log.action === 'View Accreditations') return `${user} viewed the accreditation dashboard.`;
        if (log.action === 'Admin Reset Triggered') return `Administrators triggered a password reset for ${resourceName || 'a user'}${statusMsg}.`;
        
        if (log.action === 'Create User Account') {
            return `${user} created a new user account for "${resourceName || (body.username as string) || 'unknown'}"${statusMsg}.`;
        }
        if (log.action === 'Delete User Account') {
            return `${user} deleted the user account: "${resourceName || 'Unknown'}"${statusMsg}.`;
        }
        
        if (log.action === 'Upload Document') {
            return `${user} uploaded a ${resourceName || (body.document_type as string) || 'document'} to the vault${statusMsg}.`;
        }
        if (log.action === 'View Documents') return `${user} checked the document vault for a programme.`;
        if (log.action === 'Delete Document') {
            return `${user} removed the file "${resourceName || 'Unknown'}" from the system${statusMsg}.`;
        }

        // Checkpoints
        if (log.path.includes('/checkpoints') && log.method === 'PUT') {
            const status = (body.isCompleted as boolean) ? 'marked a task as completed' : 'reopened a task';
            return `${user} ${status} for "${resourceName || 'a programme'}"${statusMsg}.`;
        }

        return `${user} performed action: ${log.action}${statusMsg}.`;
    };

    if (role !== 'super_admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header />

            <main className="flex-1 container py-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <History className="h-8 w-8 text-primary" />
                            System Audit Trail
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Comprehensive log of every action performed in the system.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search logs..."
                                className="pl-10 h-10 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="default"
                            className="w-full md:w-auto gap-2 bg-slate-800 hover:bg-slate-900 shadow-md"
                            onClick={() => generateAuditLogExport(filteredLogs)}
                        >
                            <FileDown className="h-4 w-4" />
                            <span>Export History</span>
                        </Button>
                    </div>
                </div>

                {/* System Pulse Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-none shadow-lg bg-white overflow-hidden group">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-500">Total Actions Today</CardTitle>
                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                <Activity className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {analyticsLoading ? (
                                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded"></div>
                            ) : (
                                <div className="text-2xl font-bold text-slate-900">{analytics?.totalActionsToday}</div>
                            )}
                            <p className="text-xs text-slate-400 mt-1 italic">Real-time system activity</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-white overflow-hidden group">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-500">Most Active Admin</CardTitle>
                            <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                                <User className="h-4 w-4 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {analyticsLoading ? (
                                <div className="h-8 w-32 bg-slate-100 animate-pulse rounded"></div>
                            ) : (
                                <div className="text-xl font-semibold text-slate-900 truncate">
                                    {analytics?.mostActiveAdmin !== 'N/A' ? analytics?.mostActiveAdmin : 'None yet today'}
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-1 italic">Top system contributor today</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-white overflow-hidden group">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium text-slate-500">Last Critical Action</CardTitle>
                            <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                                <Activity className="h-4 w-4 text-red-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {analyticsLoading ? (
                                <div className="h-8 w-24 bg-slate-100 animate-pulse rounded"></div>
                            ) : (
                                <div className="flex flex-col">
                                    <div className="text-sm font-semibold text-red-600 uppercase tracking-tight">
                                        {analytics?.lastCriticalAction?.action || 'No deletions detected'}
                                    </div>
                                    <span className="text-[10px] text-slate-400 truncate">
                                        {analytics?.lastCriticalAction?.user_email || ''}
                                    </span>
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-1 italic">Most recent security event</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-none shadow-xl overflow-hidden">
                    <CardHeader className="bg-white border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    Activity Logs
                                </CardTitle>
                                <CardDescription>Showing recent system events</CardDescription>
                            </div>
                            <Badge variant="outline" className="font-mono bg-slate-50">
                                {filteredLogs.length} Records
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="w-[30px]"></TableHead>
                                        <TableHead className="font-semibold">Human-Readable Activity Log</TableHead>
                                        <TableHead className="font-semibold text-right">Date & Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse">
                                                <TableCell colSpan={5} className="h-16 bg-slate-50/20"></TableCell>
                                            </TableRow>
                                        ))
                                    ) : filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">
                                                No audit logs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.map((log) => (
                                            <>
                                                <TableRow
                                                    key={log.id}
                                                    className="group hover:bg-slate-50 cursor-pointer transition-colors"
                                                    onClick={() => toggleRow(log.id)}
                                                >
                                                    <TableCell className="text-slate-400">
                                                        {expandedRows.has(log.id) ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1 py-1">
                                                            <span className={`text-sm font-medium leading-relaxed ${log.status && log.status >= 400 ? 'text-red-600' : 'text-slate-700'}`}>
                                                                {getFriendlyAction(log)}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className={`text-[10px] py-0 px-1 font-normal ${log.status && log.status >= 400 ? 'text-red-400 border-red-200 bg-red-50' : 'text-slate-400'}`}>
                                                                    {log.ip_address} {log.status && `• HTTP ${log.status}`}
                                                                </Badge>
                                                                {log.action.includes('Delete') && (
                                                                    <Badge variant="destructive" className="text-[10px] py-0 px-1">Critical Action</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-medium text-slate-700">
                                                                {format(new Date(log.timestamp), "MMM d, yyyy")}
                                                            </span>
                                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {format(new Date(log.timestamp), "HH:mm:ss")}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedRows.has(log.id) && (
                                                    <TableRow className="bg-slate-50/80 border-l-4 border-l-primary">
                                                        <TableCell colSpan={5} className="p-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <div className="space-y-3">
                                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                                                        <Info className="h-3 w-3" />
                                                                        Request Details
                                                                    </h4>
                                                                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                                                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                                                            <span className="text-slate-500">IP Address:</span>
                                                                            <span className="col-span-2 font-mono text-slate-700">{log.ip_address}</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                                                            <span className="text-slate-500">Path:</span>
                                                                            <span className="col-span-2 font-mono text-slate-700">{log.path}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                    <div className="space-y-3">
                                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Details</h4>
                                                                        <pre className="bg-slate-900 text-slate-50 text-[10px] p-4 rounded-lg overflow-x-auto max-h-64 shadow-inner">
                                                                            {(() => {
                                                                                try {
                                                                                    return JSON.stringify(JSON.parse(log.details), null, 2);
                                                                                } catch (e) {
                                                                                    return log.details;
                                                                                }
                                                                            })()}
                                                                        </pre>
                                                                    </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default AuditTrail;
