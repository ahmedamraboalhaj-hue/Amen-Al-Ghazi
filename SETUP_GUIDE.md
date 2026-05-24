# 🚀 دليل تشغيل Bunny.net Webhook على Firebase

## المعلومات المستخدمة من مشروعك
- **Project ID**: `yghjni`
- **Library ID**: `666877`
- **CDN Hostname**: `vz-4688f24d-ab7.b-cdn.net`
- **API Key (Read-Only)**: `0ff30ea5-0c34-4693-95f638a12c04-8246-4910`

---

## 📁 هيكل الملفات

```
bunny-webhook/
├── firebase.json
├── .firebaserc
└── functions/
    ├── index.js        ← الـ Webhook الرئيسي
    └── package.json
```

---

## 🛠️ خطوات التشغيل (مرة واحدة بس)

### الخطوة 1 — تثبيت Firebase CLI
```bash
npm install -g firebase-tools
```

### الخطوة 2 — تسجيل الدخول
```bash
firebase login
```

### الخطوة 3 — الدخول لمجلد المشروع
```bash
cd bunny-webhook/functions
npm install
cd ..
```

### الخطوة 4 — (اختياري) ضبط المفتاح السري للتأمين
```bash
firebase functions:secrets:set BUNNY_WEBHOOK_SECRET
# هيسألك تكتب قيمة — اكتب أي كلمة سر قوية مثلاً:
# mySecret_Alamin_2025!
# احتفظ بهذه القيمة — هتحتاجها في Bunny Dashboard
```

### الخطوة 5 — رفع الـ Function
```bash
firebase deploy --only functions
```

---

## 🌐 الـ URL النهائي

بعد الـ Deploy، الرابط بيبقى:

```
https://us-central1-yghjni.cloudfunctions.net/bunnyWebhook
```

> ✅ هذا هو الرابط اللي هتحطه في Bunny.net Dashboard

---

## ⚙️ إضافة الـ Webhook في Bunny.net

1. افتح **Bunny Dashboard** → **Stream**
2. اختر المكتبة **666877**
3. اذهب إلى **Settings** → **Webhooks**
4. اضغط **Add Webhook**
5. الصق الرابط:
   ```
   https://us-central1-yghjni.cloudfunctions.net/bunnyWebhook
   ```
6. لو ضبطت مفتاح سري في الخطوة 4، ضعه في خانة **Webhook Secret**
7. اضغط **Save**

---

## 🔥 ما بيحصل في Firestore

الـ Webhook بيحدّث collection اسمه `videos` في Firestore.

### البحث عن الـ Document
- لو `doc ID = videoId` → يحدّثه مباشرة
- لو مش موجود → يعمل document جديد

### الحقول اللي بتتحدث تلقائياً

| الحقل | الوصف |
|-------|-------|
| `status` | الحالة بالإنجليزي (`Ready`, `Encoding`...) |
| `statusAr` | الحالة بالعربي (`جاهز`, `جاري الترميز`...) |
| `statusCode` | الرقم من Bunny (0-6) |
| `isReady` | `true` لو الفيديو جاهز للمشاهدة |
| `playUrl` | رابط iframe لتشغيل الفيديو مباشرة |
| `thumbnailUrl` | رابط الصورة المصغّرة |
| `updatedAt` | وقت آخر تحديث |
| `readyAt` | وقت اكتمال الترميز (لو Status = 3) |

---

## 📊 خريطة حالات Bunny.net

| Status | معنى |
|--------|------|
| 0 | قيد الرفع |
| 1 | جاري المعالجة |
| 2 | جاري الترميز |
| **3** | **✅ جاهز (الأهم)** |
| 4 | خطأ في الترميز |
| 5 | محذوف |
| 6 | تم الرفع |

---

## 🧪 اختبار الـ Webhook يدوياً

```bash
curl -X POST https://us-central1-yghjni.cloudfunctions.net/bunnyWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "VideoId": "test-video-123",
    "Status": 3,
    "LibraryId": "666877",
    "Title": "درس تجريبي"
  }'
```

المفروض ترد بـ:
```json
{ "success": true, "videoId": "test-video-123", "status": "Ready" }
```

---

## 👁️ مشاهدة الـ Logs

```bash
firebase functions:log
```

---

## ⚠️ ملاحظات مهمة

1. **Firestore Rules**: تأكد إن Firebase Admin له صلاحية الكتابة على collection `videos`
2. **Billing**: Cloud Functions تتطلب Blaze Plan (Pay as you go) — مجاني لحد 2 مليون طلب في الشهر
3. **الـ collection name**: لو بتستخدم اسم تاني غير `videos`، غيّره في `index.js` السطر ده:
   ```js
   const videoRef = db.collection("videos").doc(videoId);
   //                              ↑ غيّره للاسم اللي عندك
   ```

---

## 🔗 ربط الفيديو بالدروس في مشروعك

في `dashboard.html` لما بتضيف درس، خزّن الـ `bunnyVideoId` في Firestore.
الـ Webhook هيحدّث نفس الـ document تلقائياً لما الفيديو يخلص ترميز.

```js
// مثال: بعد رفع فيديو على Bunny
await db.collection("videos").doc(bunnyVideoId).set({
  bunnyVideoId: bunnyVideoId,
  courseId: courseId,
  lessonTitle: lessonTitle,
  status: "Queued",
  isReady: false,
  createdAt: new Date().toISOString()
});
// بعدين الـ Webhook هيحدّث isReady و playUrl تلقائياً ✅
```
