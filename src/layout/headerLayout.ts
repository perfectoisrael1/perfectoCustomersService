/**
 * משתנה גלובלי שמוגדר בזמן ריצה מ־AppLayout (גובה AppBar בפיקסלים).
 * נדרש כדי למנוע פער גדול בין ההדר לניווט הפנימי כשהגובה אינו תואם לאומדן קשיח.
 */
export const CSS_VAR_APP_BAR_HEIGHT_PX = '--perfecto-app-bar-height-px'

/** מרווח בין תחתית ההדר לבין תחילת תוכן ה-main / קו ניווט פנימי דביק (0 = צמוד להדר) */
export const GAP_UNDER_APP_BAR_PX = 0

/** מרווח בין תחתית הניווט הפנימי לבין ראש הטבלה (או בלוק התוכן הבא) */
export const GAP_BELOW_INNER_NAV_PX = 5

/** ערך ברירת מחדל למשתנה ה-CSS לפני המדידה הראשונה */
export const APP_BAR_HEIGHT_FALLBACK_CSS = '38px'

/** מרחק מעליון המסך לתחילת אזור <main> (גובה ההדר). משמש ל־`top` ב־main קבוע (כמו יקירוס) */
export const MAIN_PADDING_TOP_CSS = `calc(var(${CSS_VAR_APP_BAR_HEIGHT_PX}, ${APP_BAR_HEIGHT_FALLBACK_CSS}) + ${GAP_UNDER_APP_BAR_PX}px)`

/** ערך `top` ל־`position: sticky` של הניווט הפנימי (גלילת חלון — legacy) */
export const STICKY_INNER_NAV_TOP_CSS = MAIN_PADDING_TOP_CSS

/** כש־`<main>` הוא מיכל הגלילה (`position: fixed` כמו ביקירוס) — הדבקה לראש אזור התוכן */
export const STICKY_INNER_NAV_TOP_IN_MAIN_SCROLL_CSS = 0

/**
 * גובה מינימלי לכרטיס עמוד (פנימי) כדי שעמודת flex במילוי main תגרום לפוטר פגינציה
 * לישב מתחת לטבלה המגלילה, צמוד לתחתית החלון — כמו `PaginationBar` ביקירוס.
 */
export const CS_PAGE_FILL_MIN_HEIGHT_CSS = `calc(100dvh - var(${CSS_VAR_APP_BAR_HEIGHT_PX}, ${APP_BAR_HEIGHT_FALLBACK_CSS}) - 24px)`
