const { getTags, getResourcesInTag } = require("../../../og/ebw/scraper");
const {
  PERSIAN_MONTHS_FA,
  AR_DIGITS,
  persian_to_gre,
  descargarLinks,
} = require("../../../og/ebw/ebw.utils");
const fs = require("fs");

const scrapearRecursos = async (idEbw) => {
  let tag = await strapi.services.tag.findOne({ idEbw: idEbw });
  console.log("idEbw", idEbw);
  console.log("tag", tag.name);
  let data = await getResourcesInTag(idEbw);
  for (let i = 0; i < data.length; i++) {
    let dto = data[i];
    let recurso = await strapi.services.recurso.findOne({ idEbw: dto.idEbw });
    if (recurso === null) {
      recurso = await strapi.services.recurso.create({
        idEbw: dto.idEbw,
        name: dto.name,
        tipo: dto.tipo,
        enlaces: dto.enlaces,
        fecha: dto.fecha,
        fechaPersa: dto.fechaPersa,
        tags: [tag],
      });
      console.log("RECURSO creado", recurso.name);
    } else {
      //      if(recurso.fechaPersa === null || ! ("fechaPersa" in recurso)) {
      recurso.fechaPersa = dto.fechaPersa;
      recurso.fecha = dto.fecha;
      await strapi.services.recurso.update({ id: recurso.id }, recurso);
      //}
      if (!recurso.tags.some((x) => x.id === tag.id)) {
        recurso.tags.push(tag);
        await strapi.services.recurso.update({ id: recurso.id }, recurso);
      }
      console.log("RECURSO EXISTENTE ", recurso.name);
    }
  }
  return tag;
};

function getFileName(url) {
  let partes = url.split("/");
  return partes[partes.length - 1];
}

module.exports = {
  getTags: async (ctx) => {
    let tags = await getTags();
    let entities = await strapi.services.tag.find({ _limit: -1 });
    console.log("ENTITIES", entities);
    for (let i = 0; i < tags.length; i++) {
      if (!entities.some((e) => e.idEbw == tags[i].idEbw)) {
        let nueva = await strapi.services.tag.create({
          name: tags[i].name,
          href: tags[i].href,
          idEbw: tags[i].idEbw,
        });
        entities.push(nueva);
      }
    }
    return { entities };
  },
  getRecursos: async (ctx) => {
    const { idEbw } = ctx.params;
    const tag = scrapearRecursos(idEbw);
    return { tag };
  },
  getAllRecursos: async (ctx) => {
    let tags = await strapi.services.tag.find({ _limit: -1 });
    console.log("Cantidad tags", tags.length);
    for (let i = 0; i < tags.length; i++) {
      console.log("TAG", tags[i].name);
      //TODO: Comparar por fecha
      // if (tags[i].recursos.length > 0) {
      //   console.log("Saltando tag", tags[i].name);
      //   continue;
      // }
      let element = tags[i];
      await scrapearRecursos(element.idEbw);
    }
    return { msg: tags.length };
  },
  testFecha: async (ctx) => {
    const { fecha } = ctx.request.body;
    console.log("fecha", fecha);
    let mes = "",
      año = "",
      dia = "";
    console.log(PERSIAN_MONTHS_FA);
    for (var n in fecha.mes) mes += AR_DIGITS.indexOf(fecha.mes[n]);
    for (var n in fecha.año) año += AR_DIGITS.indexOf(fecha.año[n]);
    for (var n in fecha.dia) dia += AR_DIGITS.indexOf(fecha.dia[n]) - 1;

    const persa = `${parseInt(dia)}/${parseInt(mes)}/${parseInt(año)}`;
    console.log(persa);

    let resultado = persian_to_gre(mes, dia, año);
    // const mes = PERSIAN_MONTHS_FA.find(x => x == fecha);
    return {
      resultado,
      persa,
    };
  },
  downloadLinks: async (ctx) => {
    const { idEbw } = ctx.params;
    const tag = await strapi.services.tag.findOne({ idEbw: idEbw });
    const recursos = tag.recursos.filter((x) => x.tipo == "libro");
    console.log(strapi.services);
    const descargados = await strapi.services["enlace-descargado"].find({});
    //console.log("recursos antes", recursos);
    recursos.sort((x, y) => new Date(y.fecha) - new Date(x.fecha));
    //console.log("recursos después",recursos);

    for (let i = 0; i < recursos.length; i++) {
      let book = recursos[i];
      //console.log("book", book);
      let year = new Date(book.fecha).getFullYear();
      let rutaDirectorio = `H:\\Obus\\${tag.name}\\${year}`;
      if (!fs.existsSync(rutaDirectorio)) {
        fs.mkdirSync(rutaDirectorio, { recursive: true });
      }
      console.log(book);
      for (let j = 0; j < book.enlaces.length; j++) {
        let link = book.enlaces[j];
        if (descargados.indexOf(link) >= 0) continue;
        console.log(book.enlaces[j]);
        console.log(getFileName(book.enlaces[j]));
        let res = await descargarLinks(
          book.enlaces[0],
          `${rutaDirectorio}\\${getFileName(book.enlaces[j])}`
        );
        let nueva = await strapi.services["enlace-descargado"].create({
          enlace: link,
        });
        descargados.push(nueva);
        console.log(res);
      }
    }
    return descargados;
  },
};
