// ==============================
// script.js - Lịch Âm Dương VN
// ==============================
/*
  This file implements:
  - solar <-> lunar conversion (popular algorithm)
  - calendar rendering (month view)
  - day detail display (can-chi, lunar date, tide demo)
  Notes: algorithm is common approximation used in many VN projects.
*/

// ---------- Utilities ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const pad = (n) => (n<10? '0'+n: n);

// ---------- Julian day conversion ----------
function jdFromDate(dd, mm, yy){
  // Gregorian calendar date to JD (12:00 UT)
  let a = Math.floor((14 - mm) / 12);
  let y = yy + 4800 - a;
  let m = mm + 12*a - 3;
  let jd = dd + Math.floor((153*m + 2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
  return jd;
}

function jdToDate(jd){
  // JD to Gregorian date (integer)
  let Z = jd;
  let A = Z;
  let alpha = Math.floor((A - 1867216.25)/36524.25);
  A = A + 1 + alpha - Math.floor(alpha/4);
  let B = A + 1524;
  let C = Math.floor((B - 122.1)/365.25);
  let D = Math.floor(365.25*C);
  let E = Math.floor((B - D)/30.6001);
  let day = B - D - Math.floor(30.6001*E);
  let month = (E < 14) ? E - 1 : E - 13;
  let year = (month > 2) ? C - 4716 : C - 4715;
  return { day, month, year };
}

// ---------- Astronomical helpers (approximate Meeus) ----------
const PI = Math.PI;
function normalizeAngle(a){
  a = a % (2*PI);
  if (a < 0) a += 2*PI;
  return a;
}

// Mean new moon (approx) and corrections from Meeus simplified
function meanNewMoon(k){
  // k is integer cycle number
  // returns approximate Julian Ephemeris Day (JE)
  const T = k / 1236.85;
  const T2 = T*T;
  const T3 = T2*T;
  let JDE = 2451550.09765 + 29.530588853 * k
            + 0.0001337 * T2 - 0.000000150 * T3 + 0.00000000073 * T*T3;
  return JDE;
}

function sunLongitude(jd){
  // compute Sun's mean longitude (radians) using simplified formula
  const T = (jd - 2451545.0)/36525.0;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T*T;
  return normalizeAngle(L0 * PI/180);
}

function moonLongitude(jd){
  // simplified mean longitude for Moon (rough)
  const T = (jd - 2451545.0)/36525.0;
  // mean elongation etc can be added; for lunar phase root-finding we use mean elongation approx
  const Lm = 218.3165 + 481267.8813 * T;
  return normalizeAngle(Lm * PI/180);
}

function newMoonNear(jdGuess){
  // find new moon JD near guess via secant method on elongation = moonLong - sunLong = 0
  let t1 = jdGuess;
  let d = 1; // day step
  let f = (x) => normalizeAngle(moonLongitude(x) - sunLongitude(x));
  let F1 = f(t1);
  let t2 = t1 + d;
  let F2 = f(t2);
  for (let i=0;i<30;i++){
    if (Math.abs(F2 - F1) < 1e-8) break;
    let t3 = t2 - F2 * (t2 - t1) / (F2 - F1);
    t1 = t2; F1 = F2;
    t2 = t3; F2 = f(t2);
    if (Math.abs(t2 - t1) < 1e-6) break;
  }
  return t2; // JD approx
}

// ---------- Lunar month / leap month detection (simplified VN rules) ----------
function getLunarMonth11(yy, timeZone){
  // returns Julian day of the 11th month in year yy
  const off = jdFromDate(31,12,yy) - 2415021; // approx cycles from 1900-01-01
  let k = Math.floor(off / 29.530588853);
  let nm = newMoonNear(meanNewMoon(k+1));
  // convert to local time zone
  let jdLocal = Math.floor(nm + 0.5 + timeZone/24.0);
  return jdLocal;
}

function getLeapMonthOffset(a11, timeZone){
  // simplified: return 0 or 1 (rare)
  // For robust behavior, search next 12 new moons and check sun longitude changes for principal terms
  let k = Math.floor((a11 - 2415021.076998695)/29.530588853 + 0.5);
  let last = sunLongitude(newMoonNear(meanNewMoon(k+1)));
  for (let i=1;i<=13;i++){
    let nm = newMoonNear(meanNewMoon(k + i));
    let sl = sunLongitude(nm);
    if (Math.floor(sl*180/PI /30) !== Math.floor(last*180/PI /30)) {
      return i-1;
    }
  }
  return 0;
}

// ---------- Convert solar -> lunar (returns object) ----------
function convertSolar2Lunar(dd, mm, yy, timeZone=7){
  // Following common algorithm (approx) used widely in VN projects
  let jd = jdFromDate(dd, mm, yy);
  let k = Math.floor((jd - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonNear(meanNewMoon(k+1));
  // shift to local midnight
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = getLunarMonth11(yy+1, timeZone);
  if (a11 >= b11) {
    b11 = getLunarMonth11(yy+1, timeZone);
  }
  let lunarDay = Math.floor(jd - Math.floor(monthStart + 0.5 - timeZone/24.0)) + 1;
  // approximate month number calculation:
  let kMonth = Math.floor((monthStart - a11)/29.530588853 + 0.5);
  let lunarMonth = (kMonth + 11) % 12 + 1;
  let lunarYear = yy;
  if (lunarMonth > 11 && (dd < 31 && mm < 12)) lunarYear = yy - 1;
  // check leap month (we simplify and set leap=false)
  let isLeap = false;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: isLeap };
}

// ---------- Can-Chi ----------
const CAN = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const CHI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];

function canChiOfDate(dd,mm,yy){
  // day can/chi via jd
  let jd = jdFromDate(dd,mm,yy);
  let dayIndex = (jd + 9) % 10;
  let chiIndex = (jd + 1) % 12;
  let dayCan = CAN[(dayIndex+10)%10];
  let dayChi = CHI[(chiIndex+12)%12];
  // month can/chi: simplified using month number
  // year can/chi:
  let yCan = CAN[(yy + 6) % 10];
  let yChi = CHI[(yy + 8) % 12];
  return { day: dayCan + " " + dayChi, month: "Tháng " + mm, year: yCan + " " + yChi };
}

// ---------- Good hours (basic hoàng đạo mapping) ----------
const HOANG_DAO = {
  "Tý":["23:00-01:00","Ngon cho xuất hành"],
  "Sửu":["01:00-03:00"],
  "Dần":["03:00-05:00"],
  "Mão":["05:00-07:00"],
  "Thìn":["07:00-09:00"],
  "Tỵ":["09:00-11:00"],
  "Ngọ":["11:00-13:00"],
  "Mùi":["13:00-15:00"],
  "Thân":["15:00-17:00"],
  "Dậu":["17:00-19:00"],
  "Tuất":["19:00-21:00"],
  "Hợi":["21:00-23:00"]
};

function goodHoursForDate(dd,mm,yy){
  // Very basic: pick day chi and map
  let cc = canChiOfDate(dd,mm,yy);
  let dayChi = cc.day.split(' ').pop();
  let hours = HOANG_DAO[dayChi] || [];
  return hours;
}

// ---------- Tidal demo (simple harmonic sample) ----------
const TIDE_STATIONS = {
  saigon: { name:"Sài Gòn", sample:"Triều cao nhất ~1.45m lúc 05:30; Triều thấp nhất ~0.25m lúc 11:20" },
  cantho: { name:"Cần Thơ", sample:"Triều cao nhất ~1.35m lúc 06:00; Triều thấp nhất ~0.20m lúc 11:50" },
  vungtau: { name:"Vũng Tàu", sample:"Triều cao nhất ~1.60m lúc 04:50; Triều thấp nhất ~0.15m lúc 10:40" }
};

// ---------- Rendering calendar ----------
const monthNames = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const dayNames = ["CN","T2","T3","T4","T5","T6","T7"];

let viewDate = new Date();
let viewMonth = viewDate.getMonth(); // 0-index
let viewYear = viewDate.getFullYear();

function buildMonthControls(){
  const selY = $("#selectYear");
  const selM = $("#selectMonth");
  selY.innerHTML = "";
  for(let y=viewYear-5;y<=viewYear+5;y++){
    let opt = document.createElement("option");
    opt.value = y; opt.textContent = y; if (y===viewYear) opt.selected=true;
    selY.appendChild(opt);
  }
  selM.innerHTML = "";
  for(let m=0;m<12;m++){
    let opt = document.createElement("option");
    opt.value = m; opt.textContent = monthNames[m]; if (m===viewMonth) opt.selected=true;
    selM.appendChild(opt);
  }
  selY.addEventListener("change",()=>{ viewYear = parseInt(selY.value); renderCalendar(); });
  selM.addEventListener("change",()=>{ viewMonth = parseInt(selM.value); renderCalendar(); });
}

function renderCalendar(){
  $("#monthYearLabel").textContent = `${monthNames[viewMonth]} ${viewYear}`;
  const cal = $("#calendar");
  cal.innerHTML = "";
  // day names
  for(let d=0;d<7;d++){
    const dn = document.createElement("div"); dn.className="day-name"; dn.textContent = dayNames[d];
    cal.appendChild(dn);
  }
  // first day of month
  let first = new Date(viewYear, viewMonth, 1);
  let startDay = first.getDay(); // 0 Sun ... 6 Sat
  // days in month
  let daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  // fill blanks
  for(let i=0;i<startDay;i++){
    const blank = document.createElement("div"); blank.className="day-cell"; blank.style.opacity=0.2; cal.appendChild(blank);
  }
  // create day cells
  for(let d=1; d<=daysInMonth; d++){
    const cell = document.createElement("div"); cell.className="day-cell";
    const solar = document.createElement("div"); solar.className="solar"; solar.textContent = d;
    const dt = convertSolar2Lunar(d, viewMonth+1, viewYear, 7);
    const lunar = document.createElement("div"); lunar.className="lunar"; lunar.textContent = `${dt.day}/${dt.month}${dt.leap? ' (nhuận)':''}`;
    cell.appendChild(solar);
    cell.appendChild(lunar);
    // badge for today
    const today = new Date();
    if (viewYear===today.getFullYear() && viewMonth===today.getMonth() && d===today.getDate()){
      const b = document.createElement("div"); b.className="badge"; b.textContent="Hôm nay"; cell.appendChild(b);
    }
    cell.addEventListener("click", (ev)=>{
      showDayDetail(d, viewMonth+1, viewYear);
    });
    cal.appendChild(cell);
  }
}

function showDayDetail(dd, mm, yy){
  const lunar = convertSolar2Lunar(dd, mm, yy, 7);
  $("#detailDate").textContent = `${dd}/${mm}/${yy}`;
  $("#detailLunar").innerHTML = `<strong>Âm lịch:</strong> ${lunar.day}/${lunar.month}/${lunar.year} ${lunar.leap? '(nhuận)':''}`;
  const cc = canChiOfDate(dd,mm,yy);
  $("#detailCanChi").innerHTML = `<strong>Can - Chi:</strong> Ngày ${cc.day}, Năm ${cc.year}`;
  // good hours
  const gh = goodHoursForDate(dd,mm,yy);
  $("#detailNotes").innerHTML = `<strong>Giờ hoàng đạo (gợi ý):</strong> ${gh.length? gh.join(", ") : 'Không có dữ liệu'} `;
  // tide demo
  $("#detailTide").innerHTML = `<strong>Triều cường (mẫu):</strong><br>
    ${TIDE_STATIONS.saigon.name}: ${TIDE_STATIONS.saigon.sample}<br>
    ${TIDE_STATIONS.cantho.name}: ${TIDE_STATIONS.cantho.sample}<br>
    ${TIDE_STATIONS.vungtau.name}: ${TIDE_STATIONS.vungtau.sample}`;
  $(".detail-panel").classList.remove("hidden");
}

// close
$("#closeDetail").addEventListener("click", ()=>{
  $(".detail-panel").classList.add("hidden");
});

// prev/next
$("#prevMonth").addEventListener("click", ()=>{
  if (viewMonth===0){ viewMonth=11; viewYear-=1;} else viewMonth-=1;
  $("#selectMonth").value = viewMonth; $("#selectYear").value=viewYear;
  renderCalendar();
});
$("#nextMonth").addEventListener("click", ()=>{
  if (viewMonth===11){ viewMonth=0; viewYear+=1;} else viewMonth+=1;
  $("#selectMonth").value = viewMonth; $("#selectYear").value=viewYear;
  renderCalendar();
});
$("#todayBtn").addEventListener("click", ()=>{
  const t = new Date();
  viewMonth = t.getMonth(); viewYear = t.getFullYear();
  $("#selectMonth").value = viewMonth; $("#selectYear").value = viewYear;
  renderCalendar();
});

// subscribe toggle
$("#subscribeToggle").addEventListener("click", ()=>{
  const p = $("#subscribePanel");
  p.classList.toggle("hidden");
});

// subscribe form
$("#subscribe-form").addEventListener("submit", function(e){
  e.preventDefault();
  const f = e.target;
  const data = new FormData(f);
  const msg = $("#subscribeMsg");
  fetch(f.action, {method:'POST', body: data, headers: {'Accept':'application/json'}})
    .then(r=> r.ok ? msg.textContent="✅ Cảm ơn! Chúng tôi đã nhận email." : msg.textContent="❌ Lỗi, thử lại.")
    .catch(()=> msg.textContent="⚠️ Không gửi được. Vui lòng thử lại.");
  f.reset();
});

// init
function init(){
  buildMonthControls();
  renderCalendar();
}
init();
