import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'super_admin' | 'admin' | 'user' | null;

interface AuthContextType {
    role: Role;
    userEmail: string | null;
    isAuthenticated: boolean;
    login: (role: 'super_admin' | 'admin' | 'user', email: string, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<Role>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const savedRole = localStorage.getItem('auth_role') as Role;
        const savedEmail = localStorage.getItem('auth_email');
        const savedToken = localStorage.getItem('auth_token');
        if (savedRole && savedToken) {
            setRole(savedRole);
            setUserEmail(savedEmail);
            setIsAuthenticated(true);
        }
    }, []);

    const login = (newRole: 'super_admin' | 'admin' | 'user', email: string, token: string) => {
        localStorage.setItem('auth_role', newRole);
        localStorage.setItem('auth_email', email);
        localStorage.setItem('auth_token', token);
        setRole(newRole);
        setUserEmail(email);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('auth_role');
        localStorage.removeItem('auth_email');
        localStorage.removeItem('auth_token');
        setRole(null);
        setUserEmail(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ role, userEmail, isAuthenticated, login, logout }}>
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
