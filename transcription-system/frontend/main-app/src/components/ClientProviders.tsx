'use client';

import { AuthProvider } from "@/context/AuthContext";
import AuthInterceptorProvider from "@/components/AuthProvider/AuthProvider";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthInterceptorProvider>
        {children}
      </AuthInterceptorProvider>
    </AuthProvider>
  );
}