'use client';

export default function HebrewTemplateDesignerTest() {
  return (
    <div style={{ padding: '40px', direction: 'rtl' }}>
      <h1>בדיקת דף פשוט</h1>
      <p>אם אתה רואה את זה, הדף עובד!</p>
      <button onClick={() => alert('Button works!')}>
        לחץ לבדיקה
      </button>
    </div>
  );
}