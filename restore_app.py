import sys

# Define the new Javascript code block to insert
js_code_block = """
/** Global Dispatcher with UI Intelligence **/
function handleGlobalScanDispatch(code) {
    const isGrading = document.getElementById('fast-grading-section').style.display === 'block';
    const isFollowup = document.getElementById('followup-section').style.display === 'block';

    // 1. AUTO-SAVE (Context: Fast Grading)
    // If scanning student B while a mark for student A is typed, SAVE student A first.
    if (isGrading && currentFastStudent) {
        const inputEl = document.getElementById('fast-mark-input');
        const examId = document.getElementById('fast-exam-select').value;
        const markVal = inputEl ? inputEl.value.trim() : "";
        if (markVal !== "" && !isNaN(parseFloat(markVal))) {
            processAndSaveGrade(currentFastStudent, examId, parseFloat(markVal));
        }
    }

    // 2. AUTO-OPEN PROFILE (Visual Confirmation)
    // Always show the Smart Card for visual feedback when scanning (unless in specific modes that have their own UI)
    const s = db.students.find(x => (x.qrCode === code || (code.length >= 8 && code.includes(x.qrCode))) && String(x.grade) === String(currentGrade));
    if (s && !isGrading) {
        openSmartCard(s.id);
    }

    // 3. LOGIC DISPATCH
    if (isGrading) {
        processFastScan(code);
    } else if (isFollowup) {
        handleExamAttendanceScan(code);
    } else {
        processScan(code);
    }

    // UI Monitor Ping
    const mon = document.getElementById('scanner-monitor');
    if (mon) {
        mon.style.display = 'block';
        mon.innerHTML = `<i class='fas fa-barcode' style='color:#10b981'></i> جاري المعالجة: <span style='color:#fff'>${code}</span>`;
        setTimeout(() => mon.style.display = 'none', 1500);
    }
}

function processScan(token) {
    if (typeof token === 'object' && token.decodedText) token = token.decodedText;
    const cleanToken = token.trim();
    let student = db.students.find(s => s.qrCode === cleanToken);
    if (!student) {
        student = db.students.find(s => cleanToken.includes(s.qrCode) || s.qrCode.includes(cleanToken));
    }

    if (!student) {
        showNotification(`كود غير مسجل: ${cleanToken}`, 'warning');
        return;
    }

    // --- STRICT CONTEXT CHECK: Only allow students from CURRENT GRADE ---
    if (String(student.grade) !== String(currentGrade)) {
        const studentGradeObj = gradesList.find(g => g.id == student.grade);
        playSound('error');
        showNotification(`🛑 خطأ: الطالب ${student.name} مقيد في (${studentGradeObj ? studentGradeObj.name : 'سنة أخرى'}). يرجى التبديل للسنة الدراسية الصحيحة أولاً.`, 'error');
        return;
    }

    // --- STRICT GROUP CHECK ---
    const rawSessionId = activePortalGroupId || currentGroupId;
    let isGroupMatched = false;
    let sessionGroupIdForRecord = rawSessionId;

    if (String(rawSessionId).startsWith('joint:')) {
        const allowedGroupIds = rawSessionId.split(':')[1].split(',');
        isGroupMatched = allowedGroupIds.includes(String(student.groupId));
        sessionGroupIdForRecord = student.groupId; // NEW: Record under original group on Joint Days
    } else {
        isGroupMatched = String(student.groupId) === String(rawSessionId);
        sessionGroupIdForRecord = rawSessionId;
    }

    if (!isGroupMatched) {
        const studentGroupObj = db.groups.find(g => g.id == student.groupId);
        playSound('error');
        showNotification(`⚠️ تنبيه: الطالب ${student.name} مقيد في مجموعة (${studentGroupObj ? studentGroupObj.name : 'أخرى'}) وليس في هذه الجلسة.`, 'warning');
    }

    // 3. Success! Visual feedback for the teacher
    const mon = document.getElementById('scanner-monitor');
    if (mon) {
        mon.innerHTML = `<i class='fas fa-check-double' style='color:#10b981'></i> تم التعرف: <span style='color:#fff'>${student.name}</span>`;
    }

    // --- NEW: Always open Smart Card for visual confirmation as requested ---
    openSmartCard(student.id);

    const todayStr = new Date().toLocaleDateString('en-CA');

    // --- NEW: Block Scanning if subscription is not active ---
    if (!db.settings.isMonthlyActive) {
        playSound('error');
        showNotification('🛑 تنبيه: يرجى تفعيل "بدء الاشتراك" من قسم الخزينة أولاً لتتمكن من رصد الحضور', 'error');
        return;
    }

    // --- 4. Permanent Attendance Logic ---

    // التحقق من الجلسة الحالية فقط (مش كل اليوم)
    const alreadyInSession = currentSessionAttendance.some(s => s.id === student.id);

    if (alreadyInSession) {
        // مسجل في نفس الجلسة → تحذير فقط بدون alert
        playSound('error');
        showNotification(`⚠️ ${student.name} مسجل مسبقاً في هذه الجلسة`, 'warning');
        if (document.getElementById('voice-feedback-toggle')?.checked) {
            const msg = new SpeechSynthesisUtterance();
            msg.text = 'تم تسجيله من قبل';
            msg.lang = 'ar-SA';
            window.speechSynthesis.speak(msg);
        }
        openSmartCard(student.id);
        return;
    }

    // مش في الجلسة الحالية → سجّله حتى لو كان في جلسة سابقة نفس اليوم
    let todayRecord = db.attendance.find(a =>
        a.studentId == student.id &&
        new Date(a.date).toLocaleDateString('en-CA') === todayStr
    );

    if (todayRecord) {
        todayRecord.status = 'present';
        todayRecord.date = new Date().toISOString();
        todayRecord.groupId = sessionGroupIdForRecord;
    } else {
        db.attendance.push({
            id: Date.now(),
            studentId: student.id,
            groupId: sessionGroupIdForRecord,
            date: new Date().toISOString(),
            status: 'present'
        });
        student.points = (student.points || 0) + 5;
    }

    showNotification(`تم رصد حضور: ${student.name} ✅`, 'success');

    currentSessionAttendance.unshift({ ...student, scanTime: new Date().toISOString() });
    db.currentSessionAttendance = currentSessionAttendance;
    renderSessionTable();

    // --- 5. Mode Specific Logic ---
    const isAttendanceSection = document.getElementById('attendance-section').style.display === 'block';

    const hasPaidCurrentCycle = db.payments.some(p =>
        p.studentId == student.id &&
        p.category === 'اشتراك شهري' &&
        p.cycleId == db.settings.activeCycle
    );

    // Group Warning
    const studentGroup = db.groups.find(g => g.id == student.groupId);
    if (!isGroupMatched) {
        showNotification(`⚠️ تنبيه: ${student.name} ينتمي لمجموعة (${studentGroup ? studentGroup.name : 'أخرى'})`, 'warning');
    }

    // Smart Handout Distribution
    if (activeHandoutId) {
        const alreadyHasHandout = db.studentHandouts.some(sh => sh.studentId == student.id && sh.handoutId === activeHandoutId);
        if (!alreadyHasHandout) {
            db.studentHandouts.push({
                id: Date.now(),
                studentId: student.id,
                handoutId: activeHandoutId,
                date: new Date().toISOString()
            });
            showNotification(`تم تسليم الملزمة لـ ${student.name}`, 'success');
        }
    }

    db.save();

    // Auto-update Absence Report if visible
    if (document.getElementById('absence-section').style.display === 'block') {
        generateAbsenceReport();
    }

    // 7. Open Smart Card UI
    openSmartCard(student.id);

    // Voice Feedback
    playSound('success');
    speakName(student.name);
}

function searchStudentSmart(query) {
    const results = document.getElementById('attendance-manual-results');
    if (!query || query.trim().length < 1) {
        results.style.display = 'none';
        results.innerHTML = '';
        return;
    }

    // Get active context robustly using unified keys
    const activeGrade = currentGrade || localStorage.getItem('edu_active_grade');
    const activeGroup = currentGroupId || localStorage.getItem('edu_active_group');

    if (!activeGroup || activeGroup === 'all') {
        results.style.display = 'block';
        results.innerHTML = '<div class="result-item" style="color:var(--danger); justify-content:center;">⚠️ يرجى اختيار مجموعة أولاً من قائمة المجموعات أو لوحة التحكم</div>';
        return;
    }

    // Normalize Arabic for inclusive search
    const normalize = (text) => {
        return String(text)
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .toLowerCase()
            .trim();
    };

    const q = normalize(query);

    // --- NEW: Block Search selection if subscription is not active ---
    if (!db.settings.isMonthlyActive) {
        results.style.display = 'block';
        results.innerHTML = '<div class="result-item" style="color:var(--danger); justify-content:center;">⚠️ يرجى تفعيل الاشتراك من الخزينة أولاً</div>';
        return;
    }

    const matchedStudents = db.students.filter(s => {
        return String(s.grade) === String(activeGrade) &&
            String(s.groupId) === String(activeGroup) &&
            (normalize(s.name).includes(q) || String(s.qrCode).startsWith(query));
    }).slice(0, 5);

    if (matchedStudents.length > 0) {
        results.style.display = 'block';
        results.innerHTML = matchedStudents.map(s => `
            <div class="result-item" onclick="recordQuickAction(${s.id}, 'attendance'); openSmartCard(${s.id});">
                <div style="text-align:right;">
                    <div style="font-weight:700; color:var(--primary);">${s.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${s.qrCode}</div>
                </div>
                <i class="fas fa-plus-circle" style="color:var(--accent);"></i>
            </div>
        `).join('');
    } else {
        results.style.display = 'block';
        results.innerHTML = '<div class="result-item" style="color:var(--text-muted); justify-content:center;">لا يوجد نتائج لهذه المجموعة</div>';
    }
}

function openSmartCard(studentId) {
    const s = db.students.find(x => x.id == studentId);
    if (!s) return;

    // Reset Search
    document.getElementById('attendance-manual-results').style.display = 'none';
    document.getElementById('manual-student-entry').value = '';

    // 1. Fetch History & Context (Check latest archived session first)
    const todayStr = new Date().toLocaleDateString('en-CA');
    const groupSessions = (db.absenceSessions || [])
        .filter(sess => String(sess.groupId) === String(s.groupId) && new Date(sess.date).toLocaleDateString('en-CA') !== todayStr)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    let lastAttStatus = null;
    if (groupSessions.length > 0) {
        const lastSession = groupSessions[0];
        if (lastSession.presentIds && lastSession.presentIds.includes(s.id)) lastAttStatus = 'present';
        else if (lastSession.absentIds && lastSession.absentIds.includes(s.id)) lastAttStatus = 'absent';
        else if (lastSession.presentNames && lastSession.presentNames.includes(s.name)) lastAttStatus = 'present';
        else if (lastSession.absenteeNames && lastSession.absenteeNames.includes(s.name)) lastAttStatus = 'absent';
    }

    const lastAttFromLegacy = db.attendance
        .filter(a => a.studentId == s.id && new Date(a.date).toLocaleDateString('en-CA') !== todayStr)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    // Determine the status to display
    const finalStatus = lastAttStatus || (lastAttFromLegacy ? lastAttFromLegacy.status : null);

    const currentCycleId = db.settings.activeCycle;
    const payment = db.payments.find(p =>
        p.studentId == s.id &&
        p.category === 'اشتراك شهري' &&
        p.cycleId == currentCycleId
    );
    const isPaid = !!payment;
    const isExemption = payment?.isExemption;

    // 2. Render Card
    const container = document.getElementById('smart-card-content');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 0.5rem;">
            <div class="avatar" style="width: 100px; height: 100px; font-size: 3rem; margin: 0 auto 1rem; background: var(--bg-hover); color: var(--accent); border: 2px solid var(--accent);">
                ${s.name.charAt(0)}
            </div> 
            <h2 style="margin-bottom: 0.5rem; color: var(--text-main);">${s.name}</h2>
            <div style="display:flex; justify-content:center; gap:8px; margin-bottom:1.5rem;">
                <span class="status-badge" style="background:var(--bg-light);">كود: ${s.qrCode}</span>
                <span class="status-badge" style="background:#fef3c7; color:#92400e;">${s.points || 0} نقطة 💎</span>
            </div>

            <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div class="card" style="padding:1rem; border:2px solid ${finalStatus === 'absent' ? 'var(--danger)' : 'var(--accent)'};">
                    <small style="color:var(--text-muted)">الحصة السابقة</small>
                    <div style="font-weight:700; color:${finalStatus === 'absent' ? 'var(--danger)' : 'var(--accent)'}">${finalStatus ? (finalStatus === 'present' ? 'حضور ✅' : 'غياب ❌') : 'أول حضور'}</div>
                </div>
                <div class="card" style="padding:1rem; border:2px solid ${isPaid ? (isExemption ? 'var(--border)' : 'var(--accent)') : 'var(--danger)'};">
                    <small style="color:var(--text-muted)">اشتراك الشهر</small>
                    <div style="font-weight:700; color:${isPaid ? (isExemption ? 'var(--text-muted)' : 'var(--accent)') : 'var(--danger)'}">${isPaid ? (isExemption ? 'معفي ✅' : 'خالص ✅') : 'غير خالص ⏳'}</div>
                </div>
            </div>

            <!-- Quick Action Buttons -->
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 1rem;">
                <button class="btn btn-primary" style="height: 60px; border-radius: 12px; font-size: 1.1rem; background: var(--accent); box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.3);"
                    onclick="recordQuickAction(${s.id}, 'attendance'); openSmartCard(${s.id});">
                    <i class="fas fa-user-check"></i> تسجيل حضور
                </button>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    ${isPaid && !isExemption ? `
                    <button class="btn btn-payment" style="height: 60px; border-radius: 12px; font-size: 1.1rem; background: var(--accent); color: white;"
                        onclick="showReceiptForStudent(${s.id})">
                        <i class="fas fa-print"></i> طباعة الوصل
                    </button>
                    ` : `
                    <button class="btn btn-payment" style="height: 60px; border-radius: 12px; font-size: 1.1rem;"
                        onclick="recordQuickAction(${s.id}, 'payment'); openSmartCard(${s.id});">
                        <i class="fas fa-money-bill-wave"></i> دفع اشتراك
                    </button>
                    `}
                    <button class="btn btn-payment" style="height: 60px; border-radius: 12px; font-size: 1.1rem; background: var(--vibrant-orange);"
                        onclick="recordQuickAction(${s.id}, 'handout'); openSmartCard(${s.id});">
                        <i class="fas fa-book"></i> دفع ملزمة
                    </button>
                </div>
                
                ${!isPaid ? `
                <button class="btn" style="height: 45px; border-radius: 12px; background: #f5f3ff; border: 1px solid #ddd6fe; color: #7c3aed; font-weight: 700; box-shadow: 0 4px 12px -2px rgba(124, 58, 237, 0.15);"
                    onclick="exemptMonthlyPayment(${s.id}); openSmartCard(${s.id});">
                    <i class="fas fa-hand-holding-heart"></i> عمل إعفاء لهذا الطالب (يتيم / حالة خاصة)
                </button>
                <button class="btn" style="height: 45px; border-radius: 12px; background: #fff7ed; border: 1px solid #fed7aa; color: #ea580c; font-weight: 700; box-shadow: 0 4px 12px -2px rgba(234, 88, 12, 0.1);"
                    onclick="discountMonthlyPayment(${s.id}); openSmartCard(${s.id});">
                    <i class="fas fa-tags"></i> عمل خصم على الاشتراك (جزئي)
                </button>
                ` : ''}
            </div>

            <button class="btn" style="width:100%; height:50px; background:var(--bg-light); border-radius:15px; border: 1px solid var(--border);" 
                onclick="toggleModal('smart-card-modal', false)">إغلاق النافذة</button>
        </div>
    `;

    // Apply session mode if a session is currently running to allow non-blocking scanning
    const overlay = document.getElementById('smart-card-modal');
    if (isLessonCodingActive && !isLessonCodingPaused) {
        overlay.classList.add('session-mode');
    } else {
        overlay.classList.remove('session-mode');
    }

    toggleModal('smart-card-modal', true);
}

// Function to handle the new action buttons
function recordQuickAction(studentId, action) {
    const s = db.students.find(x => x.id == studentId);
    if (!s) return;

    const todayStr = new Date().toLocaleDateString('en-CA');
    const activeGroup = currentGroupId || localStorage.getItem('edu_active_group');

    # --- NEW: Block Quick Action if subscription is not active ---
    if (!db.settings.isMonthlyActive) {
        playSound('error');
        showNotification('🛑 تنبيه: يرجى تفعيل "بدء الاشتراك" من قسم الخزينة أولاً لتتمكن من رصد الحضور', 'error');
        return;
    }

    // 1. Handle Attendance
    if (action === 'attendance' || action === 'both') {
        const alreadyInSession = currentSessionAttendance.some(att => att.id === s.id);

        if (alreadyInSession) {
            // مسجل في نفس الجلسة الحالية فقط
            playSound('error');
            showNotification(`⚠️ ${s.name} مسجل مسبقاً في هذه الجلسة`, 'warning');
            if (document.getElementById('voice-feedback-toggle')?.checked) {
                const msg = new SpeechSynthesisUtterance();
                msg.text = 'تم تسجيله من قبل';
                msg.lang = 'ar-SA';
                window.speechSynthesis.speak(msg);
            }
        } else {
            // مش في الجلسة → سجّله حتى لو كان في جلسة سابقة نفس اليوم
            let todayRecord = db.attendance.find(a =>
                a.studentId == s.id &&
                new Date(a.date).toLocaleDateString('en-CA') === todayStr
            );

            if (todayRecord) {
                todayRecord.status = 'present';
                todayRecord.date = new Date().toISOString();
                todayRecord.groupId = activeGroup;
            } else {
                db.attendance.push({
                    id: Date.now(),
                    studentId: s.id,
                    groupId: activeGroup,
                    date: new Date().toISOString(),
                    status: 'present'
                });
                s.points = (s.points || 0) + 5;
            }

            currentSessionAttendance.unshift({ ...s, scanTime: new Date().toISOString() });
            renderSessionTable();
            showNotification(`تم تسجيل حضور: ${s.name} ✅`, 'success');

            if (action === 'attendance') {
                playSound('success');
                speakName(s.name);
            }
        }
    }

    // 2. Handle Payment
    if (action === 'payment' || action === 'both') {
        const hasPaid = db.payments.some(p =>
            p.studentId == s.id &&
            p.category === 'اشتراك شهري' &&
            p.cycleId == db.settings.activeCycle
        );

        if (!hasPaid) {
            if (!db.settings.activeCycle) {
                // Auto start cycle if not exists
                db.settings.isMonthlyActive = true;
                db.settings.activeCycle = Date.now();
                db.settings.monthlyFee = db.settings.monthlyFee || 100; // default
            }

            const receiptCode = 'REC-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000);
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const paymentRecord = {
                id: Date.now() + 1, // small offset to avoid duplicate ID
                studentId: s.id,
                amount: db.settings.monthlyFee,
                month: currentMonth,
                year: currentYear,
                date: new Date().toISOString(),
                category: 'اشتراك شهري',
                cycleId: db.settings.activeCycle,
                cycleName: db.settings.activeCycleName || `شهر ${currentMonth}/${currentYear}`,
                receiptCode: receiptCode
            };

            db.payments.push(paymentRecord);
            db.save();
            showNotification(`تم تسجيل دفع الاشتراك لـ ${s.name} 💸`, 'success');

            // Voice Feedback
            playSound('success');
            if (action === 'both') speakName(`${s.name}. تم تسجيل الحضور والدفع`);
            else speakName(`${s.name}. تم تسجيل الدفع`);

            // Show printing dialog
            showReceiptPrintDialog(paymentRecord, s);
        } else {
            // Find existing payment and show receipt dialog
            const existingPayment = db.payments.find(p =>
                p.studentId == s.id &&
                p.category === 'اشتراك شهري' &&
                p.cycleId == db.settings.activeCycle
            );
            if (existingPayment) {
                showReceiptPrintDialog(existingPayment, s);
            } else {
                showNotification(`الطالب دفع الاشتراك مسبقاً`, 'warning');
                playSound('error');
            }
        }
    }

    // 3. Handle Handout/Material Payment
    if (action === 'handout') {
        const amount = prompt('أدخل سعر الملزمة/المذكرة (ج.م):', 20);
        if (amount === null) return;

        db.payments.push({
            id: Date.now(),
            studentId: s.id,
            amount: parseInt(amount) || 0,
            date: new Date().toISOString(),
            category: 'ملزمة/مذكرة',
            cycleId: db.settings.activeCycle || 'misc'
        });
        showNotification(`تم تسجيل دفع الملزمة لـ ${s.name} ✅`, 'success');
        playSound('success');
        speakName(`${s.name}. تم تسجيل دفع الملزمة`);
        toggleModal('smart-card-modal', false);
    }

    db.save();
    // Don't close if we just wanted to mark both and see updated state
    // but for search results, we want to stay open, so we handle modal elsewhere if needed.
    // However, for consistency with 'attendance' which is now called from search:
    if (action !== 'attendance') {
        toggleModal('smart-card-modal', false);
    }

    // Refresh UI
    renderQuickAttendance();
    updateDashboardStats();
    if (document.getElementById('payments-section').style.display === 'block') {
        renderFinances();
    }
}

function showReceiptForStudent(studentId) {
    const s = db.students.find(x => x.id == studentId);
    if (!s) return;
    const payment = db.payments.find(p =>
        p.studentId == s.id &&
        p.category === 'اشتراك شهري' &&
        p.cycleId == db.settings.activeCycle
    );
    if (payment) {
        showReceiptPrintDialog(payment, s);
    } else {
        showNotification('لم يتم العثور على اشتراك نشط لهذا الطالب', 'warning');
    }
}
"""

with open('نظام ادراة الدروس 1/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Line 4114 before:", lines[4113][:100])
print("Line 4454 before:", lines[4453][:100])

# Replace lines 4114 to 4453 (which are list indexes 4113 to 4453-1)
lines[4113:4453] = [js_code_block + "\\n"]

with open('نظام ادراة الدروس 1/app.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Repair complete.")
