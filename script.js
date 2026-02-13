// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAUZUyDm026pvbScVn6f_Hy5MFcf9SvLuE",
    authDomain: "siond-a6c34.firebaseapp.com",
    projectId: "siond-a6c34",
    storageBucket: "siond-a6c34.firebasestorage.app",
    messagingSenderId: "875547108455",
    appId: "1:875547108455:web:60bb9ba17b3f97759be0c2",
    measurementId: "G-SYBKW4D61H"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Platform Config
const TEACHER_NAME = "مستر أمين الغازي";
const ARABIC_BRANCHES = ['الكل', 'النحو', 'البلاغة', 'الأدب', 'القراءة', 'النصوص', 'القصة', 'مراجعة نهائية', 'تأسيس'];

const GRADES_CONFIG = {
    '1prep': { title: 'الصف الأول الإعدادي', branches: ARABIC_BRANCHES },
    '2prep': { title: 'الصف الثاني الإعدادي', branches: ARABIC_BRANCHES },
    '3prep': { title: 'الصف الثالث الإعدادي', branches: ARABIC_BRANCHES },
    '1sec': { title: 'الصف الأول الثانوي', branches: ARABIC_BRANCHES },
    '2sec': { title: 'الصف الثاني الثانوي', branches: ARABIC_BRANCHES },
    '3sec': { title: 'الصف الثالث الثانوي', branches: ARABIC_BRANCHES }
};

// State
let appData = { lessons: [], exams: [], files: [], vouchers: [], students: [], announcements: [] };
let ytPlayers = {};
let isYouTubeAPIReady = false;

function onYouTubeIframeAPIReady() {
    isYouTubeAPIReady = true;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Splash screen (existing logic)
    initSplashScreen();

    // Load Data
    await loadInitialData();

    // UI Init
    initScrollAnimations();
    initNavbar();
    initMobileMenu();

    // Check Student Session (if on dashboard.html)
    if (window.location.pathname.includes('dashboard.html')) {
        initDashboard();
    }
});

function initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 1000);
        }, 3000);
    }
}

async function loadInitialData() {
    try {
        const [lessons, exams, files, vouchers, students, announcements, views, stats] = await Promise.all([
            db.collection('lessons').get(),
            db.collection('exams').get(),
            db.collection('files').get(),
            db.collection('vouchers').get(),
            db.collection('students').get(),
            db.collection('announcements').get(),
            db.collection('views').get(),
            db.collection('platform_stats').doc('visits').get()
        ]);

        appData.lessons = lessons.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appData.exams = exams.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appData.files = files.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appData.vouchers = vouchers.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appData.students = students.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appData.announcements = announcements.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appData.views = views.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appData.stats.visits = stats.exists ? stats.data().count : 0;

        console.log("Data loaded successfully");
        trackVisit(); // Track only once per load
    } catch (e) {
        console.error("Error loading data:", e);
    }
}

async function trackVisit() {
    const ref = db.collection('platform_stats').doc('visits');
    try {
        await ref.set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true });
    } catch (e) { console.error(e); }
}

async function logView(lessonId, lessonTitle) {
    const student = JSON.parse(localStorage.getItem('student_session'));
    if (!student) return;

    // Check if view already logged in this session to avoid duplicates
    const viewKey = `view_${lessonId}`;
    if (sessionStorage.getItem(viewKey)) return;

    try {
        await db.collection('views').add({
            lessonId,
            lessonTitle,
            studentName: student.name,
            studentPhone: student.phone,
            grade: student.grade,
            timestamp: Date.now()
        });
        sessionStorage.setItem(viewKey, 'true');
    } catch (e) { console.error(e); }
}

// --- Navigation & UI ---
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

function initMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenu) {
        mobileMenu.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
    }
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .course-card, .section-header').forEach(el => observer.observe(el));
}

// --- Admin Logic ---
function openAdmin() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.add('active');
}

function checkLogin() {
    const pass = document.getElementById('admin-password').value;
    if (pass === '010qwe') {
        document.getElementById('admin-modal').classList.remove('active');
        showAdminDashboard();
    } else {
        alert('كلمة المرور غير صحيحة');
    }
}

function closeIntroVideo() {
    const modal = document.getElementById('intro-modal');
    if (modal) modal.classList.remove('active');
    // Stop video if player is available
    if (ytPlayers['intro']) {
        ytPlayers['intro'].stopVideo();
    }
}


function showAdminDashboard() {
    const dash = document.getElementById('admin-dashboard');
    dash.classList.remove('hidden');
    renderAdminSection('dashboard');

    // Add event listeners to sidebar items
    document.querySelectorAll('.admin-nav li').forEach(li => {
        li.onclick = () => {
            document.querySelectorAll('.admin-nav li').forEach(l => l.classList.remove('active'));
            li.classList.add('active');
            renderAdminSection(li.dataset.section);
        };
    });
}

function hideAdminDashboard() {
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function toggleAdminSidebar() {
    document.getElementById('admin-sidebar').classList.toggle('active');
}

function renderAdminSection(section) {
    const content = document.getElementById('admin-content-area');
    content.innerHTML = '';

    switch (section) {

        case 'dashboard':
            content.innerHTML = `
                <div class="section-header" style="text-align: right; margin-bottom: 30px;">
                    <h2 style="font-size: 2rem; color: var(--secondary-color);">نظرة عامة على المنصة</h2>
                    <p>إحصائيات مباشرة من قاعدة البيانات</p>
                </div>
                <div class="stats-grid">
                    <div class="stat-item glass">
                        <i class="fas fa-user-graduate" style="font-size: 2rem; color: var(--secondary-color); margin-bottom: 15px;"></i>
                        <h3>${appData.students.length}</h3>
                        <p>طالب مسجل</p>
                    </div>
                    <div class="stat-item glass">
                        <i class="fas fa-video" style="font-size: 2rem; color: var(--secondary-color); margin-bottom: 15px;"></i>
                        <h3>${appData.lessons.length}</h3>
                        <p>محاضرة فيديو</p>
                    </div>
                    <div class="stat-item glass">
                        <i class="fas fa-tasks" style="font-size: 2rem; color: var(--secondary-color); margin-bottom: 15px;"></i>
                        <h3>${appData.exams.length}</h3>
                        <p>اختبار إلكتروني</p>
                    </div>
                    <div class="stat-item glass">
                        <i class="fas fa-file-pdf" style="font-size: 2rem; color: var(--secondary-color); margin-bottom: 15px;"></i>
                        <h3>${appData.files.length}</h3>
                        <p>مذكرة تعليمية</p>
                    </div>
                </div>

                <div style="margin-top: 40px;">
                    <h3 style="margin-bottom: 20px; color: var(--secondary-color);">آخر الدروس المضافة</h3>
                    <div class="vouchers-table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>العنوان</th>
                                    <th>السنة</th>
                                    <th>الفرع</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${appData.lessons.slice(-5).reverse().map(l => `
                                    <tr>
                                        <td>${l.title}</td>
                                        <td>${GRADES_CONFIG[l.grade]?.title || l.grade}</td>
                                        <td>${l.branch}</td>
                                        <td>
                                            <button class="btn-verify" style="background: #ff5252; padding: 5px 10px;" onclick="deleteItem('lessons', '${l.id}')">حذف</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            break;

        case 'add-lesson':
            content.innerHTML = `
                <h2>إضافة فيديو جديد</h2>
                <div class="admin-form-container">
                    <div class="form-group">
                        <label>عنوان الفيديو</label>
                        <input type="text" id="l-title" placeholder="مثال: شرح المبتدأ والخبر">
                    </div>
                    <div class="form-group">
                        <label>رابط YouTube (ID فقط)</label>
                        <input type="text" id="l-youtubeId" placeholder="مثال: dQw4w9WgXcQ">
                    </div>
                    <div class="form-group">
                        <label>السنة الدراسية</label>
                        <select id="l-grade">
                            ${Object.entries(GRADES_CONFIG).map(([k, v]) => `<option value="${k}">${v.title}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>فرع اللغة</label>
                        <select id="l-branch">
                            ${ARABIC_BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary w-100" style="padding: 15px;" onclick="saveLesson()">حفظ ونشر الفيديو</button>
            `;
            break;

        case 'add-exam':
            content.innerHTML = `
                <h2>إضافة اختبار جديد</h2>
                <div class="admin-form-container">
                    <div class="form-group">
                        <label>عنوان الاختبار</label>
                        <input type="text" id="e-title" placeholder="مثال: اختبار شامل على الوحدة الأولى">
                    </div>
                    <div class="form-group">
                        <label>السنة الدراسية</label>
                        <select id="e-grade">
                            ${Object.entries(GRADES_CONFIG).map(([k, v]) => `<option value="${k}">${v.title}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>المدة (بالدقائق)</label>
                        <input type="number" id="e-duration" value="30">
                    </div>
                    <div class="form-group">
                        <label>رابط الفورم (Google Forms / Microsoft Forms)</label>
                        <input type="text" id="e-link" placeholder="أدخل رابط الاختبار هنا">
                    </div>
                </div>
                <button class="btn btn-primary w-100" style="padding: 15px;" onclick="saveExam()">حفظ ونشر الاختبار</button>
            `;
            break;

        case 'add-file':
            content.innerHTML = `
                <h2>إضافة مذكرة جديدة</h2>
                <div class="admin-form-container">
                    <div class="form-group">
                        <label>اسم المذكرة</label>
                        <input type="text" id="f-title" placeholder="مثال: ملخص النحو للثانوية العامة">
                    </div>
                    <div class="form-group">
                        <label>رابط الملف (Google Drive / MediaFire)</label>
                        <input type="text" id="f-link" placeholder="أدخل رابط التحميل المباشر">
                    </div>
                    <div class="form-group">
                        <label>السنة الدراسية</label>
                        <select id="f-grade">
                            ${Object.entries(GRADES_CONFIG).map(([k, v]) => `<option value="${k}">${v.title}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary w-100" style="padding: 15px;" onclick="saveFile()">حفظ ونشر المذكرة</button>
            `;
            break;

        case 'vouchers':
            content.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div>
                        <h2>إدارة أكواد التفعيل</h2>
                        <p style="font-size: 0.8rem; color: rgba(255,255,255,0.5);">يتم توليد 20 كود لكل صف دراسي تلقائياً</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-secondary" onclick="generateVouchers()">توليد 120 كود جديد</button>
                    </div>
                </div>

                <div class="print-controls glass" style="padding: 15px; margin-bottom: 20px; border-radius: 12px;">
                    <h4 style="margin-bottom: 10px; font-size: 0.9rem;">طباعة الأكواد حسب الصف:</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${Object.entries(GRADES_CONFIG).map(([k, v]) => `
                            <button class="btn-verify" style="padding: 5px 10px; font-size: 0.75rem;" onclick="printVouchersByGrade('${k}')">
                                <i class="fas fa-print"></i> ${v.title}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="vouchers-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>الكود</th>
                                <th>الصف</th>
                                <th>الحالة</th>
                                <th>طباعة</th>
                                <th>حذف</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${appData.vouchers.slice(-100).reverse().map(v => `
                                <tr>
                                    <td style="font-family: monospace; font-weight: bold; color: var(--secondary-color);">${v.code}</td>
                                    <td style="font-size: 0.8rem;">${GRADES_CONFIG[v.grade]?.title || 'عام'}</td>
                                    <td><span class="status-badge ${v.used ? 'status-used' : 'status-active'}">${v.used ? 'مستخدم' : 'نشط'}</span></td>
                                    <td><i class="fas fa-print" style="color: #4fc3f7; cursor: pointer;" onclick="printSingleVoucher('${v.code}', '${v.grade}')"></i></td>
                                    <td><i class="fas fa-trash" style="color: #ff5252; cursor: pointer;" onclick="deleteItem('vouchers', '${v.id}')"></i></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            break;

        case 'students-list':
            content.innerHTML = `
                <h2>قائمة الطلاب المسجلين</h2>
                <div class="vouchers-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>الاسم</th>
                                <th>السنة الدراسية</th>
                                <th>رقم الهاتف</th>
                                <th>تاريخ التسجيل</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${appData.students.map(s => `
                                <tr>
                                    <td>${s.name}</td>
                                    <td>${GRADES_CONFIG[s.grade]?.title || s.grade}</td>
                                    <td dir="ltr">${s.phone}</td>
                                    <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            break;
    }
}

// --- Printing Logic ---
function printSingleVoucher(code, gradeKey) {
    const gradeName = GRADES_CONFIG[gradeKey]?.title || "عام";
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>طباعة كود تفعيل</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: center; padding: 50px; }
                    .card { border: 2px dashed #000; padding: 20px; display: inline-block; min-width: 300px; border-radius: 15px; }
                    .teacher { font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; }
                    .code { font-size: 2.5rem; font-family: monospace; font-weight: bold; color: #000; margin: 15px 0; letter-spacing: 5px; }
                    .grade { font-size: 1rem; color: #666; margin-bottom: 20px; }
                    .footer { font-size: 0.8rem; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="teacher">مستر أمين الغازي - لغة عربية</div>
                    <div class="grade">${gradeName}</div>
                    <div style="font-size: 0.9rem;">كود التفعيل الخاص بك:</div>
                    <div class="code">${code}</div>
                    <div class="footer">تستخدم مرة واحدة فقط - منصة مستر أمين التعليمية</div>
                </div>
                <script>setTimeout(() => { window.print(); window.close(); }, 500);<\/script>
            </body>
        </html>
    `);
}

function printVouchersByGrade(gradeKey) {
    const gradeName = GRADES_CONFIG[gradeKey]?.title || "عام";
    const vouchers = appData.vouchers.filter(v => v.grade === gradeKey && !v.used).slice(0, 30);
    if (vouchers.length === 0) {
        alert("لا توجد أكواد غير مستخدمة لهذا الصف حالياً.");
        return;
    }
    const printWindow = window.open('', '_blank');
    let cardsHtml = vouchers.map(v => `
        <div class="card">
            <div class="teacher">مستر أمين الغازي</div>
            <div class="grade">${gradeName}</div>
            <div class="code">${v.code}</div>
            <div class="footer-text">منصة مستر أمين التعليمية</div>
        </div>
    `).join('');
    printWindow.document.write(`
        <html>
            <head>
                <title>طباعة أكواد ${gradeName}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 20px; display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; }
                    .card { border: 1px solid #ccc; width: 220px; height: 140px; padding: 15px; text-align: center; border-radius: 10px; box-sizing: border-box; page-break-inside: avoid; }
                    .teacher { font-size: 0.9rem; font-weight: bold; }
                    .grade { font-size: 0.75rem; color: #444; margin-bottom: 5px; }
                    .code { font-size: 1.4rem; font-family: monospace; font-weight: bold; margin: 10px 0; border: 1px solid #eee; background: #f9f9f9; padding: 5px; }
                    .footer-text { font-size: 0.6rem; color: #999; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                ${cardsHtml}
                <script>setTimeout(() => { window.print(); window.close(); }, 700);<\/script>
            </body>
        </html>
    `);
}


// --- CRUD Actions ---
async function saveLesson() {
    const lesson = {
        title: document.getElementById('l-title').value,
        youtubeId: document.getElementById('l-youtubeId').value,
        grade: document.getElementById('l-grade').value,
        branch: document.getElementById('l-branch').value,
        createdAt: Date.now()
    };

    if (!lesson.title || !lesson.youtubeId) return alert('أدخل جميع البيانات');

    try {
        await db.collection('lessons').add(lesson);
        alert('تم حفظ الفيديو بنجاح');
        location.reload();
    } catch (e) {
        alert('خطأ في الحفظ');
    }
}


async function saveExam() {
    const exam = {
        title: document.getElementById('e-title').value,
        grade: document.getElementById('e-grade').value,
        duration: document.getElementById('e-duration').value,
        link: document.getElementById('e-link').value,
        createdAt: Date.now()
    };
    if (!exam.title || !exam.link) return alert('أدخل جميع البيانات');
    try {
        await db.collection('exams').add(exam);
        alert('تم حفظ الاختبار بنجاح');
        location.reload();
    } catch (e) { alert('خطأ في الحفظ'); }
}

async function saveFile() {
    const file = {
        title: document.getElementById('f-title').value,
        link: document.getElementById('f-link').value,
        grade: document.getElementById('f-grade').value,
        createdAt: Date.now()
    };
    if (!file.title || !file.link) return alert('أدخل جميع البيانات');
    try {
        await db.collection('files').add(file);
        alert('تم حفظ المذكرة بنجاح');
        location.reload();
    } catch (e) { alert('خطأ في الحفظ'); }
}

async function deleteItem(collection, id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        try {
            await db.collection(collection).doc(id).delete();
            alert('تم الحذف بنجاح');
            location.reload();
        } catch (e) { alert('خطأ في الحذف'); }
    }
}

async function generateVouchers() {
    if (!confirm('سيتم توليد 120 كود جديد (20 لكل صف دراسي). هل تريد الاستمرار؟')) return;
    const batch = db.batch();
    const grades = Object.keys(GRADES_CONFIG);
    grades.forEach(grade => {
        for (let i = 0; i < 20; i++) {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const ref = db.collection('vouchers').doc();
            batch.set(ref, { code, grade, used: false, createdAt: Date.now() });
        }
    });
    await batch.commit();
    alert('تم توليد 120 كود بنجاح (20 لكل صف)');
    location.reload();
}

// --- Video Protection Logic ---
function togglePlayPause(id) {
    const player = ytPlayers[id];
    if (!player) return;
    const shield = document.querySelector(`#${id}-video-wrapper .video-overlay-shield`);
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        if (shield) shield.classList.remove('playing');
    } else {
        player.playVideo();
        if (shield) shield.classList.add('playing');
    }
}

function seek(id, seconds) {
    const player = ytPlayers[id];
    if (player) player.seekTo(player.getCurrentTime() + seconds, true);
}

function toggleFullscreen(wrapperId) {
    const el = document.getElementById(wrapperId);
    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
}

// --- Student Dashboard Logic ---
function initDashboard() {
    const student = JSON.parse(localStorage.getItem('student_session'));
    if (!student) {
        document.getElementById('auth-modal').style.display = 'flex';
        return;
    }
    document.getElementById('auth-modal').style.display = 'none';
    const mainArea = document.getElementById('dashboard-main');
    if (mainArea) mainArea.style.display = 'block';

    ['display-name', 'profile-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = student.name;
    });
    const pInit = document.getElementById('profile-initial');
    if (pInit) pInit.textContent = student.name.charAt(0);

    renderStudentContent();
}

function renderStudentContent() {
    const student = JSON.parse(localStorage.getItem('student_session'));
    if (!student) return;
    const unlocked = JSON.parse(localStorage.getItem('unlocked_lessons') || '[]');
    const gradeLessons = appData.lessons.filter(l => l.grade === student.grade);
    const grid = document.getElementById('lectures-grid');
    if (grid) {
        grid.innerHTML = gradeLessons.length ? gradeLessons.map(l => {
            const isUnlocked = unlocked.includes(l.id);
            return `
            <div class="course-card">
                <div class="video-preview-wrapper" id="video-${l.id}">
                    <div id="player-${l.id}"></div>
                    ${isUnlocked ? `
                        <div class="video-overlay-shield total-shield" onclick="playLesson('${l.id}', '${l.youtubeId}')">
                            <div class="play-overlay"><i class="fas fa-play"></i></div>
                            <div class="shield-bottom-right"></div>
                        </div>
                    ` : `
                        <div class="locked-overlay" onclick="unlockLesson('${l.id}')">
                            <i class="fas fa-lock"></i>
                            <p>الدرس مقفل.. اضغط لإدخال الكود</p>
                        </div>
                    `}
                </div>
                <div class="course-body">
                    <h3>${l.title}</h3>
                    <p>${l.branch}</p>
                </div>
            </div>`;
        }).join('') : '<div class="empty-msg">لا يوجد فيديوهات مضافة بعد</div>';
    }
    const badge = document.getElementById('lecture-count-badge');
    if (badge) badge.textContent = gradeLessons.length;
}

async function unlockLesson(lessonId) {
    const code = prompt("من فضلك أدخل كود التفعيل لمشاهدة هذا الدرس:");
    if (!code) return;
    const student = JSON.parse(localStorage.getItem('student_session'));
    const voucher = appData.vouchers.find(v => v.code === code.toUpperCase());

    if (!voucher) return alert("كود غير صحيح!");
    if (voucher.used) return alert("هذا الكود مستخدم من قبل!");

    // Grade Check logic
    if (voucher.grade !== student.grade) {
        return alert("خطأ! هذا الكود مخصص لصف دراسي آخر، لا يمكنك استخدامه هنا.");
    }

    try {
        await db.collection('vouchers').doc(voucher.id).update({
            used: true,
            usedBy: student.phone,
            lessonId: lessonId,
            usedAt: Date.now()
        });
        let unlocked = JSON.parse(localStorage.getItem('unlocked_lessons') || '[]');
        unlocked.push(lessonId);
        localStorage.setItem('unlocked_lessons', JSON.stringify(unlocked));
        alert("تم فتح الدرس بنجاح! استمتع بالمشاهدة.");
        location.reload();
    } catch (e) { alert("حدث خطأ أثناء التفعيل"); }
}

function playLesson(containerId, youtubeId) {
    const wrapper = document.getElementById(`video-${containerId}`);
    const shield = wrapper.querySelector('.total-shield');
    if (shield) shield.style.display = 'none';
    new YT.Player(`player-${containerId}`, {
        height: '100%', width: '100%', videoId: youtubeId,
        playerVars: { 'autoplay': 1, 'modestbranding': 1, 'rel': 0 },
        events: { 'onReady': (event) => event.target.playVideo() }
    });
}

// Auth Form (Dashboard)
const regForm = document.getElementById('registration-form');
if (regForm) {
    regForm.onsubmit = (e) => {
        e.preventDefault();
        const studentData = {
            name: document.getElementById('student-name').value,
            phone: document.getElementById('student-phone').value,
            grade: document.getElementById('student-year').value,
            createdAt: Date.now()
        };
        localStorage.setItem('student_session', JSON.stringify(studentData));
        location.reload();
    };
}


function logout() { localStorage.removeItem('student_session'); location.reload(); }

function updateYears() {
    const stage = document.getElementById('student-stage').value;
    const yearSelect = document.getElementById('student-year');
    yearSelect.innerHTML = '<option value="">اختر السنة</option>';
    if (stage === 'preparatory') {
        ['1prep', '2prep', '3prep'].forEach((v, i) => {
            yearSelect.innerHTML += `<option value="${v}">الصف ${['الأول', 'الثاني', 'الثالث'][i]} الإعدادي</option>`;
        });
    } else if (stage === 'secondary') {
        ['1sec', '2sec', '3sec'].forEach((v, i) => {
            yearSelect.innerHTML += `<option value="${v}">الصف ${['الأول', 'الثاني', 'الثالث'][i]} الثانوي</option>`;
        });
    }
}

function updateGroups() {
    // Basic implementation, can be expanded to fetch groups from appData
    const groupSelect = document.getElementById('student-group');
    groupSelect.innerHTML = `<option value="">اختر المجموعة</option>
        <option value="A">مجموعة A (مركز)</option><option value="B">مجموعة B (أونلاين)</option>`;
}
