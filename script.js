(() => {
    'use strict';

    // ===== Vault =====
    const _v = [
        'WklZMXpYWlNLWFRXcnptdWZYTjVTQzBwWUYzYnlkR1dIQk80YWRlbmVSb2IzYjkyOEU2TV9rc2c=',
        'd3cxYnNrN3Z2VTVORUV5Z3FSVVJaZGlLZHdOY0lrTFVVV083c1Q1VnF5U0k2TlI4YkEuUUE='
    ];
    function _d(i) { return atob(_v[i]).split('').reverse().join(''); }

    // ===== i18n =====
    const LANG = {
        es: {
            nav_chat: 'Chat AI', nav_images: 'Imágenes',
            model_fache_sub: 'V1',
            btn_new: 'Nueva conversación',
            sb_sections: 'SECCIONES', sb_models: 'MODELOS', lang_label: 'Español',
            welcome_title: '¿En qué puedo ayudarte?',
            welcome_sub: 'Elige un modelo y empieza a chatear',
            chip1: '', chip2: '', chip3: '', chip4: '',
            input_placeholder: 'Escribe tu mensaje...',
            img_title: 'Generador de Imágenes V1', img_sub: 'Describe lo que quieres y genera imágenes con IA',
            img_placeholder: 'Describe la imagen... (mejor en inglés)',
            style_auto: 'Auto', style_real: 'Realista', style_anime: 'Anime', style_3d: '3D Render', style_digital: 'Arte Digital',
            btn_gen: 'Generar',
            gallery_empty: 'Las imágenes aparecerán aquí',
            generating: 'Generando...', gen_img_text: 'Generando imagen...',
        },
        en: {
            nav_chat: 'Chat AI', nav_images: 'Images',
            model_fache_sub: 'V1',
            btn_new: 'New conversation',
            sb_sections: 'SECTIONS', sb_models: 'MODELS', lang_label: 'English',
            welcome_title: 'How can I help you?',
            welcome_sub: 'Choose a model and start chatting',
            chip1: '', chip2: '', chip3: '', chip4: '',
            input_placeholder: 'Type your message...',
            img_title: 'Image Generator V1', img_sub: 'Describe what you want and generate images with AI',
            img_placeholder: 'Describe the image you want...',
            style_auto: 'Auto', style_real: 'Realistic', style_anime: 'Anime', style_3d: '3D Render', style_digital: 'Digital Art',
            btn_gen: 'Generate',
            gallery_empty: 'Your images will appear here',
            generating: 'Generating...', gen_img_text: 'Generating image...',
        }
    };

    let lang = localStorage.getItem('hanfa_lang') || 'es';

    function applyLang() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (LANG[lang][key]) el.textContent = LANG[lang][key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (LANG[lang][key]) el.placeholder = LANG[lang][key];
        });
        const flag = document.getElementById('lang-flag');
        const code = document.getElementById('lang-code');
        if (flag) flag.textContent = lang === 'es' ? '🇪🇸' : '🇬🇧';
        if (code) code.textContent = lang.toUpperCase();
    }

    document.getElementById('lang-toggle').addEventListener('click', () => {
        lang = lang === 'es' ? 'en' : 'es';
        localStorage.setItem('hanfa_lang', lang);
        applyLang();
        renderHistory();
    });

    // ===== State =====
    const state = { model: 'groq', section: 'chat', history: { groq: [], gemini: [] }, busy: false, busyImg: false };

    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    const el = {
        navBtns: $$('.sb-nav-btn'), panels: $$('.panel'), modelBtns: $$('.sb-model'),
        msgs: $('#messages'), input: $('#chat-input'), sendBtn: $('#btn-send'),
        modelLabel: $('#model-label'),
        imgPrompt: $('#img-prompt'),
        genBtn: $('#btn-gen'), gallery: $('#gallery'),
        toasts: $('#toasts'), newBtn: $('#btn-new'),
        sidebar: $('#sidebar'), overlay: $('#sidebar-overlay'),
        mobileMenuBtn: $('#mobile-menu-btn'),
        modelsSection: $('.sb-models'),
        modelsLabel: document.querySelectorAll('.sb-section-label')[1],
    };

    // ===== Mobile Menu =====
    function openSidebar() { el.sidebar.classList.add('open'); el.overlay.classList.add('open'); }
    function closeSidebar() { el.sidebar.classList.remove('open'); el.overlay.classList.remove('open'); }
    el.mobileMenuBtn.addEventListener('click', openSidebar);
    el.overlay.addEventListener('click', closeSidebar);

    // ===== Nav =====
    function updateSidebarForSection(s) {
        state.section = s;
        // Hide model selector when on images
        const show = s === 'chat';
        if (el.modelsSection) el.modelsSection.style.display = show ? '' : 'none';
        if (el.modelsLabel) el.modelsLabel.style.display = show ? '' : 'none';
    }

    el.navBtns.forEach(b => b.addEventListener('click', () => {
        const s = b.dataset.section;
        el.navBtns.forEach(n => n.classList.toggle('active', n.dataset.section === s));
        el.panels.forEach(p => p.classList.toggle('active', p.id === `panel-${s}`));
        updateSidebarForSection(s);
        closeSidebar();
    }));

    // ===== Model =====
    function setModel(m) {
        state.model = m;
        el.modelBtns.forEach(b => b.classList.toggle('active', b.dataset.model === m));
        el.modelLabel.textContent = m === 'groq' ? 'FacheAI' : 'Gemini 2.5 Pro/Flash';
        closeSidebar();
        renderHistory();
    }
    el.modelBtns.forEach(b => b.addEventListener('click', () => setModel(b.dataset.model)));

    // ===== New Chat =====
    el.newBtn.addEventListener('click', () => {
        state.history[state.model] = [];
        renderHistory();
        // Switch to chat if on images
        if (state.section !== 'chat') {
            el.navBtns.forEach(n => n.classList.toggle('active', n.dataset.section === 'chat'));
            el.panels.forEach(p => p.classList.toggle('active', p.id === 'panel-chat'));
            updateSidebarForSection('chat');
        }
        closeSidebar();
        el.input.focus();
    });

    // ===== Input =====
    el.input.addEventListener('input', () => {
        el.input.style.height = 'auto';
        el.input.style.height = Math.min(el.input.scrollHeight, 130) + 'px';
        // Removed char count
    });
    el.input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    el.sendBtn.addEventListener('click', send);

    // ===== Render =====
    function renderHistory() {
        const h = state.history[state.model];
        if (!h.length) { el.msgs.innerHTML = welcomeHTML(); return; }
        el.msgs.innerHTML = '';
        h.forEach(m => addBubble(m.role, m.content, false));
        scroll();
    }

    function welcomeHTML() {
        const L = LANG[lang];
        const modelName = state.model === 'groq' ? 'FacheAI' : 'Gemini 2.5';
        return `<div class="welcome" id="welcome">
            <div class="w-pill">HanFa AI</div>
            <h2>${L.welcome_title}</h2>
            <p>${modelName}</p>
        </div>`;
    }

    // Avatar helpers
    function avatarHTML(role) {
        if (role === 'user') return '<div class="msg-av av-user">👤</div>';
        if (state.model === 'gemini') {
            return '<div class="msg-av av-gemini"><svg viewBox="0 0 24 24" width="28" height="28"><defs><linearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ea4335" /><stop offset="50%" stop-color="#4285f4" /><stop offset="100%" stop-color="#34a853" /></linearGradient></defs><path d="M12 0 C 12 10 14 12 24 12 C 14 12 12 14 12 24 C 12 14 10 12 0 12 C 10 12 12 10 12 0 Z" fill="url(#gGrad)"/></svg></div>';
        }
        return '<div class="msg-av av-fache"><svg viewBox="-5 -5 110 110" width="28" height="28" fill="none" stroke="#8c9096" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M 80 100 L 90 100 A 10 10 0 0 0 100 90 L 100 10 A 10 10 0 0 0 90 0 L 10 0 A 10 10 0 0 0 0 10 L 0 90 A 10 10 0 0 0 10 100 L 75 100 A 10 10 0 0 0 85 90 L 85 25 A 10 10 0 0 0 75 15 L 25 15 A 10 10 0 0 0 15 25 L 15 75 A 10 10 0 0 0 25 85 L 60 85" /><text x="50" y="65" font-family="Arial, sans-serif" font-weight="900" font-size="38" fill="#8c9096" stroke="none" text-anchor="middle">FA</text></svg></div>';
    }

    function addBubble(role, content, anim = true) {
        const d = document.createElement('div');
        d.className = `msg ${role === 'user' ? 'msg-user' : 'msg-ai'}`;
        if (!anim) d.style.animation = 'none';
        d.innerHTML = `${avatarHTML(role)}<div class="msg-body">${fmt(content)}</div>`;
        el.msgs.appendChild(d);
    }

    function showTyping() {
        const d = document.createElement('div');
        d.className = 'msg msg-ai'; d.id = 'typing-el';
        d.innerHTML = `${avatarHTML('assistant')}<div class="msg-body"><div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
        el.msgs.appendChild(d); scroll();
    }
    function hideTyping() { const t = $('#typing-el'); if (t) t.remove(); }

    function fmt(t) {
        let h = t;
        h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_, l, c) => `<pre><code class="lang-${l}">${esc(c.trim())}</code></pre>`);
        h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
        h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
        h = h.split('\n\n').map(p => `<p>${p}</p>`).join('');
        h = h.replace(/\n/g, '<br>');
        return h;
    }
    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function scroll() { requestAnimationFrame(() => { el.msgs.scrollTop = el.msgs.scrollHeight; }); }

    // ===== Send =====
    async function send() {
        const text = el.input.value.trim();
        if (!text || state.busy) return;

        const m = state.model;
        const w = el.msgs.querySelector('.welcome');
        if (w) w.remove();

        state.history[m].push({ role: 'user', content: text });
        addBubble('user', text); scroll();

        el.input.value = ''; el.input.style.height = 'auto';
        state.busy = true; el.sendBtn.disabled = true; showTyping();

        try {
            const reply = m === 'groq' ? await apiGroq(state.history[m]) : await apiGemini(state.history[m]);
            hideTyping();
            state.history[m].push({ role: 'assistant', content: reply });
            addBubble('assistant', reply); scroll();
        } catch (e) {
            hideTyping();
            const errMsg = e.type === 'network' ? '🌐 **You Don\'t Have Internet**' : '⚠️ **Error Limit Reached**';
            state.history[m].push({ role: 'assistant', content: errMsg });
            addBubble('assistant', errMsg); scroll();
        } finally {
            state.busy = false; el.sendBtn.disabled = false; el.input.focus();
        }
    }

    // ===== FacheAI (Groq) =====
    async function apiGroq(history) {
        const k = _d(0);
        const msgs = [
            { role: 'system', content: 'You are FacheAI, an AI assistant created by FacheStudios. Your creator is FacheStudios. When asked who created you, who made you, or who your creator is, ALWAYS respond that you were created by FacheStudios. Your name is FacheAI. IMPORTANT: Always reply in the SAME language the user writes in. If they write in Spanish, reply in Spanish. If they write in English, reply in English. If they write in another language, reply in that language. If the message is nonsensical or has no clear language, reply in English. Be friendly, helpful and concise.' },
            ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        ];
        let r;
        try {
            r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` },
                body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, temperature: 0.7, max_tokens: 2048 }),
            });
        } catch { const e = new Error(); e.type = 'network'; throw e; }
        if (r.status === 429 || !r.ok) { const e = new Error(); e.type = 'limit'; throw e; }
        return (await r.json()).choices[0].message.content;
    }

    // ===== Gemini =====
    async function apiGemini(history) {
        const k = _d(1);
        const sys = 'You are HanFa AI powered by Gemini. If the user specifically asks who created you, who made you, or who your creator is, say Google. Do NOT mention Google unless asked. IMPORTANT: Always reply in the SAME language the user writes in. If they write in Spanish, reply in Spanish. If they write in English, reply in English. If the message is nonsensical or has no clear language, reply in English. Be concise but thorough.';
        const contents = history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        const body = JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } });

        const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];
        for (const mod of models) {
            let r;
            try {
                r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${k}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
                });
            } catch { const e = new Error(); e.type = 'network'; throw e; }
            if (r.ok) {
                const d = await r.json();
                const c = d.candidates?.[0];
                if (c) return c.content.parts.map(p => p.text).join('');
            }
            if (r.status === 429 && mod === 'gemini-2.5-pro') continue;
            if (mod === models[models.length - 1]) { const e = new Error(); e.type = 'limit'; throw e; }
        }
        const e = new Error(); e.type = 'limit'; throw e;
    }

    // ===== Image Generation (AI Horde / Stable Horde) =====
    // Free community GPU cluster. No API key required.
    // Async flow: POST submit → poll status → GET result (base64 image).
    const HORDE_API = 'https://stablehorde.net/api/v2';
    const HORDE_KEY = '0000000000'; // anonymous

    el.genBtn.addEventListener('click', genImage);

    async function genImage() {
        const prompt = el.imgPrompt.value.trim();
        if (!prompt || state.busyImg) return;

        state.busyImg = true;
        el.genBtn.disabled = true;
        el.genBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> ${LANG[lang].generating}`;

        const empty = el.gallery.querySelector('.gallery-empty');
        if (empty) empty.remove();

        // Loading card
        const card = document.createElement('div');
        card.className = 'g-loading';
        card.innerHTML = `<div class="g-load-inner"><div class="spinner"></div><span class="g-load-text">${LANG[lang].gen_img_text}</span></div>`;
        el.gallery.prepend(card);

        const loadText = card.querySelector('.g-load-text');

        // Auto-translate prompt to English for better image results
        let englishPrompt = prompt;
        try {
            if (loadText) loadText.textContent = lang === 'es' ? 'Traduciendo...' : 'Translating...';
            const k = _d(0);
            const tr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are a translator. Translate the user text to English. If it is already in English, return it as-is. Output ONLY the translated text, nothing else. No quotes, no explanation.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1, max_tokens: 256
                }),
            });
            if (tr.ok) {
                const d = await tr.json();
                const translated = d.choices?.[0]?.message?.content?.trim();
                if (translated) englishPrompt = translated;
            }
        } catch { /* use original */ }

        if (loadText) loadText.textContent = LANG[lang].gen_img_text;
        const full = englishPrompt;

        // Forced size for best SDXL results
        const w = 1024;
        const h = 1024;

        try {
            // 1. Submit async job
            const submitR = await fetch(`${HORDE_API}/generate/async`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': HORDE_KEY },
                body: JSON.stringify({
                    prompt: full,
                    params: { width: w, height: h, steps: 20, cfg_scale: 7, sampler_name: 'k_euler_a' },
                    nsfw: false,
                    censor_nsfw: true,
                    models: ['AlbedoBase XL (SDXL)'],
                    r2: true,
                    shared: false,
                }),
            });

            if (!submitR.ok) throw new Error('submit');
            const submitData = await submitR.json();
            const jobId = submitData.id;
            if (!jobId) throw new Error('no-id');

            // 2. Poll for completion
            let done = false;
            let attempts = 0;
            const maxAttempts = 120; // ~10 minutes max

            while (!done && attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 5000));
                attempts++;

                const checkR = await fetch(`${HORDE_API}/generate/check/${jobId}`);
                if (!checkR.ok) continue;
                const status = await checkR.json();

                // Update loading text with queue info
                if (loadText) {
                    const pos = status.queue_position || 0;
                    const wait = status.wait_time || 0;
                    const mins = Math.ceil(wait / 60);
                    if (status.processing > 0) {
                        loadText.textContent = lang === 'es' ? 'Procesando imagen...' : 'Processing image...';
                    } else if (pos > 0) {
                        loadText.textContent = lang === 'es'
                            ? `Cola: #${pos} · ~${mins} min`
                            : `Queue: #${pos} · ~${mins} min`;
                    }
                }

                if (status.done) {
                    done = true;
                    break;
                }
                if (status.faulted) throw new Error('faulted');
            }

            if (!done) throw new Error('timeout');

            // 3. Get the result
            const resultR = await fetch(`${HORDE_API}/generate/status/${jobId}`);
            if (!resultR.ok) throw new Error('result');
            const result = await resultR.json();
            const gen = result.generations?.[0];
            if (!gen) throw new Error('no-gen');

            // The image is either a URL (r2) or base64
            const imgSrc = gen.img;

            // Create gallery item
            const gi = document.createElement('div');
            gi.className = 'g-item';

            const img = document.createElement('img');
            // If it starts with http, it's a URL; otherwise it's base64
            if (imgSrc.startsWith('http')) {
                img.src = imgSrc;
            } else {
                img.src = `data:image/webp;base64,${imgSrc}`;
            }
            img.alt = esc(prompt);
            img.style.width = '100%';
            img.style.display = 'block';
            gi.appendChild(img);

            const ov = document.createElement('div');
            ov.className = 'g-item-overlay';
            ov.innerHTML = `<p class="g-item-prompt">${esc(prompt)}</p>`;
            gi.appendChild(ov);

            card.replaceWith(gi);

        } catch (err) {
            card.remove();
            restoreGallery();
        }

        resetGen();
    }

    function restoreGallery() {
        if (!el.gallery.children.length) {
            el.gallery.innerHTML = `<div class="gallery-empty"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1" opacity=".2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>${LANG[lang].gallery_empty}</span></div>`;
        }
    }

    function resetGen() {
        state.busyImg = false;
        el.genBtn.disabled = false;
        el.genBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> ${LANG[lang].btn_gen}`;
    }

    // ===== Init =====
    applyLang();
    updateSidebarForSection('chat');
    setTimeout(() => el.input.focus(), 200);
})();

