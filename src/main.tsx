import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import mammoth from "mammoth";
import {jsPDF} from "jspdf";
import "./style.css";

type Slide={id:number,title:string,body:string,citation:string};
const demo:Slide[]=[
{id:1,title:"Portada",body:"Título del trabajo académico\nAutor\nInstitución",citation:""},
{id:2,title:"Problema de investigación",body:"Edite aquí el contenido generado desde el documento.",citation:"Sustento no encontrado en el documento"},
{id:3,title:"Objetivos",body:"Objetivo general y objetivos específicos.",citation:"Fuente: documento original"},
{id:4,title:"Metodología",body:"Enfoque, diseño, población, muestra e instrumentos.",citation:"Fuente: documento original"},
{id:5,title:"Conclusiones",body:"Conclusiones sustentadas en el documento.",citation:"Fuente: documento original"}
];

function App(){
 const [file,setFile]=useState<File|null>(null);
 const [text,setText]=useState("");
 const [status,setStatus]=useState("Esperando documento");
 const [slides,setSlides]=useState<Slide[]>(demo);
 const [sel,setSel]=useState(0);
 const [font,setFont]=useState("Arial");
 const [size,setSize]=useState(24);

 async function load(f:File){
   setFile(f); setStatus("Leyendo documento...");
   try{
     if(f.name.toLowerCase().endsWith(".docx")){
       const ab=await f.arrayBuffer();
       const r=await mammoth.extractRawText({arrayBuffer:ab});
       setText(r.value); setStatus("Word leído correctamente");
     } else if(f.name.toLowerCase().endsWith(".pdf")){
       setText(""); setStatus("PDF recibido. El lector PDF completo se conectará en la siguiente versión.");
     } else setStatus("Formato no admitido");
   }catch(e){setStatus("No se pudo leer el archivo");}
 }
 function analyze(){
    if(!file || !text.trim()) return;

  setStatus("Analizando estructura, contenido y citas...");

  const lines = text
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  // Limpia solamente números de página colocados al final.
  const cleanHeading = (value:string) =>
    value
      .replace(/\s+(?:\d{1,3}|[ivxlcdm]{1,8})$/i, "")
      .replace(/\s+/g, " ")
      .trim();

  // Títulos académicos principales.
  const headingPattern =
    /^(?:cap[ií]tulo\s+(?:[ivxlcdm]+|\d+)(?:\s*[:.\-–—]?\s*.*)?|introducci[oó]n|problema(?:\s+de\s+investigaci[oó]n)?|planteamiento\s+del\s+problema|objetivos?|objetivo\s+general|objetivos?\s+espec[ií]ficos|metodolog[ií]a|resultados?|discusi[oó]n|conclusiones?|recomendaciones?|referencias(?:\s+bibliogr[aá]ficas)?|bibliograf[ií]a|anexos?)$/i;

  type Section = {
    title:string;
    start:number;
    body:string[];
  };

  const candidates:{title:string;index:number}[] = [];

  lines.forEach((line,index)=>{
    if(line.length > 140) return;

    const cleaned = cleanHeading(line);

    if(headingPattern.test(cleaned)){
      candidates.push({
        title:cleaned,
        index
      });
    }
  });

  // Evita repeticiones típicas del índice.
  // Si un título aparece varias veces, preferimos la última aparición,
  // que normalmente corresponde al contenido real.
  const uniqueMap = new Map<string,{title:string;index:number}>();

  candidates.forEach(item=>{
    const key = item.title
      .toLocaleLowerCase()
      .replace(/\s+/g," ")
      .trim();

    uniqueMap.set(key,item);
  });

  const uniqueHeadings = Array.from(uniqueMap.values())
    .sort((a,b)=>a.index-b.index);

  const sections:Section[] = uniqueHeadings.map((heading,i)=>{
    const next = uniqueHeadings[i+1];
    const end = next ? next.index : lines.length;

    return {
      title:heading.title,
      start:heading.index,
      body:lines.slice(heading.index+1,end)
    };
  });

  // Detecta citas Autor (2022), Autor y Autor (2021),
  // (Autor, 2020), etc.
  const citationRegex =
    /(?:\b[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñüÜ\-]+(?:\s+(?:y|&)\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñüÜ\-]+)?\s*\(\d{4}[a-z]?\)|\([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñüÜ\-]+(?:\s+et\s+al\.)?(?:,\s*|\s+)\d{4}[a-z]?\))/g;

  const makeBody = (section:Section) => {
    const usable = section.body
      .filter(line => {
        const cleaned = cleanHeading(line);
        return !headingPattern.test(cleaned);
      })
      .filter(line => line.length > 20)
      .filter(line => !/^\d+$/.test(line))
      .filter(line => !/^[ivxlcdm]+$/i.test(line));

    if(!usable.length){
      return "Sustento no encontrado en el documento.";
    }

    // Conservamos texto del documento.
    // No generamos información externa.
    return usable
      .slice(0,6)
      .join("\n\n")
      .slice(0,1800);
  };

  const makeCitation = (section:Section) => {
    const sourceText = section.body.join(" ");
    const matches = sourceText.match(citationRegex) || [];

    const unique = Array.from(new Set(matches));

    if(!unique.length){
      return "Sustento no encontrado en el documento";
    }

    return "Fuentes detectadas: " + unique.slice(0,8).join("; ");
  };

  let newSlides:Slide[] = [];

  // Portada independiente.
  // Busca un posible título académico antes de Introducción.
  const firstHeadingIndex =
    uniqueHeadings.length ? uniqueHeadings[0].index : lines.length;

  const frontMatter = lines
    .slice(0,firstHeadingIndex)
    .filter(x => x.length > 15 && x.length < 220)
    .filter(x => !/^\d+$/.test(x))
    .filter(x => !/^[ivxlcdm]+$/i.test(x));

  const possibleTitle =
    frontMatter.find(x =>
      /liderazgo|crecimiento|investigaci[oó]n|propuesta|diseño|an[aá]lisis|relaci[oó]n|estudio/i.test(x)
    ) || file.name.replace(/\.docx$/i,"");

  newSlides.push({
    id:1,
    title:"Portada",
    body:possibleTitle,
    citation:"Fuente: documento original"
  });

  // Genera una lámina por sección principal.
  sections
    .filter(section =>
      !/^referencias|^bibliograf/i.test(section.title)
    )
    .forEach(section=>{
      newSlides.push({
        id:newSlides.length+1,
        title:section.title,
        body:makeBody(section),
        citation:makeCitation(section)
      });
    });

  // Referencias al final, si existen.
  const references = sections.find(section =>
    /^referencias|^bibliograf/i.test(section.title)
  );

  if(references){
    const referenceText = references.body
      .filter(x => x.length > 15)
      .slice(0,20)
      .join("\n\n")
      .slice(0,2200);

    newSlides.push({
      id:newSlides.length+1,
      title:references.title,
      body:referenceText || "Referencias encontradas en el documento.",
      citation:"Fuente: sección de referencias del documento original"
    });
  }

  if(newSlides.length === 1){
    newSlides.push({
      id:2,
      title:"Contenido",
      body:"No se pudo identificar automáticamente la estructura del documento.",
      citation:"Sustento no encontrado en el documento"
    });
  }

  setSlides(newSlides);
  setSel(0);

  const citationCount = newSlides.filter(
    x => x.citation.startsWith("Fuentes detectadas:")
  ).length;

  setStatus(
    `Análisis terminado: ${newSlides.length} láminas propuestas · ${citationCount} secciones con citas detectadas`
  );
}
  function update(k:keyof Slide,v:string){setSlides(s=>s.map((x,i)=>i===sel?{...x,[k]:v}:x))}
 function add(){setSlides(s=>[...s,{id:Date.now(),title:"Nueva lámina",body:"Texto editable",citation:""}]);setSel(slides.length)}
 function exportPDF(){
   const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
   slides.forEach((s,i)=>{if(i)pdf.addPage();pdf.setFontSize(24);pdf.text(s.title,18,25,{maxWidth:250});pdf.setFontSize(14);pdf.text(s.body,18,48,{maxWidth:250});pdf.setFontSize(9);pdf.text(s.citation||"",18,190,{maxWidth:250});});
   pdf.save("presentacion.pdf");
 }
 const s=slides[sel]||demo[0];
 return <div className="app">
  <header><b>PresentaAI Académico</b><span>Word/PDF → láminas editables → PDF</span></header>
  <section className="upload">
   <h2>1. Cargar documento</h2>
   <input type="file" accept=".docx,.pdf" onChange={e=>e.target.files?.[0]&&load(e.target.files[0])}/>
   <button onClick={analyze} disabled={!file}>Analizar documento</button>
   <small>{file?.name||"Ningún archivo"} · {status}</small>
  </section>
  <div className="toolbar">
   <select value={font} onChange={e=>setFont(e.target.value)}><option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option></select>
   <input type="number" min="10" max="72" value={size} onChange={e=>setSize(+e.target.value)}/>
   <button onClick={add}>+ Lámina</button><button onClick={exportPDF}>Exportar PDF</button>
  </div>
  <main>
   <aside>{slides.map((x,i)=><button className={i===sel?"active":""} onClick={()=>setSel(i)} key={x.id}><b>{i+1}</b> {x.title}</button>)}</aside>
   <article>
    <div className="slide">
     <input className="title" value={s.title} onChange={e=>update("title",e.target.value)} style={{fontFamily:font}}/>
     <textarea value={s.body} onChange={e=>update("body",e.target.value)} style={{fontFamily:font,size}}/>
     <input className="citation" value={s.citation} onChange={e=>update("citation",e.target.value)}/>
    </div>
   </article>
   <nav><h3>Fuentes / trazabilidad</h3><p>En la versión con IA, cada afirmación se vinculará al fragmento, autor, año y página del documento.</p><b>Regla:</b><p>Si no hay fuente, mostrar “Sustento no encontrado en el documento”.</p></nav>
  </main>
 </div>
}
createRoot(document.getElementById("root")!).render(<App/>);
