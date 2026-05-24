// firebase-config.js
try {
    const firebaseConfig = {
        apiKey: "AIzaSyCoUAGpTJANr-voTNxvEIlos2I8w_1kXtA",
        authDomain: "yghjni.firebaseapp.com",
        projectId: "yghjni",
        storageBucket: "yghjni.firebasestorage.app",
        messagingSenderId: "629167303662",
        appId: "1:629167303662:web:91069e95be3ac626c13cff",
        measurementId: "G-NT4EF36RFT"
    };

    // تهيئة المشروع
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        // تعريف متغير قاعدة البيانات لاستخدامه في الأكواد
        window.db = firebase.firestore();
    }
} catch (e) {
    console.warn("Firebase could not be initialized. You might be offline.", e);
}
