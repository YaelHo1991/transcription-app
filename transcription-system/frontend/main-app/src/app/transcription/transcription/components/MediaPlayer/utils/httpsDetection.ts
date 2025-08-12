/**
 * HTTPS Detection and Handling Utilities
 */

export const isSecureContext = () => {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext;
};

export const isLocalhost = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

export const shouldRedirectToHTTPS = () => {
  if (typeof window === 'undefined') return false;
  
  const isProduction = process.env.NODE_ENV === 'production';
  const isHTTP = window.location.protocol === 'http:';
  const notLocalhost = !isLocalhost();
  
  return isProduction && isHTTP && notLocalhost;
};

export const redirectToHTTPS = () => {
  if (shouldRedirectToHTTPS()) {
    window.location.protocol = 'https:';
  }
};

export const getSecureURL = () => {
  if (typeof window === 'undefined') return '';
  
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'yalitranscription.duckdns.org';
  return `https://${domain}${window.location.pathname}${window.location.search}`;
};

export const canUsePedal = () => {
  // WebHID API requires secure context
  return isSecureContext() && 'hid' in navigator;
};

export const getPedalStatusMessage = () => {
  if (!('hid' in navigator)) {
    return {
      type: 'error' as const,
      title: 'הדפדפן אינו תומך בחיבור דוושה',
      message: 'נדרש דפדפן Chrome, Edge או Opera עדכני'
    };
  }
  
  if (!isSecureContext()) {
    return {
      type: 'warning' as const,
      title: 'דרוש חיבור מאובטח (HTTPS) לחיבור דוושה',
      message: `אנא גש לכתובת: ${getSecureURL()}`
    };
  }
  
  return {
    type: 'success' as const,
    title: 'מוכן לחיבור דוושה',
    message: 'לחץ על "התחבר לדוושה" להתחיל'
  };
};