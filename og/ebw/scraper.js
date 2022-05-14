const axios = require("axios");
const cheerio = require("cheerio");
const {persian_to_gre_from_string} = require("./ebw.utils");
const url_base = "https://www.ebooksworld.ir";

async function getTags() {
  let response = await axios(url_base);
  let html = await response.data;
  let lis = scrapearTags(html);
  return lis;
}

//Devuelve la lista de Tags de ebooksworld
async function scrapearTags(html) {
  const $ = cheerio.load(html);
  const liHeader = $("li.nav-header>i.icon-tags").parent();
  let aux = liHeader.next("li");
  const lis = [];
  do {
    let link = aux.find("a").attr("href");
    lis.push({
      name: aux.text(),
      href: `${url_base}${link}`,
      idEbw: extraerIdTag(link),
    });
    aux = aux.next("li");
    let clase = $(aux).attr("class");
    if ((clase || "").includes("nav-header")) {
      break;
    }
  } while (aux && aux.get(0).tagName === "li");
  return lis;
}

function extraerIdTag(url) {
  return url.split("/")[3];
}

//POST a https://www.ebooksworld.ir/label/bookslist?labelId=id {page:}

async function getResourcesInTag(idTag, p) {
  let page = p || 0;
  let recursos = [];
  let data = null;
  let url = `https://www.ebooksworld.ir/label/bookslist?labelId=${idTag}`;
  do {
    console.log("Llamada", page);
    let response = await axios.post(url, { page });
    //console.log("despuesde linea 47")
    page+=1;
    let html = response.data;  
    data = await parsearRecursos(html);
    if (data.length>0) {      
      recursos.push(...data);      
    }
    //console.log("data", data);
  } while (data && data.length > 0);
  console.log("saliendo ");
  return recursos;
}

/* div.book-info-container */
/* <form class="form-inline" id="captchaForm" novalidate="novalidate">
                            <input type="text" id="captchaAnswer" placeholder="Answer question" _mstplaceholder="268736" style="direction: ltr; text-align: left;">
                            <button type="submit" id="captchaBtn" class="btn btn-success" _msthash="151567" _msttexthash="112138" style="direction: ltr;">Show Link</button>
                        </form> */
/* La respuesta: */
/* طهران */
async function parsearRecursos(html) {
  let $ = cheerio.load(html);
  let containers = $("div.book-info-container");
  let recursos = [];

  for (let i = 0; i < containers.length; i++) {
    let intermedio = parsearUnRecursoListado(containers[i], $);
    console.log("Vamos a pedir", intermedio.linkEbw);
    let response = await axios.get(intermedio.linkEbw);
    let htmlFinal = response.data;
    let enlaces = obtenerEnlacesDeDescarga(htmlFinal);
    if (enlaces.length > 0) intermedio.enlaces = enlaces;
    recursos.push(intermedio);        
  }

  return recursos;
}

function parsearUnRecursoListado(html, $) {
  console.log("entrando parsearUnRecursoListado")
  let recurso = {};
  let linkTitulo = $("div#book-info-title > h1 > a", html);
  let fechaHoraPersa = $("i.icon-calendar",html).parent().find("span.unicode").text().split(" ")[2];
  let partesFecha = fechaHoraPersa.split("/"); //[ '۲۲:۱۷:۲۵', '', '۱۳۹۹/۱۲/۹', 'شنبه' ]
  console.log("divFecha",partesFecha); 
  let fecha = persian_to_gre_from_string({ año:partesFecha[0], mes:partesFecha[1], dia:partesFecha[2]});
  console.log("fecha gre", fecha); 
  let linkVideo = $("a[href*=video]", html);
  let idEbw = extraerIdTag($(linkTitulo).attr(
    "href"
  ));
  console.log("idEbw POST", idEbw, $(linkTitulo).attr("href"));
  recurso.linkEbw = `https://www.ebooksworld.ir${$(linkTitulo).attr(
    "href"
  )}`;
  
  recurso.idEbw = idEbw;
  recurso.name = $(linkTitulo).text();
  recurso.tipo = linkVideo.length > 0 ? "video" : "libro";
  recurso.fecha = fecha;
  recurso.fechaPersa = fechaHoraPersa;
  return recurso;
}

function obtenerEnlacesDeDescarga(html) {
  let $ = cheerio.load(html);
  let divLinks = $("a", "div#downloadLinks");
  let aVer = Array.from(divLinks).map((x) => $(x).attr("href"));
  //console.log("aVer", aVer);
  return aVer;
}

module.exports = { getTags, getResourcesInTag };
