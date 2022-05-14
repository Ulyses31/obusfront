const axios = require("axios");
const { captureRejectionSymbol } = require("events");
const fs = require("fs");

var PERSIAN_EPOCH = 1948320.5;
var GREGORIAN_EPOCH = 1721425.5;
var PERSIAN_WEEKDAYS_EN = new Array("Yekshanbeh", "Doshanbeh", "Seshhanbeh", "Chaharshanbeh", "Panjshanbeh", "Jomeh", "Shanbeh");
var PERSIAN_WEEKDAYS_FA = new Array("یکشنبه", "دوشنبه", "سه شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه");
var GREGORIAN_WEEKDAYS_EN = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");
var PERSIAN_MONTHS_FA = new Array("فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند");
var PERSIAN_MONTHS_EN = new Array("Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar", "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand");
var GREGORIAN_MONTHS_EN = new Array("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");
var GREGORIAN_MONTHS_FA = new Array("ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن", "ژوئيه", "اوت", "سپتامبر", "اكتبر", "نوامبر", "دسامبر");
function persian_to_jd(year, month, day) {
    var epbase, epyear;
    epbase = year - (year >= 0 ? 474 : 473);
    epyear = 474 + mod(epbase, 2820);
    return day + (month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6) + Math.floor((epyear * 682 - 110) / 2816) + (epyear - 1) * 365 + Math.floor(epbase / 2820) * 1029983 + (PERSIAN_EPOCH - 1);
}
function gregorian_to_jd(year, month, day) {
    return GREGORIAN_EPOCH - 1 + 365 * (year - 1) + Math.floor((year - 1) / 4) + -Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400) + Math.floor((367 * month - 362) / 12 + (month <= 2 ? 0 : leap_gregorian(year) ? -1 : -2) + day);
}
function jd_to_persian(jd) {
    var year, month, day, depoch, cycle, cyear, ycycle, aux1, aux2, yday;
    jd = Math.floor(jd) + 0.5;
    depoch = jd - persian_to_jd(475, 1, 1);
    cycle = Math.floor(depoch / 1029983);
    cyear = mod(depoch, 1029983);
    if (cyear == 1029982) {
        ycycle = 2820;
    } else {
        aux1 = Math.floor(cyear / 366);
        aux2 = mod(cyear, 366);
        ycycle = Math.floor((2134 * aux1 + 2816 * aux2 + 2815) / 1028522) + aux1 + 1;
    }
    year = ycycle + 2820 * cycle + 474;
    if (year <= 0) {
        year--;
    }
    yday = jd - persian_to_jd(year, 1, 1) + 1;
    month = yday <= 186 ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
    day = jd - persian_to_jd(year, month, 1) + 1;
    return new Array(year, month, day);
}
function jd_to_gregorian(jd) {
    var wjd, depoch, quadricent, dqc, cent, dcent, quad, dquad, yindex, dyindex, year, yearday, leapadj;
    wjd = Math.floor(jd - 0.5) + 0.5;
    depoch = wjd - GREGORIAN_EPOCH;
    quadricent = Math.floor(depoch / 146097);
    dqc = mod(depoch, 146097);
    cent = Math.floor(dqc / 36524);
    dcent = mod(dqc, 36524);
    quad = Math.floor(dcent / 1461);
    dquad = mod(dcent, 1461);
    yindex = Math.floor(dquad / 365);
    year = quadricent * 400 + cent * 100 + quad * 4 + yindex;
    if (!(cent == 4 || yindex == 4)) {
        year++;
    }
    yearday = wjd - gregorian_to_jd(year, 1, 1);
    leapadj = wjd < gregorian_to_jd(year, 3, 1) ? 0 : leap_gregorian(year) ? 1 : 2;
    month = Math.floor(((yearday + leapadj) * 12 + 373) / 367);
    day = wjd - gregorian_to_jd(year, month, 1) + 1;
    return new Array(year, month, day);
}
function mod(a, b) {
    return a - b * Math.floor(a / b);
}
function jwday(j) {
    return mod(Math.floor(j + 1.5), 7);
}
function leap_gregorian(year) {
    return year % 4 == 0 && !(year % 100 == 0 && year % 400 != 0);
}
var AR_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
var current_date = new Date();
function to_ar_num(e) {
    var t = e.toString(),
        a = "";
    for (var n in t) a += AR_DIGITS[t[n]];
    return a;
}
function div(a, b) {
    return ~~(a / b);
}
function mod(a, b) {
    return a - ~~(a / b) * b;
}
function isValidJalaaliDate(jy, jm, jd) {
    return jy >= -61 && jy <= 3177 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= jalaaliMonthLength(jy, jm);
}
function isLeapJalaaliYear(jy) {
    return jalCal(jy).leap === 0;
}
function jalaaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    if (isLeapJalaaliYear(jy)) return 30;
    return 29;
}
function jalCal(jy) {
    var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178],
        bl = breaks.length,
        gy = jy + 621,
        leapJ = -14,
        jp = breaks[0],
        jm,
        jump,
        leap,
        leapG,
        march,
        n,
        i;
    if (jy < jp || jy >= breaks[bl - 1]) throw new Error("Invalid Jalaali year " + jy);
    for (i = 1; i < bl; i += 1) {
        jm = breaks[i];
        jump = jm - jp;
        if (jy < jm) break;
        leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
        jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) {
        leap = 4;
    }
    return { leap: leap, gy: gy, march: march };
}
function gre_to_persian(gre_date_days,gre_date_months,gre_date_years ) {
    var gre_day = parseInt(gre_date_days),
        gre_month = parseInt(gre_date_months) + 1,
        gre_year = parseInt(gre_date_years);
    var cd = new Date(gre_year, gre_month - 1, gre_day);
    var day_of_the_week = cd.getDay();
    var jd = gregorian_to_jd(gre_year, gre_month, gre_day);
    var persian_date = jd_to_persian(jd);
    var gre_date = "<h2>";
    gre_date += PERSIAN_WEEKDAYS_FA[day_of_the_week] + " " + to_ar_num(persian_date[2]) + " " + PERSIAN_MONTHS_FA[persian_date[1] - 1] + " " + to_ar_num(persian_date[0]) + "</h2>";
    $(".gre_to_persian_date").html('<img src="/static/ajax_select/images/loading-indicator.gif" style="padding: 24px;"/>');
    setTimeout(function () {
        $(".gre_to_persian_date").html(gre_date);
    }, 500);
}
function persian_to_gre(persian_date_days,persian_date_months,persian_date_years) {
    var persian_day = parseInt(persian_date_days),
        persian_month = parseInt(persian_date_months) + 1,
        persian_year = parseInt(persian_date_years);
    var jd = persian_to_jd(persian_year, persian_month, persian_day);
    var gregorian_date = jd_to_gregorian(jd);
    return gregorian_date;
}


function persian_to_gre_from_string(fecha){
    let mes = "", año = "", dia = "";
    console.log(PERSIAN_MONTHS_FA);
    for (var n in fecha.mes) mes += AR_DIGITS.indexOf(fecha.mes[n]);
    for (var n in fecha.año) año += AR_DIGITS.indexOf(fecha.año[n]);
    for (var n in fecha.dia) dia += AR_DIGITS.indexOf(fecha.dia[n]);
    
    // const persa = `${parseInt(dia)}/${parseInt(mes)}/${parseInt(año)}`;
    // console.log(persa);

    let resultado = persian_to_gre(dia, mes - 1, año);
    return new Date(resultado[0], resultado[1] -1, resultado[2]);    
}



function createWriteStream(outputLocationPath) {
    return fs.createWriteStream(outputLocationPath);
}

function createWriteStream(outputLocationPath) {
    return fs.createWriteStream(outputLocationPath);
}
async function descargarLinks(fileUrl, outputLocationPath) {    
    const writer = createWriteStream(outputLocationPath);
    console.log("fileUrl", fileUrl);
    const response = await axios({
        url:fileUrl,
        method: 'GET',
        responseType: 'stream',
        headers: {"User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36", "Referer":"https://www.ebooksworld.ir/"}
      });
      //console.log("response", response);
    
      response.data.pipe(writer)
    
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })
}

module.exports = {PERSIAN_MONTHS_FA, AR_DIGITS, persian_to_gre_from_string, descargarLinks}