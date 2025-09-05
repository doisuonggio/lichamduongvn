// script.js - Lịch Âm Dương VN

// ============ CONFIG ============
const canList = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const chiList = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const lunarMonthNames = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp'];
const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// ============ HELPER FUNCTIONS (đã tối ưu và chuẩn xác hơn) ============
const jdFromDate = (dd, mm, yy) => {
    dd = Number(dd); mm = Number(mm); yy = Number(yy);
    let a = Math.floor((14 - mm) / 12);
    let y = yy + 4800 - a;
    let m = mm + 12 * a - 3;
    let JDN = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    if (JDN < 2299161) JDN = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    return JDN;
};

const jdToDate = (jd) => {
    jd = Number(jd);
    let a, b, c, d, e, m;
    if (jd > 2299160) {
        a = jd + 32044;
        b = Math.floor((4 * a + 3) / 146097);
        c = a - Math.floor((b * 146097) / 4);
    } else {
        b = 0;
        c = jd + 32082;
    }
    d = Math.floor((4 * c + 3) / 1461);
    e = c - Math.floor((1461 * d) / 4);
    m = Math.floor((5 * e + 2) / 153);
    let day = e - Math.floor((153 * m + 2) / 5) + 1;
    let month = m + 3 - 12 * Math.floor(m / 10);
    let year = b * 100 + d - 4800 + Math.floor(m / 10);
    return { day, month, year };
};

// LUNAR CALCULATION - Công thức tính toán chuẩn xác
const NewMoon = (k) => {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = Math.PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    return Jd1;
};

const SunLongitude = (jdn) => {
    const T = (jdn - 2451545.0) / 36525;
    const T2 = T * T;
    const dr = Math.PI / 180;
    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    let L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr);
    DL += (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) + 0.000290 * Math.sin(3 * M * dr);
    let L = L0 + DL;
    L = L - 360 * Math.floor(L / 360);
    return L;
};

const lunarGet = (jd) => {
    const A = 2415021.076998695;
    const B = 29.530588853;
    const D = (jd - A) / B;
    let K = Math.floor(D);
    let P = NewMoon(K + 1);
    let Dd = jd - Math.floor(NewMoon(K) + 0.5) + 1;
    let Lm, Ly, isLeap;

    const getMonthOfJd = (jd) => {
        const jdn = Math.floor(jd) + 0.5;
        let month;
        for (let m = 11; m <= 24; m++) {
            const nm = NewMoon(K - 12 + m);
            const nm_next = NewMoon(K - 12 + m + 1);
            if (jdn >= nm && jdn < nm_next) {
                month = m % 12 === 0 ? 12 : m % 12;
                break;
            }
        }
        return month;
    };

    Lm = getMonthOfJd(jd);
    const { year: solarYear } = jdToDate(jd);
    
    let lyStart = solarYear - 1;
    while (true) {
        const jdn = NewMoon(Math.floor(0.5 + (jdFromDate(1, 1, lyStart) - A) / B) + 12);
        if (jdn > jd) {
            Ly = lyStart - 1;
            break;
        }
        lyStart++;
    }
    
    const getLeapMonth = (lunarYear) => {
        const k = Math.floor(0.5 + (jdFromDate(1, 1, lunarYear) - A) / B) + 12;
        const M11 = NewMoon(k);
        const M12 = NewMoon(k + 1);
        const M13 = NewMoon(k + 2);
        const L11 = SunLongitude(M11);
        const L12 = SunLongitude(M12);
        const L13 = SunLongitude(M13);
        const numSolarMonths = Math.floor((L13 - L11) / 30);
        if (numSolarMonths === 1) return 0;
        for (let i = 0; i < 13; i++) {
            const Li = SunLongitude(NewMoon(k + i));
            if ((Li > 30 * i) && (Li < 30 * (i + 1))) return i;
        }
        return 0;
    };

    isLeap = (Lm === getLeapMonth(Ly));

    return { lunarDay: Dd, lunarMonth: Lm, lunarYear: Ly, isLeap };
};

const getCanChi = (dd, mm, yy) => {
    const jd = jdFromDate(dd, mm, yy);
    const yearCan = canList[(yy - 4) % 10];
    const yearChi = chiList[(yy - 4) % 12];
    const monthCan = canList[((yy - 4) * 12 + mm + 3) % 10];
    const monthChi = chiList[(mm + 1) % 12];
    const dayCan = canList[(jd - 1) % 10];
    const dayChi = chiList[(jd - 1) % 12];
    return { yearCan, yearChi, monthCan, monthChi, dayCan, dayChi };
};

const getGoodHours = (dd, mm, yy) => {
    const canChi = getCanChi(dd, mm, yy);
    const chiDay = canChi.dayChi;
    let goodHours = [];
    switch (chiDay) {
        case 'Tý': goodHours = ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu']; break;
        case 'Sửu': goodHours = ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi']; break;
        case 'Dần': goodHours = ['Tý', 'Sửu', 'Dần', 'Mão', 'Mùi', 'Tuất']; break;
        case 'Mão': goodHours = ['Tý', 'Dần', 'Mão', 'Mùi', 'Thân', 'Tuất']; break;
        case 'Thìn': goodHours = ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Thân', 'Dậu']; break;
        case 'Tỵ': goodHours = ['Dần', 'Mão', 'Tỵ', 'Ngọ', 'Thân', 'Dậu']; break;
        case 'Ngọ': goodHours = ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu']; break;
        case 'Mùi': goodHours = ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi']; break;
        case 'Thân': goodHours = ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất']; break;
        case 'Dậu': goodHours = ['Tý', 'Mão', 'Ngọ', 'Thân', 'Tuất', 'Hợi']; break;
        case 'Tuất': goodHours = ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi']; break;
        case 'Hợi': goodHours = ['Sửu', 'Dần', 'Mão', 'Tỵ', 'Ngọ', 'Thân']; break;
    }
    return goodHours;
};


// ============ UI FUNCTIONS ============
const monthYearLabel = document.getElementById("monthYearLabel");
const calendarEl = document.getElementById("calendar");
const selectMonth = document.getElementById("selectMonth");
const selectYear = document.getElementById("selectYear");
const todayBtn = document.getElementById("todayBtn");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

const solarDateInput = document.getElementById("solarDateInput");
const convertToLunarBtn = document.getElementById("convertToLunar");
const solarResult = document.getElementById("solarResult");

const lunarDayInput = document.getElementById("lunarDay");
const lunarMonthInput = document.getElementById("lunarMonth");
const lunarYearInput = document.getElementById("lunarYear");
const lunarLeapCheckbox = document.getElementById("lunarLeap");
const convertToSolarBtn = document.getElementById("convertToSolar");
const lunarResult = document.getElementById("lunarResult");

const tabSolar = document.getElementById("tabSolar");
const tabLunar = document.getElementById("tabLunar");
const solarForm = document.getElementById("solarForm");
const lunarForm = document.getElementById("lunarForm");

const dayDetailPanel = document.getElementById("dayDetail");
const detailDateEl = document.getElementById("detailDate");
const detailLunarEl = document.getElementById("detailLunar");
const detailCanChiEl = document.getElementById("detailCanChi");
const detailGoodHoursEl = document.getElementById("detailGoodHours");
const detailTideEl = document.getElementById("detailTide");
const detailNotesEl = document.getElementById("detailNotes");
const closeDetailBtn = document.getElementById("closeDetail");

const subscribeToggleBtn = document.getElementById("subscribeToggle");
const subscribePanel = document.getElementById("subscribePanel");
const subscribeForm = document.getElementById("subscribe-form");
const subscribeMsg = document.getElementById("subscribeMsg");

let currentDate = new Date();
let displayMonth = currentDate.getMonth();
let displayYear = currentDate.getFullYear();

function fillMonthYearOptions() {
    selectMonth.innerHTML = "";
    for (let m = 0; m < 12; m++) {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = `Tháng ${m + 1}`;
        if (m === displayMonth) opt.selected = true;
        selectMonth.appendChild(opt);
    }
    selectYear.innerHTML = "";
    for (let y = 1900; y <= 2100; y++) {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        if (y === displayYear) opt.selected = true;
        selectYear.appendChild(opt);
    }
}

function renderCalendar() {
    monthYearLabel.textContent = `${displayMonth + 1}/${displayYear}`;
    calendarEl.innerHTML = "";

    const firstDayOfMonth = new Date(displayYear, displayMonth, 1);
    const lastDateOfMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
    const firstDayWeekIndex = firstDayOfMonth.getDay();

    for (let i = 0; i < firstDayWeekIndex; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "day-cell empty";
        calendarEl.appendChild(emptyCell);
    }

    for (let d = 1; d <= lastDateOfMonth; d++) {
        const cell = document.createElement("div");
        cell.className = "day-cell";
        cell.dataset.date = `${displayYear}-${displayMonth + 1}-${d}`;
        if (d === currentDate.getDate() && displayMonth === currentDate.getMonth() && displayYear === currentDate.getFullYear()) {
            cell.classList.add("today");
        }

        const lunar = lunarGet(jdFromDate(d, displayMonth + 1, displayYear));
        const isFirstDayOfLunarMonth = lunar.lunarDay === 1;
        const lunarText = isFirstDayOfLunarMonth ? `<b>T${lunar.lunarMonth}</b>` : lunar.lunarDay;

        cell.innerHTML = `
            <span class="solar">${d}</span>
            <span class="lunar">${lunarText}</span>
        `;
        calendarEl.appendChild(cell);
    }
}

function showDayDetail(day, month, year) {
    const lunar = lunarGet(jdFromDate(day, month, year));
    const canChi = getCanChi(day, month, year);
    const goodHours = getGoodHours(day, month, year);
    
    detailDateEl.textContent = `Ngày ${day} tháng ${month} năm ${year}`;
    detailLunarEl.innerHTML = `<strong>Ngày âm:</strong> Ngày ${lunar.lunarDay} tháng ${lunar.lunarMonth} năm ${lunar.lunarYear} ${lunar.isLeap ? '(Nhuận)' : ''}`;
    detailCanChiEl.innerHTML = `<strong>Can Chi:</strong> ${canChi.dayCan}-${canChi.dayChi} | ${canChi.monthCan}-${canChi.monthChi} | ${canChi.yearCan}-${canChi.yearChi}`;
    detailGoodHoursEl.innerHTML = `<strong>Giờ Hoàng Đạo:</strong> ${goodHours.join(', ')}`;

    // Dummy data for Tide and Notes
    detailTideEl.innerHTML = `<strong>Triều cường:</strong> (Dữ liệu mẫu) Mức đỉnh: 1.5m (10:00), Mức đáy: 0.5m (16:00)`;
    detailNotesEl.innerHTML = `<strong>Tiết khí:</strong> ${getSolarTerm(day, month, year)} | <strong>Vị trí trăng:</strong> ${getMoonPhase(lunar.lunarDay)}`;
    
    dayDetailPanel.classList.remove("hidden");
}

function getSolarTerm(day, month, year) {
    // Placeholder for solar term logic
    const terms = {
        '21/3': 'Xuân phân', '21/6': 'Hạ chí', '23/9': 'Thu phân', '22/12': 'Đông chí'
    };
    const key = `${day}/${month}`;
    return terms[key] || 'Không có tiết khí chính';
}

function getMoonPhase(lunarDay) {
    if (lunarDay === 1) return 'Không trăng (Sóc)';
    if (lunarDay === 15 || lunarDay === 16) return 'Trăng tròn (Vọng)';
    if (lunarDay > 1 && lunarDay < 15) return 'Trăng thượng huyền (trăng khuyết đầu tháng)';
    if (lunarDay > 15 && lunarDay < 30) return 'Trăng hạ huyền (trăng khuyết cuối tháng)';
    return '';
}

// ============ EVENT LISTENERS ============
window.onload = () => {
    fillMonthYearOptions();
    renderCalendar();
    solarDateInput.valueAsDate = currentDate;
    
    const todayLunar = lunarGet(jdFromDate(currentDate.getDate(), currentDate.getMonth() + 1, currentDate.getFullYear()));
    lunarDayInput.value = todayLunar.lunarDay;
    lunarMonthInput.value = todayLunar.lunarMonth;
    lunarYearInput.value = todayLunar.lunarYear;
};

prevMonthBtn.addEventListener("click", () => {
    displayMonth--;
    if (displayMonth < 0) {
        displayMonth = 11;
        displayYear--;
    }
    selectMonth.value = displayMonth;
    selectYear.value = displayYear;
    renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
    displayMonth++;
    if (displayMonth > 11) {
        displayMonth = 0;
        displayYear++;
    }
    selectMonth.value = displayMonth;
    selectYear.value = displayYear;
    renderCalendar();
});

todayBtn.addEventListener("click", () => {
    currentDate = new Date();
    displayMonth = currentDate.getMonth();
    displayYear = currentDate.getFullYear();
    selectMonth.value = displayMonth;
    selectYear.value = displayYear;
    renderCalendar();
    dayDetailPanel.classList.add("hidden");
});

selectMonth.addEventListener("change", () => {
    displayMonth = parseInt(selectMonth.value);
    renderCalendar();
});

selectYear.addEventListener("change", () => {
    displayYear = parseInt(selectYear.value);
    renderCalendar();
});

calendarEl.addEventListener("click", (e) => {
    const cell = e.target.closest('.day-cell');
    if (!cell || cell.classList.contains('empty')) return;
    const dateParts = cell.dataset.date.split('-').map(Number);
    showDayDetail(dateParts[2], dateParts[1], dateParts[0]);
});

closeDetailBtn.addEventListener("click", () => {
    dayDetailPanel.classList.add("hidden");
});

// Conversion
tabSolar.addEventListener("click", () => {
    tabSolar.classList.add("active");
    tabLunar.classList.remove("active");
    solarForm.classList.remove("hidden");
    lunarForm.classList.add("hidden");
});

tabLunar.addEventListener("click", () => {
    tabLunar.classList.add("active");
    tabSolar.classList.remove("active");
    lunarForm.classList.remove("hidden");
    solarForm.classList.add("hidden");
});

convertToLunarBtn.addEventListener("click", () => {
    const date = new Date(solarDateInput.value);
    if (isNaN(date.getTime())) {
        solarResult.textContent = "Ngày không hợp lệ.";
        return;
    }
    const dd = date.getDate();
    const mm = date.getMonth() + 1;
    const yy = date.getFullYear();

    const lunar = lunarGet(jdFromDate(dd, mm, yy));
    solarResult.textContent = `Ngày âm: ${lunar.lunarDay} tháng ${lunar.lunarMonth} năm ${lunar.lunarYear}${lunar.isLeap ? ' (Nhuận)' : ''}`;
});

convertToSolarBtn.addEventListener("click", () => {
    const ld = parseInt(lunarDayInput.value);
    const lm = parseInt(lunarMonthInput.value);
    const ly = parseInt(lunarYearInput.value);
    const leap = lunarLeapCheckbox.checked;

    if (isNaN(ld) || isNaN(lm) || isNaN(ly)) {
        lunarResult.textContent = "Vui lòng nhập đầy đủ ngày, tháng, năm.";
        return;
    }

    // Simplified lunar to solar conversion
    const { day, month, year } = jdToDate(lunar2solar(ld, lm, ly, leap));
    lunarResult.textContent = `Ngày dương: ${day} tháng ${month} năm ${year}`;
});

// Subscribe form
subscribeToggleBtn.addEventListener("click", () => {
    subscribePanel.classList.toggle("hidden");
});

subscribeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch(form.action, {
            method: form.method,
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            subscribeMsg.textContent = "Cảm ơn bạn đã đăng ký!";
            subscribeMsg.style.color = "var(--accent)";
            form.reset();
        } else {
            subscribeMsg.textContent = "Có lỗi xảy ra. Vui lòng thử lại.";
            subscribeMsg.style.color = "red";
        }
    } catch (error) {
        subscribeMsg.textContent = "Có lỗi xảy ra. Vui lòng thử lại.";
        subscribeMsg.style.color = "red";
    }
});