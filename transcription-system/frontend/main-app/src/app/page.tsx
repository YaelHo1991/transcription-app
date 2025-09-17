'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import PreviewCarousel from '@/components/PreviewCarousel'
import styles from './page.module.css'

export default function HomePage() {
  const { isAuthenticated, user, logout } = useAuth()
  const [syncIndex, setSyncIndex] = useState(0)

  // Global timer for all carousels
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncIndex((prev) => prev + 1)
    }, 6000) // Change all slides every 6 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.backgroundAnimation}></div>

      {/* Navigation Bar */}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <div className={styles.navLinks}>
            <Link href="/licenses" className={styles.navLink}>
              רישיונות
            </Link>
            <Link href="/crm" className={styles.navLink}>
              CRM
            </Link>
            <Link href="/transcription" className={styles.navLink}>
              תמלול
            </Link>
          </div>

          <div className={styles.navAuth}>
            {isAuthenticated ? (
              <>
                <div className={styles.userInfo}>
                  <span className={styles.username}>{user?.username}</span>
                  <span className={styles.permissions}>הרשאות: {user?.permissions}</span>
                </div>
                <button onClick={logout} className={styles.navLogoutBtn}>
                  התנתק
                </button>
              </>
            ) : (
              <Link href="/login" className={styles.navLoginBtn}>
                התחבר למערכת
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className={styles.mainContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>מערכת תמלול מקצועית</h1>
          </div>
        </div>

        <p className={styles.subtitle}>
          בחרו את המערכת הרצויה
        </p>

        {/* Main Navigation Cards */}
        <div className={styles.navGrid}>
          {/* License Sales Card */}
          <Link href="/licenses" className={`${styles.navCard} ${styles.licenseTheme}`}>
            <h2>מערכת רישיונות</h2>
            <p>רכישה וניהול רישיונות למערכות השונות</p>
          </Link>

          {/* CRM Card */}
          <Link href="/crm" className={`${styles.navCard} ${styles.crmTheme}`}>
            <h2>מערכת CRM</h2>
            <p>ניהול לקוחות, עבודות ומתמללים</p>
          </Link>

          {/* Transcription Card */}
          <Link href="/transcription" className={`${styles.navCard} ${styles.transcriptionTheme}`}>
            <h2>אפליקציית תמלול</h2>
            <p>תמלול, עריכה, הגהה וייצוא</p>
          </Link>
        </div>

        {/* Preview Windows Section */}
        <div className={styles.previewContainer}>
          {/* License Sales Preview */}
          <PreviewCarousel
            system="licenses"
            title="🔑 מערכת רישיונות - תצוגה מקדימה"
            syncIndex={syncIndex}
            mockContent={
              <div className={styles.mockLicensePage}>
                <div className={styles.mockHeader}>
                  <span className={styles.clientBadge}>CLIENT</span>
                  <h3>מערכת מכירת רישיונות</h3>
                </div>
                <div className={styles.mockStats}>
                  <div className={`${styles.mockStat} ${styles.license}`}>
                    <div className={styles.statNum}>5</div>
                    <div className={styles.statLabel}>מנהלי מערכת</div>
                  </div>
                  <div className={`${styles.mockStat} ${styles.license}`}>
                    <div className={styles.statNum}>12</div>
                    <div className={styles.statLabel}>מנהלי CRM</div>
                  </div>
                  <div className={`${styles.mockStat} ${styles.license}`}>
                    <div className={styles.statNum}>8</div>
                    <div className={styles.statLabel}>מתמללים</div>
                  </div>
                </div>
                <div className={styles.mockForm}>
                  <h4>רכישת רישיון חדש</h4>
                  <div className={styles.mockInput}>שם מלא</div>
                  <div className={styles.mockInput}>כתובת אימייל</div>
                  <div className={styles.mockInput}>בחר הרשאות</div>
                  <div className={styles.mockButton}>רכישת רישיון</div>
                </div>
              </div>
            }
          />

          {/* CRM Preview */}
          <PreviewCarousel
            system="crm"
            title="👥 מערכת CRM - תצוגה מקדימה"
            syncIndex={syncIndex}
            pages={[
              { name: 'dashboard', hebrewName: 'לוח בקרה' },
              { name: 'clients', hebrewName: 'לקוחות' },
              { name: 'projects', hebrewName: 'פרויקטים' },
              { name: 'employee', hebrewName: 'עובדים' },
              { name: 'reports', hebrewName: 'דוחות' }
            ]}
            mockContent={
              <div className={styles.mockCrmDashboard}>
                <div className={styles.mockHeader}>
                  <h3>🏢 לוח בקרה CRM</h3>
                  <div className={styles.mockUser}>משתמש פעיל</div>
                </div>
                <div className={styles.mockStats}>
                  <div className={`${styles.mockStat} ${styles.crm}`}>
                    <div className={styles.statNum}>24</div>
                    <div className={styles.statLabel}>לקוחות פעילים</div>
                  </div>
                  <div className={`${styles.mockStat} ${styles.crm}`}>
                    <div className={styles.statNum}>8</div>
                    <div className={styles.statLabel}>פרויקטים</div>
                  </div>
                  <div className={`${styles.mockStat} ${styles.crm}`}>
                    <div className={styles.statNum}>12</div>
                    <div className={styles.statLabel}>מתמללים</div>
                  </div>
                  <div className={`${styles.mockStat} ${styles.crm}`}>
                    <div className={styles.statNum}>₪45K</div>
                    <div className={styles.statLabel}>הכנסות החודש</div>
                  </div>
                </div>
                <div className={styles.mockQuickActions}>
                  <div className={styles.actionBtn}>➕ פרויקט חדש</div>
                  <div className={styles.actionBtn}>👥 לקוח חדש</div>
                  <div className={styles.actionBtn}>📊 דוח חודשי</div>
                </div>
              </div>
            }
          />

          {/* Transcription Preview */}
          <PreviewCarousel
            system="transcription"
            title="📝 תמלול - תצוגה מקדימה"
            syncIndex={syncIndex}
            pages={[
              { name: 'dashboard', hebrewName: 'לוח בקרה' },
              { name: 'transcription', hebrewName: 'תמלול' },
              { name: 'proofreading', hebrewName: 'הגהה' },
              { name: 'export', hebrewName: 'ייצוא' },
              { name: 'reports', hebrewName: 'דוחות' }
            ]}
            mockContent={
              <div className={styles.mockTranscription}>
                <div className={styles.mockHeader}>
                  <h3>🎯 מערכת תמלול</h3>
                  <div className={styles.mockUser}>מתמלל פעיל</div>
                </div>
                <div className={styles.mockStats}>
                  <div className={`${styles.mockStat} ${styles.transcription}`}>
                    <div className={styles.statNum}>8</div>
                    <div className={styles.statLabel}>עבודות תמלול</div>
                  </div>
                  <div className={`${styles.mockStat} ${styles.transcription}`}>
                    <div className={styles.statNum}>5</div>
                    <div className={styles.statLabel}>עבודות הגהה</div>
                  </div>
                  <div className={`${styles.mockStat} ${styles.transcription}`}>
                    <div className={styles.statNum}>3</div>
                    <div className={styles.statLabel}>עבודות ייצוא</div>
                  </div>
                </div>
                <div className={styles.workSection}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>📝</span>
                    <span className={styles.sectionTitle}>תמלול פעיל</span>
                    <span className={styles.sectionCount}>8 עבודות</span>
                  </div>
                  <div className={styles.projectItem}>
                    <div className={styles.projectTitle}>תמלול פגישת דירקטוריון</div>
                    <div className={styles.projectMeta}>
                      <span>🎵 3 קבצי מדיה</span>
                      <span>⏱️ 02:15:30</span>
                    </div>
                  </div>
                </div>
              </div>
            }
          />
        </div>

        {/* Footer Info */}
        <div className={styles.footerInfo}>
          <p>מערכת תמלול מקצועית © 2025 - כל הזכויות שמורות</p>
        </div>
      </div>
    </div>
  )
}