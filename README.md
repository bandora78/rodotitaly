# Italy Trip Guide 2026 – Google Drive Sync

האתר סטטי ומתאים ל-GitHub Pages. הנתונים נשמרים מקומית וגם מסתנכרנים לקובץ
`italy-trip-data.json` בתוך תיקיית Google Drive App Data הפרטית של האפליקציה.

## הגדרת Google Cloud

1. היכנס ל-Google Cloud Console וצור Project.
2. הפעל את Google Drive API.
3. הגדר OAuth consent screen.
4. צור OAuth Client מסוג Web application.
5. ב-Authorized JavaScript origins הוסף:
   - את כתובת GitHub Pages שלך, לדוגמה `https://USERNAME.github.io`
   - לבדיקה מקומית: `http://localhost:5500`
6. העתק את Client ID בלבד.
7. פתח את `config.js` והחלף את הערך:
   `PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com`
8. העלה את כל הקבצים ל-GitHub Pages.

אין להשתמש או להעלות Client Secret.

## שימוש

- לחץ על “התחברות ל-Google”.
- אשר גישה לנתוני האפליקציה ב-Drive.
- בפעם הראשונה נוצר קובץ JSON פרטי.
- שינויים נשמרים אוטומטית לאחר זמן קצר.
- אפשר גם ללחוץ “סנכרן עכשיו”.

## מגבלה חשובה

`appDataFolder` שייך לחשבון Google מסוים ואינו ניתן לשיתוף. כדי לראות אותם נתונים
בכל מכשירי המשפחה, יש להתחבר מאותו חשבון Google.


## שמירת החיבור לאחר רענון

ההרשאה נשמרת ב-sessionStorage עד לפקיעתה. רענון באותה לשונית לא אמור לדרוש התחברות מחדש. לאחר סגירת כל חלונות הדפדפן או פקיעת ההרשאה תידרש לחיצה נוספת.

## גרסה v8 — כל יום כמסלול עצמאי

כל יום כולל כעת:
- סקירה מהירה ותגיות
- דירוג עדיפות, פוטוגניות והתאמה למשפחה
- "מה אסור לפספס"
- ציר זמן מלא
- פתיחת פרטים לכל תחנה
- מסלולי הליכה, חניה וטיפים
- הכנות ליום, הזמנות וחלופות
- קובץ config.js אינו כלול ב-ZIP
