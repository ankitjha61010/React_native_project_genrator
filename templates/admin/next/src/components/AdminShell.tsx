'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';

/**
 * Renders the Sidebar once, in the root layout, so it stays mounted while you move between
 * pages – a Sidebar inside every page was torn down and rebuilt on each click.
 */
export const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const showSidebar = pathname !== '/login' && user?.role === 'ADMIN';

  return (
    <>
      {showSidebar && <Sidebar />}
      {children}
    </>
  );
};
