'use client';

import { useEffect, useState } from 'react';

export default function CompanyHeader() {
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    // Get company name from user data
    const company = localStorage.getItem('userCompany');
    if (company && company !== 'null' && company !== '') {
      setCompanyName(company);
    }
  }, []);

  if (!companyName) {
    return null; // Don't show header if no company
  }

  return (
    <div className="company-header">
      <div className="company-name">{companyName}</div>
      <div className="company-tagline">מערכת ניהול מתקדמת</div>
    </div>
  );
}