'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? styles.active : '';
  };

  // Use environment variables or fallback to production URLs
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  return (
    <nav className={styles.navigationBar}>
      <div className={styles.navContainer}>
        <Link href="/dev-portal" className={styles.homeLink}>
          <span className={styles.icon}>🏠</span>
          <span>דף הבית</span>
        </Link>
        <div className={styles.navLinks}>
          <a 
            href={apiBaseUrl + '/dev'}
            className={styles.navLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔧 לוח פיתוח
          </a>
          <Link href="/licenses" className={styles.navLink + ' ${isActive(\'/licenses\')}'}>
            📋 מכירת רישיונות
          </Link>
          <Link href="/crm" className={styles.navLink + ' ${isActive(\'/crm\')}'}>
            👥 CRM
          </Link>
          <Link href="/transcription" className={styles.navLink + ' ${isActive(\'/transcription\')}'}>
            🎯 תמלול
          </Link>
          <a 
            href={apiBaseUrl + '/api/health'}
            className={styles.navLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            🖥️ שרת
          </a>
        </div>
      </div>
    </nav>
  );
}