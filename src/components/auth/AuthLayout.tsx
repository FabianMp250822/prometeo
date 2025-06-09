import React from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image 
            src="https://firebasestorage.googleapis.com/v0/b/pensionados-d82b2.appspot.com/o/logos%2Fcolor.svg?alt=media&token=6cfc0b4c-3601-4ba7-a7ff-03143c64d6d9"
            alt="Prometeo Logo"
            width={180}
            height={50}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-3xl font-headline font-semibold text-primary">{title}</h1>
          <p className="text-muted-foreground mt-2">Bienvenido a la plataforma Prometeo.</p>
        </div>
        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-xl">
          {children}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          &copy; {new Date().getFullYear()} Prometeo. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
