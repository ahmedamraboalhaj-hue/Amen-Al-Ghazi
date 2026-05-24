// ============================================================
//  Bunny.net Webhook  →  Firebase Cloud Function
//  مشروع: yghjni  |  Library ID: 666877
// ============================================================
//
//  📌 الـ URL النهائي بعد الـ Deploy هيبقى:
//  https://us-central1-yghjni.cloudfunctions.net/bunnyWebhook
//
//  ضع هذا الرابط في لوحة تحكم Bunny.net:
//  Stream → Library (666877) → Settings → Webhooks
// ============================================================

const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp }  = require("firebase-admin/app");
const { getFirestore }   = require("firebase-admin/firestore");
const { defineString }   = require("firebase-functions/params");

// ─── تهيئة Firebase Admin ────────────────────────────────────
initializeApp();
const db = getFirestore();

// ─── مفتاح التحقق السري (اختياري لكن مُوصى به) ──────────────
// اضبطه مرة واحدة عبر CLI:
//   firebase functions:secrets:set BUNNY_WEBHOOK_SECRET
// ثم ضع نفس القيمة في Bunny Dashboard → Webhook Secret
const WEBHOOK_SECRET = defineString("BUNNY_WEBHOOK_SECRET", {
  default: "",
  description: "Secret token من Bunny.net Webhook settings",
});

// ─── خريطة حالات Bunny.net ───────────────────────────────────
// المصدر: https://docs.bunny.net/reference/get_-libraryid-videos-videoid
const BUNNY_STATUS_MAP = {
  0: { ar: "قيد الرفع",      en: "Queued"           },
  1: { ar: "جاري المعالجة",  en: "Processing"       },
  2: { ar: "جاري الترميز",   en: "Encoding"         },
  3: { ar: "جاهز",           en: "Ready"            },
  4: { ar: "خطأ في الترميز", en: "EncodeError"      },
  5: { ar: "محذوف",          en: "Deleted"          },
  6: { ar: "تم الرفع",       en: "Uploaded"         },
};

// ─── الـ Webhook الرئيسي ─────────────────────────────────────
exports.bunnyWebhook = onRequest(
  {
    region: "us-central1",
    // اسمح فقط بـ POST
    cors: false,
  },
  async (req, res) => {

    // 1️⃣  قبول POST فقط
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // 2️⃣  التحقق من المفتاح السري (لو اتضبط)
    const secret = WEBHOOK_SECRET.value();
    if (secret) {
      const incoming = req.headers["bunny-signature"] || req.headers["x-bunny-signature"] || "";
      if (incoming !== secret) {
        console.warn("⛔ Webhook signature mismatch — طلب مرفوض");
        return res.status(401).send("Unauthorized");
      }
    }

    // 3️⃣  استخراج الـ Payload
    const payload = req.body;

    // Bunny.net بيبعت الحقول بـ PascalCase
    const videoId     = payload.VideoId     || payload.videoId     || null;
    const statusCode  = payload.Status      ?? payload.status      ?? null;
    const libraryId   = payload.LibraryId   || payload.libraryId   || "666877";
    const collectionId= payload.CollectionId|| payload.collectionId|| null;
    const title       = payload.Title       || payload.title       || null;
    const duration    = payload.Duration    || payload.duration    || null;

    console.log("📦 Bunny Webhook received:", JSON.stringify({
      videoId, statusCode, libraryId, collectionId, title
    }));

    // 4️⃣  تحقق من وجود VideoId
    if (!videoId) {
      console.error("❌ لا يوجد VideoId في الـ Payload");
      // نرد 200 عشان Bunny ميعيدش الإرسال
      return res.status(200).send("OK — missing VideoId, ignored");
    }

    // 5️⃣  بناء بيانات التحديث
    const statusInfo  = BUNNY_STATUS_MAP[statusCode] ?? { ar: "غير معروف", en: "Unknown" };
    const isReady     = statusCode === 3;

    const updateData = {
      bunnyVideoId:    videoId,
      bunnyLibraryId:  libraryId,
      status:          statusInfo.en,           // "Ready" / "Encoding" / ...
      statusAr:        statusInfo.ar,           // "جاهز" / "جاري الترميز" / ...
      statusCode:      statusCode,
      isReady:         isReady,
      updatedAt:       new Date().toISOString(),
    };

    // أضف حقول إضافية لو موجودة في الـ Payload
    if (collectionId) updateData.collectionId = collectionId;
    if (title)        updateData.title         = title;
    if (duration)     updateData.duration      = duration;

    // لو الفيديو جاهز — أضف رابط التشغيل
    if (isReady) {
      updateData.playUrl    = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
      updateData.thumbnailUrl = `https://vz-4688f24d-ab7.b-cdn.net/${videoId}/thumbnail.jpg`;
      updateData.readyAt    = new Date().toISOString();
      console.log(`✅ الفيديو جاهز: ${videoId}`);
    }

    // 6️⃣  تحديث Firestore
    try {
      // ─ الطريقة الأولى: doc ID = videoId مباشرةً (الأبسط) ─
      const videoRef = db.collection("videos").doc(videoId);
      const docSnap  = await videoRef.get();

      if (docSnap.exists) {
        // الـ document موجود → تحديث
        await videoRef.update(updateData);
        console.log(`✏️ تم تحديث الفيديو: ${videoId} → ${statusInfo.ar}`);
      } else {
        // الـ document مش موجود → إنشاء جديد
        await videoRef.set({ ...updateData, createdAt: new Date().toISOString() });
        console.log(`🆕 تم إنشاء سجل جديد للفيديو: ${videoId}`);
      }

      // ─ الطريقة الثانية (بديلة): البحث بحقل bunnyVideoId ─
      // لو بتخزن الـ videoId كحقل مش كـ doc ID، افك تعليق الكود ده:
      /*
      const snap = await db.collection("videos")
                            .where("bunnyVideoId", "==", videoId)
                            .limit(1)
                            .get();
      if (!snap.empty) {
        await snap.docs[0].ref.update(updateData);
      } else {
        await db.collection("videos").add({ ...updateData, createdAt: new Date().toISOString() });
      }
      */

    } catch (firestoreErr) {
      console.error("🔥 خطأ Firestore:", firestoreErr);
      // رد 200 عشان Bunny ميعيدش الإرسال بشكل لا نهائي
      return res.status(200).send("OK — Firestore error logged");
    }

    // 7️⃣  رد 200 OK لـ Bunny.net
    return res.status(200).json({
      success: true,
      videoId,
      status: statusInfo.en,
    });
  }
);
