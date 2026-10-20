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

  // Conserva el texto extraído sin modificar palabras.
  const lines = text
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  // Elimina únicamente números de página aislados o pegados al final
  // cuando tienen apariencia clara de paginación.
  const cleanHeading = (value:string) => {
    return value
      .replace(/\s+(?:\d{1,3}|[ivxlcdm]{1,8})$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Detecta títulos académicos reales.
  const headingPattern =
    /^(?:cap[ií]tulo\s+(?:[ivxlcdm]+|\d+)(?:\s*[:.\-–—]?\s*.*)?|introducci[oó]n|problema(?:\s+de\s+investigaci[oó]n)?|planteamiento\s+del\s+problema|objetivos?|objetivo\s+general|objetivos?\s+espec[ií]ficos|metodolog[ií]a|resultados?|discusi[oó]n|conclusiones?|recomendaciones?|referencias(?:\s+bibliogr[aá]ficas)?|bibliograf[ií]a|anexos?)$/i;

  const detected:string[] = [];

  for(const line of lines){
    if(line.length > 140) continue;

    const cleaned = cleanHeading(line);

    if(headingPattern.test(cleaned)){
      if(
        cleaned &&
        !detected.some(
          x => x.toLocaleLowerCase() === cleaned.toLocaleLowerCase()
        )
      ){
        detected.push(cleaned);
      }
    }
  }

  const proposed = detected.length
    ? detected.slice(0,20)
    : [
        "Portada",
        "Introducción",
        "Problema de investigación",
        "Objetivos",
        "Metodología",
        "Resultados",
        "Conclusiones",
        "Referencias bibliográficas"
      ];

  const newSlides:Slide[] = proposed.map((title,i) => ({
    id:i+1,
    title,
    body:
      i===0
        ? "Presentación generada desde el documento"
        : "Contenido pendiente de organizar desde el documento original.",
    citation:
      i===0
        ? ""
        : "Sustento pendiente de verificación"
  }));

  setSlides(newSlides);
  setSel(0);
  setStatus(
    `Análisis local terminado: ${newSlides.length} láminas propuestas`
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
