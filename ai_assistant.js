/**
 * Al-Amin AI Assistant
 * Handles Speech-to-Text, Text-to-Speech and Intelligent Responses
 */

class AlAminAI {
    constructor() {
        this.synth = window.speechSynthesis;
        this.recognition = null;
        this.isListening = false;
        this.messages = [];
        this.aiName = "الآمين";
        this.teacherName = "مستر عادل عكاشه";
        
        this.initRecognition();
        this.injectUI();
        this.addWelcomeMessage();
    }

    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'ar-SA';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateVoiceButton();
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateVoiceButton();
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('ai-input').value = transcript;
                this.sendMessage();
            };

            this.recognition.onerror = (event) => {
                console.error('Speech Recognition Error:', event.error);
                this.isListening = false;
                this.updateVoiceButton();
            };
        }
    }

    injectUI() {
        const html = `
            <div class="ai-bubble" id="ai-trigger" onclick="aiAssistant.toggleChat()">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-chat-window" id="ai-chat-window">
                <div class="ai-chat-header">
                    <div class="ai-header-info">
                        <div class="ai-avatar"><i class="fas fa-brain"></i></div>
                        <div>
                            <div class="ai-title">${this.aiName} - المساعد الذكي</div>
                            <div class="ai-status">متصل الآن</div>
                        </div>
                    </div>
                    <button class="quick-btn" onclick="aiAssistant.toggleChat()"><i class="fas fa-times"></i></button>
                </div>
                <div class="ai-chat-body" id="ai-chat-body"></div>
                <div class="ai-chat-footer">
                    <div class="ai-quick-actions">
                        <button class="quick-btn" onclick="aiAssistant.readPage()">📖 اقرأ لي الصفحة</button>
                        <button class="quick-btn" onclick="aiAssistant.handleQuickAction('ماذا يوجد اليوم؟')">📅 محاضراتي</button>
                        <button class="quick-btn" onclick="aiAssistant.handleQuickAction('كيف أبدأ؟')">❓ كيف أبدأ؟</button>
                    </div>
                    <div class="ai-input-wrapper">
                        <input type="text" class="ai-input" id="ai-input" placeholder="اسأل الآمين عن أي شيء..." onkeypress="if(event.key==='Enter') aiAssistant.sendMessage()">
                        <button class="ai-action-btn btn-voice" id="ai-voice-btn" onclick="aiAssistant.toggleVoice()">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button class="ai-action-btn btn-send" onclick="aiAssistant.sendMessage()">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    toggleChat() {
        const window = document.getElementById('ai-chat-window');
        window.classList.toggle('active');
        if (window.classList.contains('active')) {
            document.getElementById('ai-input').focus();
        }
    }

    addWelcomeMessage() {
        const student = JSON.parse(localStorage.getItem('student_session'));
        const name = student ? student.name.split(' ')[0] : 'يا بطل';
        this.addMessage(`أهلاً بك ${name}! أنا ${this.aiName}، مساعدك الشخصي في منصة ${this.teacherName}. كيف يمكنني مساعدتك اليوم؟`, 'ai');
    }

    addMessage(text, sender) {
        const body = document.getElementById('ai-chat-body');
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.textContent = text;
        body.appendChild(msgDiv);
        body.scrollTop = body.scrollHeight;

        if (sender === 'ai') {
            this.speak(text);
        }
    }

    sendMessage() {
        const input = document.getElementById('ai-input');
        const text = input.value.trim();
        if (!text) return;

        this.addMessage(text, 'user');
        input.value = '';

        this.processResponse(text);
    }

    handleQuickAction(text) {
        document.getElementById('ai-input').value = text;
        this.sendMessage();
    }

    async processResponse(text) {
        const lowerText = text.toLowerCase();
        let response = "";

        // Simple Rule-based engine for common queries
        if (lowerText.includes('مين') || lowerText.includes('من انت') || lowerText.includes('اسمك')) {
            response = `أنا ${this.aiName}، الذكاء الاصطناعي الخاص بمنصة ${this.teacherName}. هدفي مساعدتك في دراسة اللغة العربية بسهولة.`;
        } else if (lowerText.includes('محاضرات') || lowerText.includes('دروس') || lowerText.includes('فيديو')) {
            const count = appData.lessons ? appData.lessons.length : 0;
            response = `يوجد حالياً ${count} محاضرة متاحة على المنصة. يمكنك تصفحها في تبويب "الدروس المرئية".`;
        } else if (lowerText.includes('امتحان') || lowerText.includes('اختبار')) {
            const count = appData.quizzes ? appData.quizzes.length : 0;
            response = `لدينا ${count} اختباراً إلكترونياً لتقييم مستواك. ابحث عنها في قسم "الاختبارات".`;
        } else if (lowerText.includes('مذكرة') || lowerText.includes('ملف') || lowerText.includes('pdf')) {
            response = `جميع المذكرات والملخصات موجودة في قسم "المذكرات والملفات". يمكنك تحميلها مباشرة.`;
        } else if (lowerText.includes('عادل عكاشه')) {
            response = `${this.teacherName} هو خبير اللغة العربية وصانع هذا المحتوى التعليمي المتميز.`;
        } else if (lowerText.includes('شكرا') || lowerText.includes('شكراً')) {
            response = `العفو! أنا دائماً هنا لخدمتك. بالتوفيق في دراستك!`;
        } else {
            // Try to use window.ai if available (experimental Gemini Nano)
            if (window.ai && window.ai.createTextSession) {
                try {
                    const session = await window.ai.createTextSession();
                    response = await session.prompt(text + " (أجب باللغة العربية باختصار شديد بصفتك مساعد تعليمي)");
                } catch (e) {
                    response = "عذراً، لم أفهم طلبك تماماً. هل يمكنك إعادة صياغته؟ أو جرب الضغط على 'اقرأ لي الصفحة'.";
                }
            } else {
                response = "سؤال رائع! أنصحك بمتابعة المحاضرات بانتظام وحل الاختبارات بعد كل درس لضمان التفوق.";
            }
        }

        setTimeout(() => this.addMessage(response, 'ai'), 600);
    }

    toggleVoice() {
        if (!this.recognition) {
            alert('متصفحك لا يدعم التعرف على الصوت');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateVoiceButton() {
        const btn = document.getElementById('ai-voice-btn');
        if (this.isListening) {
            btn.classList.add('listening');
        } else {
            btn.classList.remove('listening');
        }
    }

    speak(text) {
        // Cancel any ongoing speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        
        // Find an Arabic voice
        const voices = this.synth.getVoices();
        const arabicVoice = voices.find(v => v.lang.includes('ar'));
        if (arabicVoice) utterance.voice = arabicVoice;
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        this.synth.speak(utterance);
    }

    readPage() {
        let pageContent = "";
        const title = document.title;
        
        if (window.location.pathname.includes('dashboard.html')) {
            const activeTab = document.querySelector('.tab-panel.active');
            const tabName = document.querySelector('.dash-tab-btn.active')?.textContent || "الدروس";
            const items = activeTab ? activeTab.querySelectorAll('.lesson-card') : [];
            
            if (items.length === 0) {
                pageContent = `أنا الآن في لوحة التحكم، قسم ${tabName}. يبدو أنه لا يوجد محتوى متاح هنا حالياً.`;
            } else {
                const itemNames = Array.from(items).slice(0, 5).map(i => i.querySelector('.lesson-teacher-name, h3')?.textContent).filter(Boolean);
                pageContent = `نحن الآن في قسم ${tabName}. يوجد هنا ${items.length} عنصراً. `;
                if (itemNames.length > 0) {
                    pageContent += `من أبرزها: ${itemNames.join('، و ')}.`;
                }
            }
        } else {
            // Landing Page
            const courses = document.querySelectorAll('.course-card');
            const features = document.querySelectorAll('.feature-card');
            
            pageContent = `أهلاً بك في الصفحة الرئيسية لمنصة ${this.teacherName}. `;
            pageContent += `تتميز المنصة بـ ${features.length} مميزات رئيسية، وتقدم دورات لـ ${courses.length} صفوف دراسية مختلفة. `;
            
            const firstCourse = courses[0]?.querySelector('h3')?.textContent;
            if (firstCourse) {
                pageContent += `أولى هذه الدورات هي ${firstCourse}. هل تود الانتقال لتسجيل الدخول؟`;
            }
        }

        this.addMessage(pageContent, 'ai');
    }
}

// Initialize the AI Assistant
const aiAssistant = new AlAminAI();
