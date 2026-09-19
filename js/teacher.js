// ═══════════════════════════════════════════════════════════════
// TEACHER PORTAL — Shares localStorage data with the main system
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = "DarAlWafaaEnhanced";
const SESSION_KEY = 'DarAlWafaaSession';
const SETTINGS_KEY = 'DarAlWafaaSchoolSettings';

// ─── DATA STORE ───
let students = [], teachers = [], classes = [], subjects = [], exams = [], examGrades = [], terms = [];
let attendance = [];
let schoolSettings = { name: 'Dar Al-Wafaa', logo: '', primaryColor: '#6c3a9d' };

// ─── CURRENT USER ───
let currentTeacher = null;

let currentTab = "dashboard";
let teacherClassFilter = "All";
let teacherSearchQuery = "";
let teacherGradeExamId = null;
let teacherPerfChart = null;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function getLocalDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
    if (!str) return '';
    str = String(str);
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m);
}

function generateId(prefix) {
    return prefix + Date.now() + Math.random().toString(36).substr(2, 6);
}

function showToast(msg, isError) {
    const t = document.getElementById('teacherToast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = isError ? '#e74c3c' : '#27ae60';
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 4000);
}

function getGrade(score, maxScore) {
    if (!maxScore || maxScore <= 0) return 'N/A';
    const pct = (score / maxScore) * 100;
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
}

function getGradeClass(grade) {
    if (grade === 'A' || grade === 'B') return 'grade-A';
    if (grade === 'C') return 'grade-C';
    if (grade === 'D') return 'grade-D';
    if (grade === 'F') return 'grade-F';
    return '';
}

function getGradeColor(grade) {
    if (grade === 'A') return '#27ae60';
    if (grade === 'B') return '#2ecc71';
    if (grade === 'C') return '#f39c12';
    if (grade === 'D') return '#e67e22';
    if (grade === 'F') return '#e74c3c';
    return '#95a5a6';
}

// ✅ Sort classes by level order then numerically
function sortClasses(a, b) {
    const levelOrder = {
        'Nursery': 1,
        'Kindergarten': 2,
        'KG': 3,
        'Primary': 4,
        'Junior High School': 5
    };
    const aLevel = levelOrder[a.level] || 99;
    const bLevel = levelOrder[b.level] || 99;
    if (aLevel !== bLevel) return aLevel - bLevel;

    const aNumMatch = (a.name || '').match(/\d+/);
    const bNumMatch = (b.name || '').match(/\d+/);
    const aNum = aNumMatch ? parseInt(aNumMatch[0], 10) : 0;
    const bNum = bNumMatch ? parseInt(bNumMatch[0], 10) : 0;
    if (aNum !== bNum) return aNum - bNum;

    return (a.name || '').localeCompare(b.name || '');
}

// ✅ Sort a list of class name strings using the level mapping
function sortClassNames(names) {
    const classByName = {};
    classes.forEach(c => { classByName[c.name] = c; });
    return [...names].sort((a, b) => {
        const ca = classByName[a];
        const cb = classByName[b];
        if (ca && cb) return sortClasses(ca, cb);
        return a.localeCompare(b);
    });
}

// ✅ Helper that decides an exam's status based on BOTH date and grading completeness
function getExamStatus(exam) {
    const now = getLocalDateString();
    const grades = examGrades.filter(g => g.examId === exam.id);
    const activeStudents = students.filter(s => s.class === exam.class && s.status === 'Active');
    const fullyGraded = activeStudents.length > 0 && grades.length >= activeStudents.length;
    if (fullyGraded) return 'Completed';
    if (exam.date < now) return 'Completed';
    if (exam.date === now) return 'Ongoing';
    return 'Upcoming';
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════
function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return false;
    }
    try {
        const parsed = JSON.parse(raw);
        students = parsed.students || [];
        teachers = (parsed.teachers || []).map(t => {
            if (!t.username) {
                t.username = (t.name || 'teacher').toLowerCase().replace(/\s+/g, '.');
            }
            if (!t.password) {
                t.password = 'teacher123';
            }
            if (t.canLogin === undefined) t.canLogin = true;
            return t;
        });
        classes = parsed.classes || [];
        subjects = parsed.subjects || [];
        exams = parsed.exams || [];
        examGrades = parsed.examGrades || [];
        terms = parsed.terms || [];
        attendance = parsed.attendance || [];

        parsed.teachers = teachers;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));

        return true;
    } catch (e) {
        console.error('Parse error:', e);
        return false;
    }
}

function saveData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    let existing = {};
    if (raw) {
        try { existing = JSON.parse(raw); } catch (e) { existing = {}; }
    }
    existing.students = students;
    existing.teachers = teachers;
    existing.classes = classes;
    existing.subjects = subjects;
    existing.exams = exams;
    existing.examGrades = examGrades;
    existing.terms = terms;
    existing.attendance = attendance;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

function loadSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            schoolSettings.name = parsed.name || 'Dar Al-Wafaa';
            schoolSettings.logo = parsed.logo || '';
            schoolSettings.primaryColor = parsed.primaryColor || '#6c3a9d';
        } catch (e) { }
    }
    applySettings();
}

function applySettings() {
    const nameEl = document.getElementById('sidebarSchoolName');
    if (nameEl) nameEl.textContent = schoolSettings.name;
    const logoEl = document.getElementById('sidebarLogo');
    if (logoEl) {
        if (schoolSettings.logo) {
            logoEl.src = schoolSettings.logo;
            logoEl.style.display = 'inline-block';
        } else logoEl.style.display = 'none';
    }
    const titleSpan = document.getElementById('pageTitleSpan');
    if (titleSpan) titleSpan.textContent = schoolSettings.name + ' · Teacher';
    const loginName = document.getElementById('loginSchoolName');
    if (loginName) loginName.textContent = schoolSettings.name;
}

// ═══════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════
function getSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

function setSession(teacherId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'teacher', teacherId }));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

function isTeacherLoggedIn() {
    const s = getSession();
    if (!s || s.role !== 'teacher' || !s.teacherId) return false;
    const t = teachers.find(t => t.id === s.teacherId);
    if (!t || t.canLogin === false || !t.username || !t.password) return false;
    currentTeacher = t;
    return true;
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
function showTeacherLogin() {
    document.getElementById('teacherLoginOverlay').classList.remove('hidden');
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('sidebar').style.display = 'none';
}

function hideTeacherLogin() {
    document.getElementById('teacherLoginOverlay').classList.add('hidden');
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('sidebar').style.display = 'block';
}

function handleTeacherLogin(e) {
    e.preventDefault();
    const username = document.getElementById('teacherUsernameLogin').value.trim();
    const password = document.getElementById('teacherPasswordLogin').value.trim();
    const errEl = document.getElementById('teacherLoginError');

    if (!username || !password) {
        errEl.textContent = 'Please enter both username and password.';
        return;
    }

    const teacher = teachers.find(t =>
        t.username &&
        t.username.toLowerCase() === username.toLowerCase() &&
        t.password === password &&
        t.canLogin !== false
    );

    if (!teacher) {
        errEl.textContent = '❌ Invalid username or password.';
        return;
    }

    setSession(teacher.id);
    currentTeacher = teacher;
    errEl.textContent = '';
    hideTeacherLogin();
    initTeacherUI();
    showToast(`✅ Welcome, ${teacher.name}!`);
}

function handleTeacherLogout() {
    if (confirm('Are you sure you want to logout?')) {
        clearSession();
        currentTeacher = null;
        showTeacherLogin();
        document.getElementById('teacherUsernameLogin').value = '';
        document.getElementById('teacherPasswordLogin').value = '';
        document.getElementById('teacherLoginError').textContent = '';
        showToast('Logged out successfully.');
    }
}

// ═══════════════════════════════════════════════════════════════
// SCOPE HELPERS
// ═══════════════════════════════════════════════════════════════
function getMyClassNames() {
    if (!currentTeacher || !currentTeacher.assignedClass) return [];
    return currentTeacher.assignedClass.split(',').map(s => s.trim()).filter(Boolean);
}

function getMyClasses() {
    const names = getMyClassNames();
    return classes.filter(c => names.includes(c.name)).sort(sortClasses);
}

function getMyStudents() {
    const names = getMyClassNames();
    return students.filter(s => names.includes(s.class) && s.status === 'Active');
}

function getMyExams() {
    const names = getMyClassNames();
    return exams.filter(e => names.includes(e.class));
}

function getMyAttendance() {
    const names = getMyClassNames();
    return attendance.filter(a => names.includes(a.class));
}

function getStudentAttendancePct(studentId) {
    const records = attendance.filter(a => a.studentId === studentId);
    if (!records.length) return null;
    const attended = records.filter(a => a.status === 'Present' || a.status === 'Late').length;
    return {
        pct: (attended / records.length) * 100,
        present: records.filter(a => a.status === 'Present').length,
        absent: records.filter(a => a.status === 'Absent').length,
        late: records.filter(a => a.status === 'Late').length,
        total: records.length
    };
}

function getStudentAvgScore(studentId) {
    const grades = examGrades.filter(g => g.studentId === studentId);
    if (!grades.length) return null;
    let totalScore = 0, totalMax = 0;
    grades.forEach(g => {
        const exam = exams.find(e => e.id === g.examId);
        if (exam) {
            totalScore += g.score;
            totalMax += exam.maxScore || 100;
        }
    });
    return totalMax > 0 ? (totalScore / totalMax) * 100 : null;
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) item.classList.add('active');
        else item.classList.remove('active');
    });

    closeSidebar();

    if (tabId === 'dashboard') renderDashboard();
    else if (tabId === 'classes') renderMyClasses();
    else if (tabId === 'students') renderMyStudents();
    else if (tabId === 'exams') renderMyExams();
    else if (tabId === 'attendance') {
        populateTeacherAttendanceDropdowns();
        switchTeacherAttendSubTab('mark');
        document.getElementById('teacherAttendanceDate').value = getLocalDateString();
    }
    else if (tabId === 'timetable') renderTeacherTimetable();
    else if (tabId === 'settings') renderTeacherProfile();
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function renderDashboard() {
    const t = currentTeacher;
    if (!t) return;

    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('dashboardGreeting').textContent = `${greet}, ${t.name}!`;

    document.getElementById('twbAvatar').textContent = t.name.charAt(0).toUpperCase();
    document.getElementById('twbName').textContent = t.name;
    document.getElementById('twbSubjects').textContent = t.subject || 'Teacher';
    document.getElementById('userDisplayName').textContent = t.name;

    const cls = getMyClassNames();
    document.getElementById('twbClasses').innerHTML = cls.length
        ? cls.map(c => `<span><i class="fas fa-book"></i> ${escapeHtml(c)}</span>`).join('')
        : '<span>No classes assigned yet</span>';

    const myStudents = getMyStudents();
    const myClasses = getMyClasses();
    const myExams = getMyExams();

    document.getElementById('teacherTotalStudents').innerText = myStudents.length;
    document.getElementById('teacherTotalClasses').innerText = myClasses.length;
    document.getElementById('teacherTotalExams').innerText = myExams.length;

    const today = getLocalDateString();
    const todayRecords = getMyAttendance().filter(a => a.date === today);
    const attendedToday = todayRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const totalToday = todayRecords.length;
    if (totalToday > 0) {
        const pct = (attendedToday / totalToday) * 100;
        document.getElementById('teacherAttendanceToday').innerText = pct.toFixed(0) + '%';
        document.getElementById('teacherAttendanceTodaySub').innerText = `${attendedToday}/${totalToday} attended today`;
    } else {
        document.getElementById('teacherAttendanceToday').innerText = '—';
        document.getElementById('teacherAttendanceTodaySub').innerText = 'Not marked yet today';
    }

    const classesList = document.getElementById('teacherClassesList');
    if (!myClasses.length) {
        classesList.innerHTML = '<p style="color:#95a5a6;text-align:center;padding:20px 0;">No classes assigned yet.</p>';
    } else {
        classesList.innerHTML = myClasses.map(c => {
            const count = students.filter(s => s.class === c.name && s.status === 'Active').length;
            return `<div class="teacher-class-mini">
                <div class="tcm-icon"><i class="fas fa-book-open"></i></div>
                <div class="tcm-info">
                    <h4>${escapeHtml(c.name)}</h4>
                    <p>${escapeHtml(c.level || '')} · Capacity ${c.capacity || '—'}</p>
                </div>
                <div class="tcm-count">${count}</div>
            </div>`;
        }).join('');
    }

    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const todayName = dayNames[new Date().getDay()];
    const scheduleList = document.getElementById('teacherScheduleList');
    const todaySchedule = timetable.filter(e => e.day === todayName && (e.teacher === t.name || cls.includes(e.class)))
        .sort((a, b) => a.time.localeCompare(b.time));

    if (!todaySchedule.length) {
        scheduleList.innerHTML = `<p style="color:#95a5a6;text-align:center;padding:20px 0;">No classes scheduled for ${todayName}.</p>`;
    } else {
        scheduleList.innerHTML = todaySchedule.map(e => `
            <div class="teacher-schedule-mini">
                <div class="tsm-time">${escapeHtml(e.time)}</div>
                <div class="tsm-info">
                    <h4>${escapeHtml(e.subject)}</h4>
                    <p>${escapeHtml(e.class)} · Room ${escapeHtml(e.room || '—')}</p>
                </div>
            </div>
        `).join('');
    }

    renderTeacherPerformanceChart();
}

let timetable = [];

function renderTeacherPerformanceChart() {
    const canvas = document.getElementById('teacherPerfChart');
    if (!canvas) return;
    if (teacherPerfChart) teacherPerfChart.destroy();

    const myClasses = getMyClasses();
    if (!myClasses.length) {
        const ctx = canvas.getContext('2d');
        teacherPerfChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Classes'], datasets: [{ data: [0], backgroundColor: ['#ecf0f1'] }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
        });
        return;
    }

    const labels = [];
    const data = [];
    const colors = [];

    myClasses.forEach(c => {
        const classExams = exams.filter(e => e.class === c.name);
        let totalScore = 0, totalMax = 0;
        classExams.forEach(ex => {
            const grades = examGrades.filter(g => g.examId === ex.id);
            grades.forEach(g => {
                totalScore += g.score;
                totalMax += ex.maxScore || 100;
            });
        });
        const avg = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
        labels.push(c.name);
        data.push(avg);
        colors.push(avg >= 80 ? '#27ae60' : avg >= 60 ? '#f39c12' : '#e74c3c');
    });

    const ctx = canvas.getContext('2d');
    teacherPerfChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Average Score (%)',
                data,
                backgroundColor: colors,
                borderRadius: 8,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(1)}%` } }
            },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } }
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// MY CLASSES TAB
// ═══════════════════════════════════════════════════════════════
function renderMyClasses() {
    const myClasses = getMyClasses();
    document.getElementById('myClassTotalCount').innerText = myClasses.length;
    let totalStudents = 0;
    myClasses.forEach(c => {
        totalStudents += students.filter(s => s.class === c.name && s.status === 'Active').length;
    });
    document.getElementById('myClassTotalStudents').innerText = totalStudents;
    document.getElementById('myClassAvgSize').innerText = myClasses.length > 0 ? Math.round(totalStudents / myClasses.length) : 0;
    document.getElementById('myClassExamsCount').innerText = getMyExams().length;

    const container = document.getElementById('myClassGroupsContainer');
    if (!myClasses.length) {
        container.innerHTML = `
            <div class="no-classes-message">
                <i class="fas fa-book-open"></i>
                <h3>No Classes Assigned</h3>
                <p>Contact your administrator to assign classes to your account.</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="teacher-classes-grid">
            ${myClasses.map(c => {
                const classStudents = students.filter(s => s.class === c.name && s.status === 'Active');
                const classExams = exams.filter(e => e.class === c.name);
                return `
                    <div class="teacher-class-card">
                        <div class="teacher-class-card-header">
                            <div>
                                <div class="teacher-class-card-title">
                                    <i class="fas fa-book-open"></i> ${escapeHtml(c.name)}
                                </div>
                                <span class="teacher-class-card-level">${escapeHtml(c.level || '')}</span>
                            </div>
                            <span class="teacher-class-card-status">${c.status || 'Active'}</span>
                        </div>
                        <div class="teacher-class-card-stats">
                            <div class="tccs-item">
                                <span class="num">${classStudents.length}</span>
                                <span class="lbl">Students</span>
                            </div>
                            <div class="tccs-item">
                                <span class="num">${classExams.length}</span>
                                <span class="lbl">Exams</span>
                            </div>
                            <div class="tccs-item">
                                <span class="num">${c.capacity || '—'}</span>
                                <span class="lbl">Capacity</span>
                            </div>
                        </div>
                        <div class="teacher-class-card-actions">
                            <button class="students-btn" onclick="viewClassStudents('${escapeHtml(c.name)}')">
                                <i class="fas fa-users"></i> Students
                            </button>
                            <button class="view-btn" onclick="switchTab('exams')">
                                <i class="fas fa-file-alt"></i> Exams
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function viewClassStudents(className) {
    teacherClassFilter = className;
    switchTab('students');
    const sel = document.getElementById('myStudentClassFilter');
    if (sel) sel.value = className;
}

// ═══════════════════════════════════════════════════════════════
// MY STUDENTS TAB
// ═══════════════════════════════════════════════════════════════
function populateMyStudentClassFilter() {
    const sel = document.getElementById('myStudentClassFilter');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="All">All My Classes</option>';
    const sortedNames = sortClassNames(getMyClassNames());
    sortedNames.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if (c === cur) opt.selected = true;
        sel.appendChild(opt);
    });
    if (teacherClassFilter !== 'All') sel.value = teacherClassFilter;
}

function renderMyStudents() {
    populateMyStudentClassFilter();
    const myStudents = getMyStudents();

    document.getElementById('myStudentMetricTotal').innerText = myStudents.length;
    document.getElementById('myStudentMetricActive').innerText = myStudents.filter(s => s.status === 'Active').length;
    document.getElementById('myStudentMetricMale').innerText = myStudents.filter(s => s.gender === 'Male').length;
    document.getElementById('myStudentMetricFemale').innerText = myStudents.filter(s => s.gender === 'Female').length;

    let filtered = myStudents.filter(s =>
        s.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
        (s.parentName || '').toLowerCase().includes(teacherSearchQuery.toLowerCase())
    );
    if (teacherClassFilter !== 'All') {
        filtered = filtered.filter(s => s.class === teacherClassFilter);
    }

    const tbody = document.getElementById('myStudentsTbody');
    const badge = document.getElementById('myStudentCountBadge');

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#95a5a6;">No students found.</td></tr>`;
        badge.innerText = '0';
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const att = getStudentAttendancePct(s.id);
        const attDisplay = att ? att.pct.toFixed(0) + '%' : '—';
        const attColor = !att ? '#95a5a6' : att.pct >= 90 ? '#27ae60' : att.pct >= 75 ? '#2ecc71' : att.pct >= 60 ? '#f39c12' : '#e74c3c';

        const avg = getStudentAvgScore(s.id);
        const avgDisplay = avg !== null ? avg.toFixed(0) + '%' : '—';
        const avgColor = avg === null ? '#95a5a6' : avg >= 80 ? '#27ae60' : avg >= 60 ? '#f39c12' : '#e74c3c';

        // ✅ UPDATED — Using a styled span instead of SVG data-URI so the initial letter always renders
        const initial = (s.name.charAt(0) || '?').toUpperCase();
        const avatarContent = `<span style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;color:#fff;background:linear-gradient(135deg,#27ae60,#2ecc71);">${initial}</span>`;

        return `<tr>
            <td>
                <div class="student-info-cell">
                    <div class="student-avatar">${avatarContent}</div>
                    <div>
                        <div class="student-name">${escapeHtml(s.name)}</div>
                        <div class="student-id">ID: ${s.id}</div>
                    </div>
                </div>
            </td>
            <td><span class="class-badge">${escapeHtml(s.class)}</span></td>
            <td>${s.age || '—'} yrs<br><span class="subtext">${escapeHtml(s.gender || '—')}</span></td>
            <td><strong>${escapeHtml(s.parentName || '—')}</strong><br><span class="subtext">${escapeHtml(s.parentContact || '')}</span></td>
            <td><span style="background:${attColor}20;color:${attColor};padding:3px 12px;border-radius:20px;font-weight:700;font-size:0.8rem;">${attDisplay}</span></td>
            <td><span style="background:${avgColor}20;color:${avgColor};padding:3px 12px;border-radius:20px;font-weight:700;font-size:0.8rem;">${avgDisplay}</span></td>
            <td>
                <i class="fas fa-chart-line teacher-action-icon" onclick="openTeacherPerfModal('${s.id}')" title="View Performance"></i>
            </td>
        </tr>`;
    }).join('');

    badge.innerText = filtered.length;
}

function exportMyStudentsCSV() {
    const myStudents = getMyStudents();
    if (!myStudents.length) { showToast('No students to export.', true); return; }
    const headers = ['Name','Class','Age','Gender','Parent Name','Parent Contact','Attendance %','Average Score %'];
    const rows = myStudents.map(s => {
        const att = getStudentAttendancePct(s.id);
        const avg = getStudentAvgScore(s.id);
        return [
            s.name, s.class, s.age, s.gender,
            s.parentName || '', s.parentContact || '',
            att ? att.pct.toFixed(1) : '',
            avg !== null ? avg.toFixed(1) : ''
        ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => {
        v = String(v);
        if (v.includes(',') || v.includes('"')) v = `"${v.replace(/"/g,'""')}"`;
        return v;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_students.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported successfully!');
}

// ═══════════════════════════════════════════════════════════════
// EXAMS TAB
// ═══════════════════════════════════════════════════════════════
function renderMyExams() {
    const myExams = getMyExams();
    const now = getLocalDateString();

    document.getElementById('myExamTotalCount').innerText = myExams.length;
    document.getElementById('myExamCompletedCount').innerText = myExams.filter(e => getExamStatus(e) === 'Completed').length;
    document.getElementById('myExamUpcomingCount').innerText = myExams.filter(e => getExamStatus(e) === 'Upcoming').length;

    let totalScore = 0, totalMax = 0;
    myExams.forEach(ex => {
        examGrades.filter(g => g.examId === ex.id).forEach(g => {
            totalScore += g.score;
            totalMax += ex.maxScore || 100;
        });
    });
    const avg = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    document.getElementById('myExamAvgScore').innerText = avg.toFixed(0) + '%';

    const tbody = document.getElementById('myExamsTbody');
    document.getElementById('myExamCountBadge').innerText = myExams.length;

    if (!myExams.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#95a5a6;">No exams created yet. Click "Create Exam" to add one.</td></tr>`;
        return;
    }

    tbody.innerHTML = myExams.map(exam => {
        const status = getExamStatus(exam);
        const statusClass = status === 'Upcoming' ? 'exam-status-upcoming' : status === 'Ongoing' ? 'exam-status-ongoing' : 'exam-status-completed';
        const hasGrades = examGrades.some(g => g.examId === exam.id);
        const gradeCount = examGrades.filter(g => g.examId === exam.id).length;
        const termName = terms.find(t => t.id === exam.termId)?.name || '—';

        return `<tr>
            <td><strong>${escapeHtml(exam.name)}</strong></td>
            <td><span class="subject-tag">${escapeHtml(exam.subject)}</span></td>
            <td><span class="class-badge">${escapeHtml(exam.class)}</span></td>
            <td>${escapeHtml(termName)}</td>
            <td>${formatDate(exam.date)}</td>
            <td>${exam.maxScore}</td>
            <td>
                <span class="exam-status-badge ${statusClass}">${status}</span>
                ${hasGrades ? `<span style="font-size:0.7rem;color:#8c7da1;display:block;">${gradeCount} grades</span>` : ''}
            </td>
            <td class="action-icons">
                <i class="fas fa-pencil-alt teacher-action-icon" onclick="openTeacherGradeEntry('${exam.id}')" title="Enter Grades"></i>
                <i class="fas fa-trash-alt teacher-action-icon" style="color:#e74c3c;" onclick="deleteTeacherExam('${exam.id}')" title="Delete"></i>
            </td>
        </tr>`;
    }).join('');
}

function exportMyExamsCSV() {
    const myExams = getMyExams();
    if (!myExams.length) { showToast('No exams to export.', true); return; }
    const headers = ['Name','Subject','Class','Term','Date','Max Score','Status'];
    const rows = myExams.map(e => {
        const status = getExamStatus(e);
        const term = terms.find(t => t.id === e.termId)?.name || '';
        return [e.name, e.subject, e.class, term, e.date, e.maxScore, status];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_exams.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported successfully!');
}

// ─── CREATE EXAM MODAL ───
function openTeacherExamModal() {
    document.getElementById('teacherExamId').value = '';
    document.getElementById('teacherExamName').value = '';
    document.getElementById('teacherExamSubject').value = '';
    document.getElementById('teacherExamDate').value = getLocalDateString();
    document.getElementById('teacherExamMaxScore').value = '';
    document.getElementById('teacherExamType').value = 'Individual Test';
    document.getElementById('teacherExamDescription').value = '';
    document.getElementById('teacherExamModalTitle').innerText = 'Create Exam';

    const classSel = document.getElementById('teacherExamClass');
    classSel.innerHTML = '<option value="">-- Select Class --</option>';
    const sortedNames = sortClassNames(getMyClassNames());
    sortedNames.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        classSel.appendChild(opt);
    });

    const termSel = document.getElementById('teacherExamTerm');
    termSel.innerHTML = '<option value="">-- Select Term --</option>';
    terms.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        termSel.appendChild(opt);
    });

    document.getElementById('teacherExamModal').classList.add('active');
}

function closeTeacherExamModal() {
    document.getElementById('teacherExamModal').classList.remove('active');
}

function saveTeacherExam() {
    const id = document.getElementById('teacherExamId').value;
    const name = document.getElementById('teacherExamName').value.trim();
    const subject = document.getElementById('teacherExamSubject').value.trim();
    const cls = document.getElementById('teacherExamClass').value;
    const termId = document.getElementById('teacherExamTerm').value;
    const date = document.getElementById('teacherExamDate').value;
    const maxScore = parseInt(document.getElementById('teacherExamMaxScore').value, 10);
    const type = document.getElementById('teacherExamType').value;
    const description = document.getElementById('teacherExamDescription').value.trim();

    if (!name || !subject || !cls || !date || isNaN(maxScore) || maxScore < 1) {
        showToast('Please fill all required fields.', true);
        return;
    }
    if (!termId) { showToast('Please select a term.', true); return; }

    if (!getMyClassNames().includes(cls)) {
        showToast('You can only create exams for your own classes.', true);
        return;
    }

    const data = { name, subject, class: cls, termId, date, maxScore, type, description };
    if (id) {
        const idx = exams.findIndex(e => e.id === id);
        if (idx !== -1) exams[idx] = { ...exams[idx], ...data };
    } else {
        data.id = generateId('EX');
        exams.push(data);
    }

    saveData();
    renderMyExams();
    closeTeacherExamModal();
    showToast(id ? 'Exam updated!' : 'Exam created!');
}

function deleteTeacherExam(id) {
    const exam = exams.find(e => e.id === id);
    if (!exam) return;
    if (!getMyClassNames().includes(exam.class)) {
        showToast('You cannot delete this exam.', true);
        return;
    }
    if (confirm('Delete this exam and all its grades?')) {
        exams = exams.filter(e => e.id !== id);
        examGrades = examGrades.filter(g => g.examId !== id);
        saveData();
        renderMyExams();
        showToast('Exam deleted.');
    }
}

// ─── GRADE ENTRY ───
function openTeacherGradeEntry(examId) {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    if (!getMyClassNames().includes(exam.class)) {
        showToast('Access denied.', true);
        return;
    }

    teacherGradeExamId = examId;
    document.getElementById('teacherGradeExamName').innerText = exam.name;

    const classStudents = students.filter(s => s.class === exam.class && s.status === 'Active');
    const tbody = document.getElementById('teacherGradeTbody');

    if (!classStudents.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;">No students in this class.</td></tr>`;
    } else {
        tbody.innerHTML = classStudents.map((s, idx) => {
            const existing = examGrades.find(g => g.examId === examId && g.studentId === s.id);
            const score = existing ? existing.score : '';
            const grade = existing ? getGrade(existing.score, exam.maxScore) : '—';
            const gradeClass = existing ? getGradeClass(grade) : '';
            return `<tr data-student-id="${s.id}">
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td><input type="number" class="exam-grade-input" data-student-id="${s.id}" value="${score}" min="0" max="${exam.maxScore}" step="0.5" placeholder="Score" /></td>
                <td><span class="grade-range ${gradeClass}">${grade}</span></td>
            </tr>`;
        }).join('');
    }

    document.getElementById('teacherGradeCount').innerText = classStudents.length + ' students';
    document.getElementById('teacherGradeEntry').style.display = 'block';

    document.querySelectorAll('#teacherGradeTbody .exam-grade-input').forEach(input => {
        input.onchange = function() {
            const studentId = this.dataset.studentId;
            const val = parseFloat(this.value);
            const tr = this.closest('tr');
            const gradeCell = tr.querySelector('td:last-child span');

            if (!isNaN(val) && val >= 0 && val <= exam.maxScore) {
                const existingIndex = examGrades.findIndex(g => g.examId === examId && g.studentId === studentId);
                if (existingIndex !== -1) examGrades[existingIndex].score = val;
                else examGrades.push({ id: generateId('EG'), examId, studentId, score: val });
                saveData();
                const grade = getGrade(val, exam.maxScore);
                gradeCell.textContent = grade;
                gradeCell.className = `grade-range ${getGradeClass(grade)}`;
                this.classList.add('saved');
                showToast('Grade saved.');
                renderMyExams();
            } else if (this.value === '') {
                const idx = examGrades.findIndex(g => g.examId === examId && g.studentId === studentId);
                if (idx !== -1) {
                    examGrades.splice(idx, 1);
                    saveData();
                    gradeCell.textContent = '—';
                    gradeCell.className = 'grade-range';
                    this.classList.remove('saved');
                    renderMyExams();
                }
            } else {
                showToast('Invalid score.', true);
                this.value = '';
            }
        };
    });

    const searchInput = document.getElementById('teacherGradeSearch');
    searchInput.oninput = function() {
        const q = this.value.toLowerCase().trim();
        document.querySelectorAll('#teacherGradeTbody tr').forEach(row => {
            const name = row.querySelector('td:nth-child(2) strong')?.textContent?.toLowerCase() || '';
            row.style.display = name.includes(q) ? '' : 'none';
        });
    };
    searchInput.value = '';
}

function closeTeacherGradeEntry() {
    document.getElementById('teacherGradeEntry').style.display = 'none';
    teacherGradeExamId = null;
}

// ═══════════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════════
function populateTeacherAttendanceDropdowns() {
    const classSel = document.getElementById('teacherAttendanceClass');
    const summarySel = document.getElementById('teacherSummaryClass');

    const sortedNames = sortClassNames(getMyClassNames());

    if (classSel) {
        const cur = classSel.value;
        classSel.innerHTML = '<option value="">-- Select Class --</option>';
        sortedNames.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            if (c === cur) opt.selected = true;
            classSel.appendChild(opt);
        });
    }

    if (summarySel) {
        const cur = summarySel.value;
        summarySel.innerHTML = '<option value="All">All My Classes</option>';
        sortedNames.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            if (c === cur) opt.selected = true;
            summarySel.appendChild(opt);
        });
    }
}

function switchTeacherAttendSubTab(tabId) {
    document.querySelectorAll('.teacher-sub-tab').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`.teacher-sub-tab[data-teachertab="${tabId}"]`);
    if (tab) tab.classList.add('active');
    document.querySelectorAll('#tabAttendance .subtab-content').forEach(c => c.classList.remove('active-subtab'));
    const content = document.getElementById(`teacherAttend${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    if (content) content.classList.add('active-subtab');

    if (tabId === 'mark') renderTeacherAttendanceGrid();
    else if (tabId === 'summary') renderTeacherAttendanceSummary();
}

function renderTeacherAttendanceGrid() {
    const date = document.getElementById('teacherAttendanceDate').value;
    const className = document.getElementById('teacherAttendanceClass').value;
    const grid = document.getElementById('teacherAttendanceGrid');
    if (!grid) return;

    if (!date || !className) {
        grid.innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-clipboard-check"></i><h4>Select a class and date</h4><p>Choose a date and class above to start marking attendance.</p></div>`;
        return;
    }

    if (!getMyClassNames().includes(className)) {
        grid.innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-lock"></i><h4>Access Denied</h4><p>You can only mark attendance for your classes.</p></div>`;
        return;
    }

    const classStudents = students.filter(s => s.class === className && s.status === 'Active');
    if (!classStudents.length) {
        grid.innerHTML = `<div class="no-exam-data-msg"><i class="fas fa-users"></i><h4>No students</h4><p>No active students in this class.</p></div>`;
        return;
    }

    let html = `<div class="attendance-summary-bar" id="teacherDaySummary"></div>`;
    html += classStudents.map(s => {
        const rec = attendance.find(a => a.date === date && a.studentId === s.id);
        const status = rec ? rec.status : '';
        return `
            <div class="attendance-row" data-student-id="${s.id}">
                <div class="attendance-row-name">${escapeHtml(s.name)}</div>
                <div class="attendance-status-btns">
                    <button class="attendance-status-btn present ${status === 'Present' ? 'active' : ''}" data-status="Present">Present</button>
                    <button class="attendance-status-btn absent ${status === 'Absent' ? 'active' : ''}" data-status="Absent">Absent</button>
                    <button class="attendance-status-btn late ${status === 'Late' ? 'active' : ''}" data-status="Late">Late</button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = html;

    grid.querySelectorAll('.attendance-status-btn').forEach(btn => {
        btn.onclick = function() {
            const row = this.closest('.attendance-row');
            const studentId = row.dataset.studentId;
            const status = this.dataset.status;
            row.querySelectorAll('.attendance-status-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            markTeacherAttendance(date, studentId, className, status);
        };
    });

    updateTeacherDaySummary(date, className, classStudents);
}

function markTeacherAttendance(date, studentId, className, status) {
    if (!getMyClassNames().includes(className)) {
        showToast('Access denied.', true);
        return;
    }
    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.name : '';
    const idx = attendance.findIndex(a => a.date === date && a.studentId === studentId);
    if (idx !== -1) {
        attendance[idx].status = status;
        attendance[idx].class = className;
    } else {
        attendance.push({
            id: generateId('ATT'),
            date, studentId, studentName, class: className, status
        });
    }
    saveData();
    updateTeacherDaySummary(date, className);
}

function updateTeacherDaySummary(date, className, classStudents) {
    const summaryEl = document.getElementById('teacherDaySummary');
    if (!summaryEl) return;
    if (!classStudents) classStudents = students.filter(s => s.class === className && s.status === 'Active');

    const records = attendance.filter(a => a.date === date && a.class === className);
    const present = records.filter(a => a.status === 'Present').length;
    const absent = records.filter(a => a.status === 'Absent').length;
    const late = records.filter(a => a.status === 'Late').length;
    const unmarked = classStudents.length - records.length;

    summaryEl.innerHTML = `
        <div class="attendance-summary-item"><div class="value" style="color:#27ae60;">${present}</div><div class="label">Present</div></div>
        <div class="attendance-summary-item"><div class="value" style="color:#e74c3c;">${absent}</div><div class="label">Absent</div></div>
        <div class="attendance-summary-item"><div class="value" style="color:#f39c12;">${late}</div><div class="label">Late</div></div>
        <div class="attendance-summary-item"><div class="value" style="color:#95a5a6;">${unmarked}</div><div class="label">Unmarked</div></div>
    `;
}

function teacherMarkAllPresent() {
    const date = document.getElementById('teacherAttendanceDate').value;
    const className = document.getElementById('teacherAttendanceClass').value;
    if (!date || !className) { showToast('Please select a class and date.', true); return; }
    if (!getMyClassNames().includes(className)) { showToast('Access denied.', true); return; }

    const classStudents = students.filter(s => s.class === className && s.status === 'Active');
    classStudents.forEach(s => {
        const idx = attendance.findIndex(a => a.date === date && a.studentId === s.id);
        if (idx !== -1) { attendance[idx].status = 'Present'; }
        else {
            attendance.push({
                id: generateId('ATT'), date, studentId: s.id, studentName: s.name, class: className, status: 'Present'
            });
        }
    });
    saveData();
    renderTeacherAttendanceGrid();
    showToast(`✅ All ${classStudents.length} students marked Present`);
}

function teacherClearDay() {
    const date = document.getElementById('teacherAttendanceDate').value;
    const className = document.getElementById('teacherAttendanceClass').value;
    if (!date || !className) { showToast('Please select a class and date.', true); return; }
    if (!getMyClassNames().includes(className)) { showToast('Access denied.', true); return; }
    if (!confirm('Clear attendance for this day?')) return;

    attendance = attendance.filter(a => !(a.date === date && a.class === className));
    saveData();
    renderTeacherAttendanceGrid();
    showToast('Attendance cleared.');
}

function renderTeacherAttendanceSummary() {
    const classFilter = document.getElementById('teacherSummaryClass').value || 'All';
    const fromDate = document.getElementById('teacherSummaryFrom').value;
    const toDate = document.getElementById('teacherSummaryTo').value;

    let filtered = getMyAttendance();
    if (classFilter !== 'All') filtered = filtered.filter(a => a.class === classFilter);
    if (fromDate) filtered = filtered.filter(a => a.date >= fromDate);
    if (toDate) filtered = filtered.filter(a => a.date <= toDate);

    const stats = {};
    filtered.forEach(a => {
        if (!stats[a.studentId]) {
            stats[a.studentId] = { name: a.studentName, class: a.class, present: 0, absent: 0, late: 0, total: 0 };
        }
        stats[a.studentId].total++;
        if (a.status === 'Present') stats[a.studentId].present++;
        else if (a.status === 'Absent') stats[a.studentId].absent++;
        else if (a.status === 'Late') stats[a.studentId].late++;
    });

    const tbody = document.getElementById('teacherSummaryTbody');
    const badge = document.getElementById('teacherSummaryCount');
    const rows = Object.values(stats);

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#95a5a6;">No records found.</td></tr>`;
        badge.innerText = '0';
        return;
    }

    rows.sort((a, b) => a.class.localeCompare(b.class) || a.name.localeCompare(b.name));
    badge.innerText = rows.length;

    tbody.innerHTML = rows.map(r => {
        const pct = r.total > 0 ? ((r.present + r.late) / r.total) * 100 : 0;
        const color = pct >= 90 ? '#27ae60' : pct >= 75 ? '#2ecc71' : pct >= 60 ? '#f39c12' : '#e74c3c';
        return `<tr>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td><span class="class-badge">${escapeHtml(r.class)}</span></td>
            <td>${r.total}</td>
            <td style="color:#27ae60;font-weight:600;">${r.present}</td>
            <td style="color:#e74c3c;font-weight:600;">${r.absent}</td>
            <td style="color:#f39c12;font-weight:600;">${r.late}</td>
            <td><span style="background:${color}20;color:${color};padding:4px 14px;border-radius:20px;font-size:0.8rem;font-weight:700;">${pct.toFixed(1)}%</span></td>
        </tr>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// TIMETABLE
// ═══════════════════════════════════════════════════════════════
function renderTeacherTimetable() {
    const grid = document.getElementById('teacherTimetableGrid');
    if (!grid) return;

    const filterSel = document.getElementById('teacherTimetableClassFilter');
    if (filterSel.options.length <= 1) {
        filterSel.innerHTML = '<option value="All">All My Classes</option>';
        const sortedNames = sortClassNames(getMyClassNames());
        sortedNames.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            filterSel.appendChild(opt);
        });
    }

    const clsFilter = filterSel.value || 'All';
    const myNames = getMyClassNames();

    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    const slots = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];

    let html = '<div class="timetable-cell header time-slot">Time</div>';
    days.forEach(d => html += `<div class="timetable-cell header">${d.slice(0,3)}</div>`);

    let count = 0;
    slots.forEach(time => {
        html += `<div class="timetable-cell time-slot">${time}</div>`;
        days.forEach(day => {
            const entries = timetable.filter(e =>
                e.day === day &&
                e.time === time &&
                (e.teacher === currentTeacher.name || myNames.includes(e.class)) &&
                (clsFilter === 'All' || e.class === clsFilter)
            );
            if (entries.length) {
                count += entries.length;
                html += '<div class="timetable-cell" style="background:white;padding:4px;">';
                entries.forEach(e => {
                    html += `<div class="timetable-entry"><div class="subject">${escapeHtml(e.subject)}</div><div class="teacher">${escapeHtml(e.class)}</div><div style="font-size:0.65rem;color:#8c7da1;">Room ${escapeHtml(e.room || '—')}</div></div>`;
                });
                html += '</div>';
            } else {
                html += '<div class="timetable-cell" style="background:#fafaff;"><span class="timetable-empty">—</span></div>';
            }
        });
    });

    grid.innerHTML = html;
    document.getElementById('teacherTimetableCountBadge').innerText = count;
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════
function renderTeacherProfile() {
    const t = currentTeacher;
    if (!t) return;
    document.getElementById('profileName').textContent = t.name || '—';
    document.getElementById('profileEmail').textContent = t.email || '—';
    document.getElementById('profilePhone').textContent = t.phone || '—';
    document.getElementById('profileUsername').textContent = t.username || '—';
    document.getElementById('profileSubjects').textContent = t.subject || '—';
    document.getElementById('profileClasses').textContent = t.assignedClass || '—';
    document.getElementById('profileDateJoined').textContent = t.dateJoined || '—';
}

function saveTeacherPassword() {
    const current = document.getElementById('teacherCurrentPass').value;
    const newPass = document.getElementById('teacherNewPass').value;
    const confirm = document.getElementById('teacherConfirmPass').value;
    const errEl = document.getElementById('teacherPassError');

    if (!current || !newPass || !confirm) {
        errEl.textContent = '❌ All fields are required.'; return;
    }
    if (current !== currentTeacher.password) {
        errEl.textContent = '❌ Current password is incorrect.'; return;
    }
    if (newPass.length < 4) {
        errEl.textContent = '❌ New password must be at least 4 characters.'; return;
    }
    if (newPass !== confirm) {
        errEl.textContent = '❌ New passwords do not match.'; return;
    }

    currentTeacher.password = newPass;
    saveData();
    errEl.style.color = '#27ae60';
    errEl.textContent = '✅ Password changed successfully!';

    document.getElementById('teacherCurrentPass').value = '';
    document.getElementById('teacherNewPass').value = '';
    document.getElementById('teacherConfirmPass').value = '';

    showToast('✅ Password updated!');
    setTimeout(() => { errEl.textContent = ''; errEl.style.color = '#e74c3c'; }, 3000);
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE MODAL (read-only for teachers)
// ═══════════════════════════════════════════════════════════════
function openTeacherPerfModal(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) { showToast('Student not found.', true); return; }
    if (!getMyClassNames().includes(student.class)) {
        showToast('Access denied.', true); return;
    }

    const modal = document.getElementById('teacherPerfModal');
    const content = document.getElementById('teacherPerfContent');

    const classStudents = students.filter(s => s.class === student.class && s.status === 'Active');
    const studentGrades = examGrades.filter(g => g.studentId === studentId);
    const subjectMap = {};

    studentGrades.forEach(g => {
        const exam = exams.find(e => e.id === g.examId);
        if (!exam) return;
        const subject = exam.subject;
        if (!subjectMap[subject]) subjectMap[subject] = { totalScore: 0, totalMax: 0 };
        subjectMap[subject].totalScore += g.score;
        subjectMap[subject].totalMax += exam.maxScore || 100;
    });

    const subjectResults = Object.entries(subjectMap).map(([subject, d]) => {
        const pct = d.totalMax > 0 ? (d.totalScore / d.totalMax) * 100 : 0;
        return { subject, pct, grade: pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F' };
    }).sort((a, b) => b.pct - a.pct);

    const overallAvg = subjectResults.length
        ? subjectResults.reduce((s, r) => s + r.pct, 0) / subjectResults.length
        : 0;
    const overallGrade = overallAvg >= 90 ? 'A' : overallAvg >= 80 ? 'B' : overallAvg >= 70 ? 'C' : overallAvg >= 60 ? 'D' : 'F';

    const allAvgs = classStudents.map(s => {
        const sg = examGrades.filter(g => g.studentId === s.id);
        let ts = 0, tm = 0;
        sg.forEach(g => {
            const e = exams.find(ex => ex.id === g.examId);
            if (e) { ts += g.score; tm += e.maxScore || 100; }
        });
        return { id: s.id, avg: tm > 0 ? (ts / tm) * 100 : 0 };
    }).sort((a, b) => b.avg - a.avg);
    const rank = allAvgs.findIndex(a => a.id === studentId) + 1 || '—';

    const att = getStudentAttendancePct(studentId);
    const attPct = att ? att.pct : 0;
    const attColor = attPct >= 90 ? '#27ae60' : attPct >= 75 ? '#2ecc71' : attPct >= 60 ? '#f39c12' : '#e74c3c';

    content.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#27ae60,#2ecc71);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:700;flex-shrink:0;">${escapeHtml(student.name.charAt(0))}</div>
            <div>
                <div style="font-size:1.3rem;font-weight:700;color:#2c3e50;">${escapeHtml(student.name)}</div>
                <div style="font-size:0.85rem;color:#8c7da1;">${escapeHtml(student.class)} · ID: ${student.id}</div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
            <div style="background:#e8f8ed;border-radius:12px;padding:14px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:800;color:#1e8449;">${overallAvg.toFixed(1)}%</div>
                <div style="font-size:0.75rem;color:#8c7da1;margin-top:2px;">Overall Avg</div>
            </div>
            <div style="background:#e8f8ed;border-radius:12px;padding:14px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:800;color:${getGradeColor(overallGrade)};">${overallGrade}</div>
                <div style="font-size:0.75rem;color:#8c7da1;margin-top:2px;">Grade</div>
            </div>
            <div style="background:#e8f8ed;border-radius:12px;padding:14px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:800;color:#1e8449;">#${rank}</div>
                <div style="font-size:0.75rem;color:#8c7da1;margin-top:2px;">of ${classStudents.length}</div>
            </div>
            <div style="background:${attColor}20;border-radius:12px;padding:14px;text-align:center;">
                <div style="font-size:1.6rem;font-weight:800;color:${attColor};">${att ? attPct.toFixed(0) + '%' : '—'}</div>
                <div style="font-size:0.75rem;color:#8c7da1;margin-top:2px;">Attendance</div>
            </div>
        </div>

        <h3 style="font-size:1rem;font-weight:700;color:#2c3e50;margin:16px 0 10px;border-left:4px solid #27ae60;padding-left:12px;">Subject-Wise Results</h3>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                <thead>
                    <tr style="background:#e8f8ed;">
                        <th style="text-align:left;padding:10px 12px;font-weight:700;">Subject</th>
                        <th style="text-align:left;padding:10px 12px;font-weight:700;">Score</th>
                        <th style="text-align:left;padding:10px 12px;font-weight:700;">Grade</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjectResults.length ? subjectResults.map(r => `
                        <tr style="border-bottom:1px solid #ede5f7;">
                            <td style="padding:10px 12px;"><strong>${escapeHtml(r.subject)}</strong></td>
                            <td style="padding:10px 12px;">${r.pct.toFixed(1)}%</td>
                            <td style="padding:10px 12px;"><span class="grade-range ${getGradeClass(r.grade)}">${r.grade}</span></td>
                        </tr>
                    `).join('') : `<tr><td colspan="3" style="padding:20px;text-align:center;color:#95a5a6;">No exam data yet.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;

    modal.classList.add('active');
}

function closeTeacherPerfModal() {
    document.getElementById('teacherPerfModal').classList.remove('active');
}

// ═══════════════════════════════════════════════════════════════
// BIND EVENTS
// ═══════════════════════════════════════════════════════════════
function bindEvents() {
    document.getElementById('teacherLoginForm').addEventListener('submit', handleTeacherLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleTeacherLogout);

    document.getElementById('hamburgerToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

    document.querySelectorAll('.sidebar-nav .nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', () => switchTab(item.getAttribute('data-tab')));
    });

    document.getElementById('createTeacherExamBtn').onclick = openTeacherExamModal;
    document.getElementById('closeTeacherExamModal').onclick = closeTeacherExamModal;
    document.getElementById('saveTeacherExamBtn').onclick = saveTeacherExam;

    document.getElementById('searchMyStudents').addEventListener('input', e => {
        teacherSearchQuery = e.target.value;
        renderMyStudents();
    });
    document.getElementById('myStudentClassFilter').addEventListener('change', e => {
        teacherClassFilter = e.target.value;
        renderMyStudents();
    });

    document.getElementById('teacherAttendanceDate').addEventListener('change', renderTeacherAttendanceGrid);
    document.getElementById('teacherAttendanceClass').addEventListener('change', renderTeacherAttendanceGrid);
    document.getElementById('teacherMarkAllPresentBtn').onclick = teacherMarkAllPresent;
    document.getElementById('teacherClearBtn').onclick = teacherClearDay;
    document.getElementById('teacherApplyFilter').onclick = renderTeacherAttendanceSummary;
    document.querySelectorAll('.teacher-sub-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTeacherAttendSubTab(tab.getAttribute('data-teachertab')));
    });

    document.getElementById('teacherTimetableClassFilter').addEventListener('change', renderTeacherTimetable);

    document.getElementById('teacherSavePasswordBtn').onclick = saveTeacherPassword;

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSidebar();
            closeTeacherPerfModal();
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
function initTeacherUI() {
    applySettings();
    document.getElementById('userDisplayName').textContent = currentTeacher.name;
    switchTab('dashboard');
}

function init() {
    const hasData = loadData();
    loadSettings();

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            timetable = parsed.timetable || [];
        } catch (e) { timetable = []; }
    }

    bindEvents();

    if (!hasData) {
        showTeacherLogin();
        document.getElementById('teacherLoginError').textContent = '⚠️ No data found. Please ask the admin to set up the system first.';
        return;
    }

    const sess = getSession();
    if (sess && sess.role === 'admin') {
        clearSession();
    }

    if (isTeacherLoggedIn()) {
        hideTeacherLogin();
        initTeacherUI();
        showToast(`✅ Welcome back, ${currentTeacher.name}!`);
    } else {
        showTeacherLogin();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ─── EXPOSE GLOBALS ───
window.viewClassStudents = viewClassStudents;
window.openTeacherPerfModal = openTeacherPerfModal;
window.closeTeacherPerfModal = closeTeacherPerfModal;
window.openTeacherGradeEntry = openTeacherGradeEntry;
window.closeTeacherGradeEntry = closeTeacherGradeEntry;
window.deleteTeacherExam = deleteTeacherExam;
window.exportMyStudentsCSV = exportMyStudentsCSV;
window.exportMyExamsCSV = exportMyExamsCSV;
window.switchTab = switchTab;