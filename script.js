// script.js - Lịch Âm Dương VN (chuẩn tuyệt đối)

// ============ CONFIG ============
const canList = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const chiList = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const lunarMonthNames = ['Giêng','Hai','Ba','Tư','Năm','Sáu','Bảy','Tám','Chín','Mười','Mười Một','Chạp'];

// ============ HELPER FUNCTIONS ============

// Convert Gregorian date to Julian day number
function jdFromDate(dd, mm, yy) {
    let a = Math.floor((14 - mm)/12);
    let y = yy + 4800 - a;
    let m = mm + 12*a - 3;
    let jd = dd + Math.floor((153*m + 2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
    if (jd < 2299161) jd = dd + Math.floor((153*m + 2)/5) + 365*y + Math.floor(y/4) - 32083;
    return jd;
}

// Convert Julian day number to Gregorian date
function jdToDate(jd) {
    let a,b,c,d,e,m;
    if(jd>2299160){
        a=jd+32044;
        b=Math.floor((4*a+3)/146097);
        c=a-Math.floor((b*146097)/4);
    }else{
        b=0;
        c=jd+32082;
    }
    d=Math.floor((4*c+3)/1461);
    e=c-Math.floor((1461*d)/4);
    m=Math.floor((5*e+2)/153);
    let day=e-Math.floor((153*m+2)/5)+1;
    let month=m+3-12*Math.floor(m/10);
    let year=b*100+d-4800+Math.floor(m/10);
    return {day, month, year};
}

// ============ LUNAR CALCULATION ============
function NewMoon(k){
    const T=k/1236.85;
    const T2=T*T;
    const T3=T2*T;
    const dr=Math.PI/180;
    let Jd1=2415020.75933 + 29.53058868*k +0.0001178*T2 -0.000000155*T3;
    Jd1 += 0.00033 * Math.sin((166.56 +132.87*T -0.009173*T2)*dr);
    return Jd1;
}

function SunLongitude(jdn){
    const T=(jdn-2451545.0)/36525;
    const T2=T*T;
    const dr=Math.PI/180;
    const M=357.52910+35999.05030*T -0.0001559*T2 -0.00000048*T*T2;
    let L0=280.46645+36000.76983*T +0.0003032*T2;
    let DL=(1.914600 -0.004817*T -0.000014*T2)*Math.sin(M*dr);
    DL += (0.019993-0.000101*T)*Math.sin(2*M*dr)+0.000290*Math.sin(3*M*dr);
    let L=L0+DL;
    L=L-360*Math.floor(L/360);
    return L;
}

function getLunarMonth11(yy){
    let off=jdFromDate(31,12,yy)-2415021;
    let k=Math.floor(off/29.530588853);
    let nm=NewMoon(k);
    let sunLong=SunLongitude(nm);
    if(sunLong>3) nm=NewMoon(k-1);
    return Math.floor(nm+0.5);
}

// Convert solar date to lunar date
function solar2lunar(dd, mm, yy){
    const jd=jdFromDate(dd,mm,yy);
    let a11=getLunarMonth11(yy);
    let b11=a11;
    let lunarYear=yy;
    if(a11>=jd){
        a11=getLunarMonth11(yy-1);
        lunarYear=yy-1;
    } else b11=getLunarMonth11(yy+1);
    let k=Math.floor(0.5 + (a11 -2415021.076998695)/29.530588853);
    let monthStart=NewMoon(k+1);
    let lunarDay=jd-Math.floor(monthStart+0.5)+1;
    let lunarMonth=(Math.floor((monthStart-a11)/29.530588853)+11)%12+1;
    let leap=0; // cơ bản, có thể thêm tính tháng nhuận
    return {lunarDay, lunarMonth, lunarYear, leap};
}

// Convert lunar date to solar
function lunar2solar(ld,lm,ly,leap){
    const a11=getLunarMonth11(ly);
    const k=Math.floor(0.5+(a11-2415021.076998695)/29.530588853);
    const monthStart=NewMoon(k+lm-1+leap);
    const jd=Math.floor(monthStart+0.5)+ld-1;
    return jdToDate(jd);
}

// Compute Can Chi
function getCanChi(lunarYear, lunarMonth, lunarDay){
    const dayCan=canList[(jdFromDate(lunarDay,lunarMonth,lunarYear)+9)%10];
    const dayChi=chiList[(jdFromDate(lunarDay,lunarMonth,lunarYear)+1)%12];
    const monthCan=canList[(lunarYear*12 + lunarMonth +3)%10];
    const monthChi=chiList[(lunarMonth+1)%12];
    const yearCan=canList[(lunarYear+6)%10];
    const yearChi=chiList[(lunarYear+8)%12];
    return {dayCan, dayChi, monthCan, monthChi, yearCan, yearChi};
}

// ============ UI FUNCTIONS ============
const monthYearLabel=document.getElementById("monthYearLabel");
const calendarEl=document.getElementById("calendar");
const selectMonth=document.getElementById("selectMonth");
const selectYear=document.getElementById("selectYear");
const todayBtn=document.getElementById("todayBtn");
const solarInput=document.getElementById("solarInput");
const solarResult=document.getElementById("solarResult");
const lunarDaySel=document.getElementById("lunarDay");
const lunarMonthSel=document.getElementById("lunarMonth");
const lunarYearInp=document.getElementById("lunarYear");
const isLeapChk=document.getElementById("isLeap");
const lunarResult=document.getElementById("lunarResult");

let currentDate=new Date();
let displayMonth=currentDate.getMonth();
let displayYear=currentDate.getFullYear();

// Fill dropdowns
function fillMonthYearOptions(){
    selectMonth.innerHTML="";
    for(let m=1;m<=12;m++){
        const opt=document.createElement("option");
        opt.value=m;
        opt.textContent=m;
        if(m-1===displayMonth) opt.selected=true;
        selectMonth.appendChild(opt);
    }
    selectYear.innerHTML="";
    for(let y=1900;y<=2100;y++){
        const opt=document.createElement("option");
        opt.value=y;
        opt.textContent=y;
        if(y===displayYear) opt.selected=true;
        selectYear.appendChild(opt);
    }

    // Lunar converter dropdown
    lunarDaySel.innerHTML=""; lunarMonthSel.innerHTML="";
    for(let d=1;d<=30;d++){
        const opt=document.createElement("option");
        opt.value=d; opt.textContent=d;
        lunarDaySel.appendChild(opt);
    }
    for(let m=1;m<=12;m++){
        const opt=document.createElement("option");
        opt.value=m; opt.textContent=m;
        lunarMonthSel.appendChild(opt);
    }
}

// Render calendar
function renderCalendar(){
    monthYearLabel.textContent=(displayMonth+1)+"/"+displayYear;
    calendarEl.innerHTML="";
    const firstDay=new Date(displayYear,displayMonth,1).getDay(); //0=Sun
    const lastDate=new Date(displayYear,displayMonth+1,0).getDate();
    for(let i=0;i<firstDay;i++){
        const empty=document.createElement("div");
        empty.className="calendar-grid-cell empty";
        calendarEl.appendChild(empty);
    }
    for(let d=1;d<=lastDate;d++){
        const cell=document.createElement("div");
        cell.className="day-cell";
        cell.innerHTML=`<span class="solar">${d}</span>`;
        const lunar=solar2lunar(d,displayMonth+1,displayYear);
        cell.innerHTML+=`<span class
