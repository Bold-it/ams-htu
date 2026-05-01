import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'super_admin' | 'dean' | 'admin' | 'user' | null;

interface AuthContextType {
    role: Role;
    userEmail: string | null;
    faculty: string | null;
    isAuthenticated: boolean;
    login: (role: 'super_admin' | 'dean' | 'admin' | 'user', email: string, token: string, department?: string, faculty?: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<Role>(() => localStorage.getItem('auth_role') as Role);
    const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('auth_email'));
    const [department, setDepartment] = useState<string | null>(() => localStorage.getItem('auth_department'));
    const [faculty, setFaculty] = useState<string | null>(() => localStorage.getItem('auth_faculty'));
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('auth_token'));

    // No longer need useEffect for initial load as we use lazy initializers above

    const login = (newRole: 'super_admin' | 'dean' | 'admin' | 'user', email: string, token: string, dept?: string, fac?: string) => {
        localStorage.setItem('auth_role', newRole);
        localStorage.setItem('auth_email', email);
        localStorage.setItem('auth_token', token);
        if (dept) localStorage.setItem('auth_department', dept);
        if (fac) localStorage.setItem('auth_faculty', fac);
        
        setRole(newRole);
        setUserEmail(email);
        setDepartment(dept || null);
        setFaculty(fac || null);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('auth_role');
        localStorage.removeItem('auth_email');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_department');
        localStorage.removeItem('auth_faculty');
        setRole(null);
        setUserEmail(null);
        setDepartment(null);
        setFaculty(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ role, userEmail, department, faculty, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
