// Splash Screen Logic
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('hidden');
            setTimeout(() => {
                splash.remove();
            }, 1000); // Match transition duration in CSS
        }
    }, 3500); // Show splash for 3.5 seconds
});

// Reveal on Scroll Animations
const revealElements = document.querySelectorAll('.feature-card, .course-card');

const revealOnScroll = () => {
    for (let i = 0; i < revealElements.length; i++) {
        const windowHeight = window.innerHeight;
        const revealTop = revealElements[i].getBoundingClientRect().top;
        const revealPoint = 150;

        if (revealTop < windowHeight - revealPoint) {
            revealElements[i].style.opacity = '1';
            revealElements[i].style.transform = 'translateY(0)';
        }
    }
};

window.addEventListener('scroll', revealOnScroll);

// Initialize some styles for reveal animation
revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
});

// Animation initial call
revealOnScroll();

// Admin Login via Prompt
function openAdmin() {
    const password = prompt("برجاء إدخال كلمة المرور للدخول للوحة التحكم:");
    if (password === "010qwe") {
        window.location.href = 'admin.html';
    } else if (password !== null) {
        alert("كلمة المرور غير صحيحة!");
    }
}

// --- Firebase Configuration (REQUIRED) ---
// Note: This must match the config in admin.html
const firebaseConfig = {
    apiKey: "AIzaSyAUZUyDm026pvbScVn6f_Hy5MFcf9SvLuE",
    authDomain: "siond-a6c34.firebaseapp.com",
    projectId: "siond-a6c34",
    storageBucket: "siond-a6c34.firebasestorage.app",
    messagingSenderId: "875547108455",
    appId: "1:875547108455:web:60bb9ba17b3f97759be0c2",
    measurementId: "G-SYBKW4D61H"
};

// Initialize Firebase (Check if already initialized to avoid errors)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Update Years based on Stage
function updateYears() {
    const stage = document.getElementById('student-stage').value;
    const yearSelect = document.getElementById('student-year');
    yearSelect.innerHTML = '<option value="">اختر السنة</option>';

    const stages = {
        preparatory: ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'],
        secondary: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي']
    };

    if (stage && stages[stage]) {
        stages[stage].forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }
    updateGroups(); // Reset groups
}

// Fixed Schedule Mapping for Groups/Centers
const groupMapping = {
    'الصف الثالث الإعدادي': [
        { id: 'alamein_sat_tue', name: 'سبت وثلاث (الأمين)' },
        { id: 'van_sun_wed', name: 'حد وأربع (وان)' },
        { id: 'total_mon_thu', name: 'اثنين وخميس (توتال)' }
    ],
    'الصف الأول الثانوي': [
        { id: 'alamein_sat_tue', name: 'سبت وثلاث (الأمين)' },
        { id: 'total_mon_thu', name: 'اثنين وخميس (توتال)' },
        { id: 'ibnsina_mon_thu', name: 'اثنين وخميس (ابن سينا)' }
    ],
    'الصف الثاني الثانوي': [
        { id: 'alamein_sat_tue', name: 'سبت وثلاث (الأمين)' },
        { id: 'total_mon_thu', name: 'اثنين وخميس (توتال)' }
    ],
    'الصف الثالث الثانوي': [
        { id: 'alamein_sat_tue', name: 'سبت وثلاث (الأمين)' },
        { id: 'total_sun_wed', name: 'حد وأربع (توتال)' },
        { id: 'ibnsina_mon_thu', name: 'اثنين وخميس (ابن سينا)' }
    ]
};

function updateGroups() {
    const year = document.getElementById('student-year').value;
    const groupSelect = document.getElementById('student-group');
    groupSelect.innerHTML = '<option value="">اختر المجموعة</option>';

    // Add Online as default for everyone
    const onlineOpt = document.createElement('option');
    onlineOpt.value = 'online';
    onlineOpt.textContent = 'أونلاين (مجموعة C)';
    groupSelect.appendChild(onlineOpt);

    if (groupMapping[year]) {
        groupMapping[year].forEach(g => {
            const option = document.createElement('option');
            option.value = g.id;
            option.textContent = g.name;
            groupSelect.appendChild(option);
        });
    } else if (year) {
        // Default options for primary/other years if not specified
        ['A', 'B'].forEach(grp => {
            const option = document.createElement('option');
            option.value = grp;
            option.textContent = `مجموعة ${grp}`;
            groupSelect.appendChild(option);
        });
    }
}

// Student Authentication & Dashboard Control
const authModal = document.getElementById('auth-modal');
const dashboardSidebar = document.getElementById('dashboard-sidebar');
const dashboardMain = document.getElementById('dashboard-main');
const registrationForm = document.getElementById('registration-form');

// Tab Switching Logic
function showTab(tabName) {
    // Update menu items
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update tabs
    document.querySelectorAll('.dashboard-tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabName + '-tab').style.display = 'block';
}

function initDashboard() {
    const studentData = JSON.parse(localStorage.getItem('student_profile'));
    if (studentData) {
        if (authModal) authModal.style.display = 'none';
        if (dashboardSidebar) dashboardSidebar.style.display = 'flex';
        if (dashboardMain) {
            dashboardMain.style.display = 'block';
        }

        // Fill profile info
        const displayName = document.getElementById('display-name');
        const profileName = document.getElementById('profile-name');
        const profileInitial = document.getElementById('profile-initial');

        if (displayName) displayName.innerText = studentData.name;
        if (profileName) profileName.innerText = studentData.name;
        if (profileInitial) profileInitial.innerText = studentData.name.charAt(0);

        // Update greeting based on grade info
        const greetingP = document.querySelector('.user-welcome p');
        if (greetingP) greetingP.innerText = `طالب ${studentData.year} - ${studentData.group === 'C' ? 'أونلاين' : 'سنتر'}`;

        // Fetch Year Specific Content
        fetchStudentContent(studentData);

        // Fetch Honor Roll
        fetchHonorRoll(studentData.year);

        // Fetch Student Results
        fetchStudentResults(studentData);

        // Listen for Announcements
        db.collection('platform_data').doc('announcement').onSnapshot(doc => {
            if (doc.exists) {
                document.getElementById('announcement-text').innerText = doc.data().text;
            }
        });

        // Log daily visit if not logged today
        logVisit(studentData);
    } else {
        if (authModal) authModal.style.display = 'flex';
        if (dashboardSidebar) dashboardSidebar.style.display = 'none';
        if (dashboardMain) dashboardMain.style.display = 'none';
    }
}

function fetchStudentContent(student) {
    // 1. Fetch Lectures
    db.collection('lectures')
        .where('year', '==', student.year)
        .orderBy('timestamp', 'desc').onSnapshot(snap => {
            const grid = document.getElementById('lectures-grid');
            const latestEntry = document.getElementById('latest-content-entry');
            const badge = document.getElementById('lecture-count-badge');
            const isYearUnlocked = localStorage.getItem('unlocked_' + student.year);

            // Filter by group manually code-side to handle "all" groups
            const filteredLectures = snap.docs.map(d => d.data()).filter(l => {
                return l.group === 'all' || l.group === student.group;
            });

            badge.innerText = `${filteredLectures.length} محاضرة مخصصة لك`;
            grid.innerHTML = '';

            if (filteredLectures.length === 0) {
                grid.innerHTML = '<p style="color: rgba(255,255,255,0.3);">لا توجد محاضرات متاحة لمجموعتك حالياً.</p>';
                latestEntry.innerHTML = '';
                return;
            }

            let first = true;
            filteredLectures.forEach(lec => {
                let card = '';

                if (isYearUnlocked) {
                    card = `
                    <div class="course-card" style="margin-bottom: 0;">
                        <div class="course-image" style="height: 180px;">
                            <img src="https://img.youtube.com/vi/${lec.videoId}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover;">
                            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size: 3rem; color: #fff; opacity:0.8;">
                                 <i class="fas fa-play-circle"></i>
                            </div>
                        </div>
                        <div class="course-body">
                            <h3 style="font-size: 1.1rem; margin-bottom: 10px;">${lec.title}</h3>
                            <p style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 15px;">${lec.desc || 'لا يوجد وصف للمحاضرة'}</p>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.8rem; color: var(--secondary-color);">${lec.date}</span>
                                <a href="https://youtube.com/watch?v=${lec.videoId}" target="_blank" class="btn btn-secondary" style="padding: 8px 15px; font-size:0.8rem;">مشاهدة</a>
                            </div>
                        </div>
                    </div>
                `;
                } else {
                    card = `
                    <div class="course-card locked-card" style="margin-bottom: 0;">
                        <div class="locked-overlay">
                            <i class="fas fa-lock"></i>
                            <h3 style="font-size: 1.1rem; margin-bottom: 10px;">${lec.title}</h3>
                            <p style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 15px;">هذا المحتوى محمي بكود تفعيل</p>
                            <div class="voucher-input-group">
                                <input type="text" class="dashboard-voucher-input" placeholder="ادخل الكود هنا">
                                <button class="btn-verify" onclick="checkVoucher(this, '${student.year}')">تفعيل</button>
                            </div>
                        </div>
                    </div>
                `;
                }
                grid.innerHTML += card;

                if (first && isYearUnlocked) {
                    latestEntry.innerHTML = `
                    <div class="next-lesson-card" style="background: linear-gradient(135deg, #0d47a1 0%, #002171 100%);">
                        <div class="course-badge" style="background: var(--secondary-color); color: #000;">أحدث محاضرة</div>
                        <p style="opacity: 0.8; margin-bottom: 15px;">${lec.year}</p>
                        <h2 style="font-size: 2.2rem; margin-bottom: 25px;">${lec.title}</h2>
                        <a href="https://youtube.com/watch?v=${lec.videoId}" target="_blank" class="btn btn-white btn-lg">بدء المشاهدة الآن <i class="fas fa-play" style="margin-right:10px; font-size:0.9rem;"></i></a>
                        <i class="fas fa-book-reader" style="position: absolute; bottom: -20px; left: 20px; font-size: 12rem; opacity: 0.05;"></i>
                    </div>
                `;
                    first = false;
                } else if (first && !isYearUnlocked) {
                    latestEntry.innerHTML = `
                    <div class="next-lesson-card" style="background: linear-gradient(135deg, #333 0%, #000 100%); position: relative; overflow: hidden;">
                        <div class="course-badge" style="background: #555; color: #fff;">محتوى مغلق</div>
                        <h2 style="font-size: 1.8rem; margin-bottom: 15px;">يرجى تفعيل السنة الدراسية</h2>
                        <p style="opacity: 0.7; margin-bottom: 25px;">قم بإدخال كود التفعيل في أي كارت بالأسفل لفتح كافة المحاضرات.</p>
                        <i class="fas fa-lock" style="position: absolute; bottom: -20px; left: 20px; font-size: 12rem; opacity: 0.1;"></i>
                    </div>
                `;
                    first = false;
                }
            });
        });

    // 2. Fetch Quizzes
    db.collection('quizzes')
        .where('year', '==', student.year)
        .orderBy('timestamp', 'desc').onSnapshot(snap => {
            const grid = document.getElementById('quizzes-grid');
            const badge = document.getElementById('quiz-count-badge');

            // Filter by group manually code-side to handle "all" groups
            const filteredQuizzes = snap.docs.map(d => d.data()).filter(q => {
                return q.group === 'all' || q.group === student.group;
            });

            badge.innerText = `${filteredQuizzes.length} اختبار مخصص لك`;
            grid.innerHTML = '';

            if (filteredQuizzes.length === 0) {
                grid.innerHTML = '<p style="color: rgba(255,255,255,0.3);">لا توجد اختبارات متاحة لمجموعتك حالياً.</p>';
                return;
            }

            filteredQuizzes.forEach(quiz => {
                const quizDataJson = JSON.stringify(quiz).replace(/'/g, "&apos;");
                const card = `
                <div class="progress-section" style="border-right: 4px solid var(--secondary-color); background: rgba(255,255,255,0.03); padding: 20px; border-radius: 15px; margin-bottom: 0;">
                    <h3 style="margin-bottom: 10px; font-size:1.1rem;">${quiz.title}</h3>
                    <p style="opacity: 0.6; font-size: 0.85rem; margin-bottom: 20px;">عدد الأسئلة: ${quiz.questions.length}</p>
                    <button class="btn btn-secondary" style="width: 100%;" onclick='startQuiz(${quizDataJson})'>بدء الاختبار</button>
                </div>
            `;
                grid.innerHTML += card;
            });
        });
}

function fetchStudentResults(student) {
    db.collection('quiz_results')
        .where('phone', '==', student.phone)
        .onSnapshot(snap => {
            const table = document.getElementById('student-results-table');
            if (!table) return;

            table.innerHTML = '';
            if (snap.empty) {
                table.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.2);">لم تقم بأداء أي اختبارات بعد.</td></tr>';
                return;
            }

            let results = [];
            snap.forEach(doc => results.push(doc.data()));

            // Sort in JS instead of Firestore to avoid composite index requirement
            results.sort((a, b) => {
                const tsA = a.timestamp ? a.timestamp.toDate() : 0;
                const tsB = b.timestamp ? b.timestamp.toDate() : 0;
                return tsB - tsA;
            });

            results.forEach(res => {
                const date = res.timestamp ? new Date(res.timestamp.toDate()).toLocaleDateString('ar-EG') : 'قيد المعالجة';
                table.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 15px;">${res.quizTitle}</td>
                        <td style="padding: 15px; color: var(--secondary-color); font-weight:700;">${res.score} / ${res.total}</td>
                        <td style="padding: 15px;">${res.percent}%</td>
                        <td style="padding: 15px; opacity: 0.6; font-size: 0.8rem;">${date}</td>
                    </tr>
                `;
            });
        });
}

function logVisit(student) {
    const today = new Date().toISOString().split('T')[0];
    const visitKey = `visit_${student.phone}_${today}`;

    if (!localStorage.getItem(visitKey)) {
        try {
            db.collection('student_visits').add({
                studentName: student.name,
                studentPhone: student.phone,
                stage: student.stage,
                year: student.year,
                group: student.group,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                timeString: new Date().toLocaleString('ar-EG')
            });
            localStorage.setItem(visitKey, 'true');
        } catch (error) {
            console.error("Error logging visit:", error);
        }
    }
}

// Quiz System Global Variables
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];

function logActivity(type, message, studentName) {
    db.collection('activity').add({
        type,
        message,
        studentName,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        dateString: new Date().toLocaleString('ar-EG')
    });
}

function startQuiz(quizData) {
    currentQuiz = quizData;
    currentQuestionIndex = 0;
    userAnswers = [];

    document.getElementById('modal-quiz-title').innerText = currentQuiz.title;
    document.getElementById('quiz-player-modal').style.display = 'flex';
    document.getElementById('next-q-btn').innerText = 'السؤال التالي';

    displayQuestion();
}

function displayQuestion() {
    const q = currentQuiz.questions[currentQuestionIndex];
    const container = document.getElementById('quiz-questions-area');
    document.getElementById('quiz-progress-text').innerText = `سؤال ${currentQuestionIndex + 1} من ${currentQuiz.questions.length}`;

    let optionsHtml = '';
    q.options.forEach((opt, idx) => {
        optionsHtml += `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 15px; border-radius: 12px; margin-bottom: 10px; cursor: pointer; transition: 0.3s;" 
                 onclick="selectOption(this, ${idx + 1})" class="quiz-option-item">
                <span style="color: var(--secondary-color); margin-left:15px; font-weight:700;">${idx + 1}.</span> ${opt}
            </div>
        `;
    });

    container.innerHTML = `
        <h3 style="margin-bottom: 25px; line-height: 1.5;">${q.text}</h3>
        <div id="options-container">${optionsHtml}</div>
    `;
}

function selectOption(el, val) {
    document.querySelectorAll('.quiz-option-item').forEach(item => {
        item.style.borderColor = 'rgba(255,255,255,0.1)';
        item.style.background = 'rgba(255,255,255,0.05)';
    });
    el.style.borderColor = 'var(--secondary-color)';
    el.style.background = 'rgba(255,193,7,0.1)';
    userAnswers[currentQuestionIndex] = val.toString();
}

function handleNextQuestion() {
    if (!userAnswers[currentQuestionIndex]) return alert('يرجى اختيار إجابة أولاً');

    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        if (currentQuestionIndex === currentQuiz.questions.length - 1) {
            document.getElementById('next-q-btn').innerText = 'إنهاء الاختبار';
        }
    } else {
        finishQuiz();
    }
}

async function finishQuiz() {
    let score = 0;
    currentQuiz.questions.forEach((q, idx) => {
        if (q.correct === userAnswers[idx]) score++;
    });

    const percent = Math.round((score / currentQuiz.questions.length) * 100);
    const student = JSON.parse(localStorage.getItem('student_profile'));

    alert(`أحسنت! درجتك هي: ${score} من ${currentQuiz.questions.length} (${percent}%)`);

    // Save Result to Firestore
    try {
        await db.collection('quiz_results').add({
            studentName: student.name,
            quizTitle: currentQuiz.title,
            score: score,
            total: currentQuiz.questions.length,
            percent: percent,
            year: student.year,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.error("Error saving score:", e); }

    logActivity('quiz_complete', `أكمل اختبار "${currentQuiz.title}" بنسبة ${percent}%`, student.name);

    closeQuiz();
}

function closeQuiz() {
    document.getElementById('quiz-player-modal').style.display = 'none';
}

function fetchHonorRoll(year) {
    db.collection('quiz_results')
        .where('year', '==', year)
        .orderBy('percent', 'desc')
        .limit(5)
        .onSnapshot(snap => {
            const list = document.getElementById('honor-roll-list');
            if (list) {
                list.innerHTML = '';
                if (snap.empty) {
                    list.innerHTML = '<p style="text-align:center; padding:20px; color:rgba(255,255,255,0.3);">لا يوجد متفوقين بعد.</p>';
                }
                snap.forEach((doc, index) => {
                    const res = doc.data();
                    const colors = ['#ffd700', '#c0c0c0', '#cd7f32', '#fff', '#fff'];
                    list.innerHTML += `
                        <div style="display: flex; align-items: center; gap: 15px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 10px; border-right: 3px solid ${colors[index] || '#fff'};">
                            <div style="width: 30px; height: 30px; border-radius: 50%; background: ${colors[index] || 'rgba(255,255,255,0.1)'}; color: #000; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem;">
                                ${index + 1}
                            </div>
                            <div style="flex-grow: 1;">
                                <h4 style="font-size: 0.95rem;">${res.studentName}</h4>
                                <p style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">${res.quizTitle}</p>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: var(--secondary-color); font-weight: 700;">${res.percent}%</div>
                            </div>
                        </div>
                    `;
                });
            }
        });
}

if (registrationForm) {
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const studentData = {
            name: document.getElementById('student-name').value,
            phone: document.getElementById('student-phone').value,
            parentPhone: document.getElementById('parent-phone').value,
            stage: document.getElementById('student-stage').value,
            year: document.getElementById('student-year').value,
            group: document.getElementById('student-group').value,
            registeredAt: new Date().toISOString()
        };

        try {
            await db.collection('students').doc(studentData.phone).set(studentData);
            localStorage.setItem('student_profile', JSON.stringify(studentData));

            logActivity('registration', 'سجل طالب جديد في المنصة', studentData.name);

            alert(`مرحباً بك يا ${studentData.name} في منصة مستر أمين الغازي!`);
            initDashboard();
        } catch (error) {
            alert('حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى.');
            console.error(error);
        }
    });
}

function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('student_profile');
        window.location.reload();
    }
}

// Mobile navigation for homepage
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

if (mobileMenu && navLinks) {
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenu.classList.toggle('open');
    });

    // Close menu when link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileMenu.classList.remove('open');
        });
    });
}

// Run Init
document.addEventListener('DOMContentLoaded', initDashboard);

// --- Activation Code (Voucher) Logic ---
async function checkVoucher(btn, studentYear) {
    const input = btn.previousElementSibling;
    const code = input.value.trim().toUpperCase();

    if (!code) return alert('برجاء إدخال الكود');

    btn.disabled = true;
    btn.innerText = 'جاري التحقق...';

    try {
        const snap = await db.collection('vouchers').where('code', '==', code).get();

        if (snap.empty) {
            alert('كود غير صحيح.. تأكد من كتابة الكود بشكل سليم');
            btn.disabled = false;
            btn.innerText = 'تفعيل';
            return;
        }

        const doc = snap.docs[0];
        const vData = doc.data();

        if (vData.used) {
            alert('عذراً، هذا الكود تم استخدامه من قبل');
            btn.disabled = false;
            btn.innerText = 'تفعيل';
            return;
        }

        if (vData.year !== studentYear) {
            alert(`هذا الكود مخصص لـ (${vData.year}) وأنت مسجل في (${studentYear})`);
            btn.disabled = false;
            btn.innerText = 'تفعيل';
            return;
        }

        // Mark as used
        await db.collection('vouchers').doc(doc.id).update({
            used: true,
            usedBy: JSON.parse(localStorage.getItem('student_profile')).name,
            usedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Set Local Storage
        localStorage.setItem('unlocked_' + studentYear, 'true');

        alert('تم تفعيل السنة الدراسية بنجاح! استمتع بالمشاهدة');

        // Refresh Content
        initDashboard();

    } catch (err) {
        console.error(err);
        alert('حدث خطأ في الاتصال.. حاول مرة أخرى');
        btn.disabled = false;
        btn.innerText = 'تفعيل';
    }
}
