'use client';

import styles from './dev-portal.module.css';
import { getApiUrl } from '@/utils/api';

export default function DevPortal() {
  return (
    <div className={styles.container}>
      <div className={styles.backgroundAnimation}></div>
      
      <div className={styles.mainContainer}>
        <div className={styles.header}>
          <h1>🎯 מערכת תמלול - Client Interface</h1>
        </div>
        
        <p className={styles.welcomeText}>
          Welcome to the new client-side interface of the transcription system.
        </p>
        
        {/* Top Navigation - Dev Tools and Server */}
        <div className={styles.topNavGrid}>
          <a href={`${getApiUrl()}/dev`} className={styles.navLink} target="_blank">
            ⚙️ כלי פיתוח
          </a>
          <a href={getApiUrl()} className={styles.navLink} target="_blank">
            🖥️ Server (Backend)
          </a>
        </div>
        
        {/* Main Navigation - Three Systems */}
        <div className={styles.navGrid}>
          <a href="/licenses" className={`${styles.navLink} ${styles.licenseTheme}`}>
            📋 מכירת רישיונות
          </a>
          <a href="/crm" className={`${styles.navLink} ${styles.crmTheme}`}>
            👥 CRM
          </a>
          <a href="/transcription" className={`${styles.navLink} ${styles.transcriptionTheme}`}>
            🎯 תמלול
          </a>
        </div>
        
        {/* Preview Windows Section */}
        <div className={styles.previewContainer}>
          {/* License Sales Preview */}
          <div className={styles.previewWindow} data-service="licenses">
            <div className={styles.previewHeader}>
              <h4>📋 מכירת רישיונות - תצוגה מקדימה</h4>
              <div className={styles.previewIndicators}>
                <span className={`${styles.indicator} ${styles.active}`}></span>
                <span className={styles.indicator}></span>
                <span className={styles.indicator}></span>
              </div>
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewSlide}>
                <div className={styles.mockLicensePage}>
                  <div className={styles.mockHeader}>
                    <span className={styles.clientBadge}>CLIENT</span>
                    <h3>מערכת מכירת רישיונות תמלול</h3>
                  </div>
                  <div className={styles.mockStats}>
                    <div className={styles.mockStat}>
                      <div className={styles.statNum}>5</div>
                      <div className={styles.statLabel}>מנהלי מערכת</div>
                    </div>
                    <div className={styles.mockStat}>
                      <div className={styles.statNum}>12</div>
                      <div className={styles.statLabel}>מנהלי CRM</div>
                    </div>
                    <div className={styles.mockStat}>
                      <div className={styles.statNum}>8</div>
                      <div className={styles.statLabel}>מתמללים</div>
                    </div>
                  </div>
                  <div className={styles.mockForm}>
                    <h4>רכישת רישיונות</h4>
                    <div className={styles.mockInput}>שם מלא</div>
                    <div className={styles.mockInput}>אימייל</div>
                    <div className={styles.mockPermissions}>
                      <div className={styles.permissionBlock}>
                        <div className={styles.permTitle}>מערכת CRM</div>
                        <div className={styles.permOptions}>
                          <div className={styles.permOption}>A - ניהול לקוחות</div>
                          <div className={styles.permOption}>B - ניהול עבודות</div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.mockButton}>רכישת רישיון</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CRM Preview */}
          <div className={styles.previewWindow} data-service="crm">
            <div className={styles.previewHeader}>
              <h4>👥 CRM - תצוגה מקדימה</h4>
              <div className={styles.previewIndicators}>
                <span className={`${styles.indicator} ${styles.active}`}></span>
                <span className={styles.indicator}></span>
                <span className={styles.indicator}></span>
                <span className={styles.indicator}></span>
              </div>
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewSlide}>
                <div className={styles.mockCrmDashboard}>
                  <div className={styles.mockHeader}>
                    <h3>🏢 מערכת CRM למתמלל - דף הבית</h3>
                    <div className={styles.mockUser}>שלום משתמש</div>
                  </div>
                  <div className={styles.mockStats}>
                    <div className={`${styles.mockStat} ${styles.red}`}>
                      <div className={styles.statNum}>24</div>
                      <div className={styles.statLabel}>לקוחות פעילים</div>
                    </div>
                    <div className={`${styles.mockStat} ${styles.brown}`}>
                      <div className={styles.statNum}>8</div>
                      <div className={styles.statLabel}>פרויקטים בעבודה</div>
                    </div>
                    <div className={`${styles.mockStat} ${styles.green}`}>
                      <div className={styles.statNum}>12</div>
                      <div className={styles.statLabel}>מתמללים זמינים</div>
                    </div>
                    <div className={`${styles.mockStat} ${styles.blue}`}>
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
              </div>
            </div>
          </div>

          {/* Transcription Preview */}
          <div className={styles.previewWindow} data-service="transcription">
            <div className={styles.previewHeader}>
              <h4>🎯 תמלול - תצוגה מקדימה</h4>
              <div className={styles.previewIndicators}>
                <span className={`${styles.indicator} ${styles.active}`}></span>
                <span className={styles.indicator}></span>
                <span className={styles.indicator}></span>
              </div>
            </div>
            <div className={styles.previewContent}>
              <div className={styles.previewSlide}>
                <div className={styles.mockTranscription}>
                  <div className={styles.mockHeader}>
                    <h3>🎯 מערכת תמלול - דף הבית</h3>
                    <div className={styles.mockUser}>מתמלל פעיל</div>
                  </div>
                  <div className={styles.mockStats}>
                    <div className={`${styles.mockStat} ${styles.transcriptionStat}`}>
                      <div className={styles.statNum}>8</div>
                      <div className={styles.statLabel}>עבודות תמלול</div>
                    </div>
                    <div className={`${styles.mockStat} ${styles.transcriptionStat}`}>
                      <div className={styles.statNum}>5</div>
                      <div className={styles.statLabel}>עבודות הגהה</div>
                    </div>
                    <div className={`${styles.mockStat} ${styles.transcriptionStat}`}>
                      <div className={styles.statNum}>3</div>
                      <div className={styles.statLabel}>עבודות ייצוא</div>
                    </div>
                  </div>
                  <div className={styles.workSections}>
                    <div className={styles.workSectionPreview}>
                      <div className={styles.sectionHeaderPreview}>
                        <span className={styles.sectionIconPreview}>📝</span>
                        <span className={styles.sectionTitlePreview}>תמלול</span>
                        <span className={styles.sectionCountPreview}>8 עבודות</span>
                      </div>
                      <div className={styles.projectPreviewItem}>
                        <div className={styles.projectPreviewTitle}>תמלול פגישת דירקטוריון</div>
                        <div className={styles.projectPreviewMeta}>
                          <span>🎵 3 מדיה</span>
                          <span>⏱️ 02:15:30</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Info */}
        <div className={styles.footerInfo}>
          <p>מערכת תמלול מקצועית - גרסת פיתוח</p>
          <p>פורט Frontend: 3004 | פורט Backend: 5000</p>
          <p className={styles.highlight}>כל הזכויות שמורות © 2025</p>
        </div>
      </div>
    </div>
  );
}