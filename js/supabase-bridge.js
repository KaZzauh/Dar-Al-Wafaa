// ═══════════════════════════════════════════════════════════════
// js/supabase-bridge.js
// Cloud sync bridge for Dar Al-Wafaa school management system.
// Load AFTER the portal script AND after the Supabase library.
// ═══════════════════════════════════════════════════════════════
(function () {

    // ─── 1. Create the Supabase client ───
    const SUPABASE_URL = 'https://cxqvqvvkurwadfennkje.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_k_L7z1mZrPI4vTwg6iNvmA_EtNJafoE';

    if (!window.supabase) {
        console.error('[bridge] Supabase library not loaded. Add the <script> tag for @supabase/supabase-js.');
        return;
    }

    const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.db = db;
    console.log('[bridge] Supabase client ready');

    // ─── 2. Which portal are we in? ───
    const PORTAL =
        document.getElementById('teacherLoginOverlay')    ? 'teacher'    :
        document.getElementById('accountantLoginOverlay') ? 'accountant' :
                                                            'admin';

    // ─── 3. camelCase ↔ snake_case field mapping ───
    const TO_SNAKE = {
        admissionDate:  'admission_date',
        parentName:     'parent_name',
        parentContact:  'parent_contact',
        assignedClass:  'assigned_class',
        dateJoined:     'date_joined',
        canLogin:       'can_login',
        primaryColor:   'primary_color',
        classId:        'class_id',
        yearId:         'year_id',
        termId:         'term_id',
        categoryId:     'category_id',
        feeCategoryId:  'fee_category_id',
        paymentClass:   'payment_class',
        studentName:    'student_name',
        studentId:      'student_id',
        examId:         'exam_id',
        teacherId:      'teacher_id',
        teacherName:    'teacher_name',
        maxScore:       'max_score'
    };
    const TO_CAMEL = {};
    for (const k in TO_SNAKE) TO_CAMEL[TO_SNAKE[k]] = k;

    function objToRow(o) {
        const r = {};
        for (const k in o) {
            if (o[k] === undefined) continue;
            r[TO_SNAKE[k] || k] = o[k];
        }
        return r;
    }
    function rowToObj(r) {
        const o = {};
        for (const k in r) o[TO_CAMEL[k] || k] = r[k];
        return o;
    }

    // ─── 4. Variable name → Supabase table name ───
    const VAR_TO_TABLE = {
        students:        'students',
        teachers:        'teachers',
        accountants:     'accountants',
        classes:         'classes',
        subjects:        'subjects',
        exams:           'exams',
        examGrades:      'exam_grades',
        payments:        'payments',
        budgets:         'budgets',
        expenses:        'expenses',
        timetable:       'timetable',
        terms:           'terms',
        academicYears:   'academic_years',
        feeCategories:   'fee_categories',
        feeStructure:    'fee_structure',
        attendance:      'attendance',
        staffAttendance: 'staff_attendance'
    };

    // Which variables does each portal actually have in memory?
    const PORTAL_VARS = {
        admin: [
            'students','teachers','accountants','classes','subjects',
            'exams','examGrades','payments','budgets','expenses',
            'timetable','terms','academicYears','feeCategories',
            'feeStructure','attendance','staffAttendance'
        ],
        teacher: [
            'students','teachers','classes','subjects','exams',
            'examGrades','terms','attendance','timetable'
        ],
        accountant: [
            'students','accountants','classes','payments',
            'budgets','expenses','terms','academicYears',
            'feeCategories','feeStructure'
        ]
    };

    // Which tables can each portal actually change? (prevents overwriting
    // newer data that another portal just saved)
    const WRITABLE = {
        admin:      PORTAL_VARS.admin,
        teacher:    ['exams','examGrades','attendance','teachers'],
        accountant: ['payments','budgets','expenses','accountants']
    };

    // ─── 5. Read / write script-scope variables by name ───
    function getVar(name) {
        try { return eval(name); } catch (e) { return undefined; }
    }
    function setVar(name, value) {
        try { eval(name + ' = value;'); return true; } catch (e) { return false; }
    }

    // ─── 6. Load everything from the cloud ───
    async function loadFromCloud() {
        const vars = PORTAL_VARS[PORTAL];
        console.log('[bridge] Loading ' + vars.length + ' tables from Supabase…');

        const results = await Promise.all(vars.map(async (v) => {
            const { data, error } = await db.from(VAR_TO_TABLE[v]).select('*');
            if (error) {
                console.warn('[bridge] Load error on ' + v + ':', error.message);
                return { v, data: null };
            }
            return { v, data: (data || []).map(rowToObj) };
        }));

        // If every table is empty, seed the cloud from the local demo data
        const allEmpty = results.every(r => !r.data || r.data.length === 0);
        if (allEmpty) {
            console.log('[bridge] Supabase is empty — seeding from local demo data…');
            await seedFromLocal();
            return false;
        }

        // Replace local arrays with cloud data
        results.forEach(({ v, data }) => {
            if (data && data.length) setVar(v, data);
        });

        console.log('[bridge] ✅ Loaded from Supabase');
        return true;
    }

    // ─── 7. Push local demo data into a fresh cloud ───
    async function seedFromLocal() {
        for (const v of PORTAL_VARS[PORTAL]) {
            const arr = getVar(v);
            if (!arr || !arr.length) continue;
            const table = VAR_TO_TABLE[v];
            const rows  = arr.map(objToRow);
            const { error } = await db.from(table).upsert(rows);
            if (error) console.warn('[bridge] Seed failed for ' + table + ':', error.message);
        }
        console.log('[bridge] ✅ Seed complete');
    }

    // ─── 8. Sync changed tables back to the cloud ───
    const snapshots = {};

    function snapshotAll() {
        for (const v of PORTAL_VARS[PORTAL]) {
            snapshots[v] = JSON.stringify(getVar(v) || []);
        }
    }

    let syncTimer = null;
    function scheduleSync() {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(syncChangedTables, 400);
    }

    async function syncChangedTables() {
        syncTimer = null;

        for (const v of WRITABLE[PORTAL]) {
            const arr = getVar(v);
            if (!arr) continue;

            const json = JSON.stringify(arr);
            if (snapshots[v] === json) continue;   // unchanged — skip

            const table = VAR_TO_TABLE[v];
            if (!table) continue;
            if (arr.length === 0) { snapshots[v] = json; continue; }

            try {
                const { error } = await db.from(table).upsert(arr.map(objToRow));
                if (error) throw error;
                snapshots[v] = json;
                console.log('[bridge] Synced ' + table + ' (' + arr.length + ' rows)');
            } catch (e) {
                console.warn('[bridge] Sync failed for ' + table + ':', e.message);
            }
        }
    }

    // ─── 9. Hook saveToLocal() / saveData() ───
    ['saveToLocal', 'saveData'].forEach(fnName => {
        if (typeof window[fnName] !== 'function') return;
        const orig = window[fnName];
        window[fnName] = function () {
            const r = orig.apply(this, arguments);
            scheduleSync();
            return r;
        };
        console.log('[bridge] Hooked ' + fnName + '()');
    });

    // ─── 10. Hook delete functions (so rows are removed from cloud too) ───
    const DELETES = {
        deleteStudentById:   'students',
        deleteTeacherById:   'teachers',
        deletePaymentById:   'payments',
        deleteBudgetById:    'budgets',
        deleteExpenseById:   'expenses',
        deleteClassById:     'classes',
        deleteSubjectById:   'subjects',
        deleteExamById:      'exams',
        deleteClassExam:     'exams',
        deleteTimetable:     'timetable',
        deleteTerm:          'terms',
        deleteAcademicYear:  'academic_years',
        deleteFeeCategory:   'fee_categories',
        deleteFeeStructure:  'fee_structure',
        deletePayment:       'payments',
        deleteBudget:        'budgets',
        deleteExpense:       'expenses',
        deleteTeacherExam:   'exams'
    };

    Object.keys(DELETES).forEach(fnName => {
        if (typeof window[fnName] !== 'function') return;
        const table = DELETES[fnName];
        const orig  = window[fnName];

        window[fnName] = async function (id) {
            const r = await Promise.resolve(orig.apply(this, arguments));
            if (id) {
                try {
                    await db.from(table).delete().eq('id', id);
                    // Refresh snapshot so the deleted row doesn't get re-upserted
                    const v = Object.keys(VAR_TO_TABLE).find(k => VAR_TO_TABLE[k] === table);
                    if (v) snapshots[v] = JSON.stringify(getVar(v) || []);
                } catch (e) {
                    console.warn('[bridge] Cloud delete failed for ' + table + ':', e.message);
                }
            }
            return r;
        };
    });

    // Special: accountant delete reads the id from the DOM, not from arguments
    if (typeof window.deleteAccountantById === 'function') {
        const orig = window.deleteAccountantById;
        window.deleteAccountantById = async function () {
            const id = (document.getElementById('accId') || {}).value;
            const r = await Promise.resolve(orig.apply(this, arguments));
            if (id) {
                try { await db.from('accountants').delete().eq('id', id); }
                catch (e) { console.warn('[bridge] Accountant cloud delete failed', e); }
            }
            return r;
        };
    }

    // ─── 11. Hook saveSettings() ───
    if (typeof window.saveSettings === 'function') {
        const orig = window.saveSettings;
        window.saveSettings = function () {
            const r = orig.apply(this, arguments);
            const s = getVar('schoolSettings');
            if (s) {
                db.from('school_settings').upsert({
                    id: 1,
                    name: s.name,
                    logo: s.logo,
                    primary_color: s.primaryColor,
                    updated_at: new Date().toISOString()
                }).then(({ error }) => {
                    if (error) console.warn('[bridge] Settings cloud save failed:', error.message);
                });
            }
            return r;
        };
    }

    // ─── 12. Load school settings from the cloud ───
    async function loadCloudSettings() {
        try {
            const { data, error } = await db
                .from('school_settings').select('*').eq('id', 1).maybeSingle();
            if (error || !data) return;

            const s = getVar('schoolSettings');
            if (!s) return;

            if (data.name)          s.name         = data.name;
            if (data.logo)          s.logo         = data.logo;
            if (data.primary_color) s.primaryColor = data.primary_color;

            if (typeof window.applySettings === 'function') window.applySettings();
            if (typeof window.updateFavicon  === 'function') window.updateFavicon();
        } catch (e) { console.warn('[bridge] Settings load failed', e); }
    }

    // ─── 13. Refresh all on-screen data ───
    function refreshUI() {
        try {
            if (typeof window.updateAllUI === 'function') window.updateAllUI();
            const active = document.querySelector('.sidebar-nav .nav-item.active');
            const tab = active && active.getAttribute('data-tab');
            if (tab && typeof window.switchTab === 'function') window.switchTab(tab);
        } catch (e) { console.warn('[bridge] Refresh error', e); }
    }

    // ─── 14. Bootstrap: wait for the app to init, then pull from cloud ───
    async function bootstrap() {
        // Give the portal's own init() a moment to finish
        await new Promise(r => setTimeout(r, 100));

        try {
            const gotCloud = await loadFromCloud();
            await loadCloudSettings();
            snapshotAll();

            if (gotCloud) {
                refreshUI();
                console.log('[bridge] ✅ Cloud data loaded and UI refreshed');
            } else {
                console.log('[bridge] ℹ️  Cloud was empty — seeded with demo data');
            }
        } catch (e) {
            console.error('[bridge] Bootstrap failed:', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    // Expose for debugging in the browser console
    window.__supabase = { db, loadFromCloud, snapshotAll };
    console.log('[bridge] Ready. Portal: ' + PORTAL);
})();