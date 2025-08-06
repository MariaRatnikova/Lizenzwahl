/* -------------------- 1. DATA ------------------------------------- */
const tree = {
    id:"begin",type:"question",label:"Fremdkomponenten verwendet?",
    children:[
      { id:"antwort1",type:"answer",label:"Ja",
        children:[
          { id:"antJaFrei",type:"answerGroup",label:"Freizügige Lizenz",
            children:[
              {id:"FreiVar1",type:"strategy",label:"Maximale Verbreitung",license:"CERN-OHL-P"},
              {id:"FreiVar2",type:"strategy",label:"Dual-Lizenzierung",   license:"CERN-OHL-S, CERN-OHL-P"},
              {id:"FreiVar3",type:"strategy",label:"Maximale Kontrolle",  license:"CERN-OHL-S"}]},
          { id:"antJaSchwach",type:"answerGroup",label:"Schwache Copyleft-Lizenz",
            children:[
              {id:"SchwachVar1",type:"strategy",label:"Dual-Lizenzierung",license:"CERN-OHL-S, CERN-OHL-W"},
              {id:"SchwachVar2",type:"strategy",label:"Maximale Kontrolle",license:"CERN-OHL-S"}]},
          { id:"antJaStark",type:"answerGroup",label:"Starke Copyleft-Lizenz",
            children:[
              {id:"StarkVar1",type:"strategy",label:"Maximale Kontrolle",license:"CERN-OHL-S"}]}]},
      { id:"antwort2",type:"answer",label:"Nein",
        children:[
          {id:"antNeinVer", type:"strategy",label:"Maximale Verbreitung",license:"CERN-OHL-P"},
          {id:"antNeinDual",type:"strategy",label:"Dual-Lizenzierung",   license:"CERN-OHL-S, CERN-OHL-W"},
          {id:"antNeinMax", type:"strategy",label:"Maximale Kontrolle",  license:"CERN-OHL-S"}]}
    ]
  };
  
  /* -------------------- 2. GEOMETRY ---------------------------------- */
  const NODE_W_WIDE=160,NODE_W=120,NODE_H=44,
        OVAL_W=70,  OVAL_H=30, LIC_W=100,LIC_H=22;
  
  const boxW=d=> d.data.type==="license" ? LIC_W
              : d.data.id==="begin"      ? NODE_W_WIDE
              : ["antwort1","antwort2"].includes(d.data.id) ? OVAL_W
              : NODE_W;
  const boxH=d=> d.data.type==="license" ? LIC_H
              : ["antwort1","antwort2"].includes(d.data.id) ? OVAL_H
              : NODE_H;
  
  /* -------------------- 3. UTILS ------------------------------------- */
  function split2(txt,max=18){
    if(txt==="Dual-Lizenzierung") txt="Dual Lizenzierung";
    if(txt.length<=4) return [txt];
    if(!txt.includes(" ")){const m=Math.ceil(txt.length/2);return[txt.slice(0,m),txt.slice(m)];}
    const i=txt.lastIndexOf(" ",max); if(i>0)return[txt.slice(0,i),txt.slice(i+1)];
    const f=txt.indexOf(" ");return[txt.slice(0,f),txt.slice(f+1)];
  }
  function splitLic(s){return s.split(/,\s*/);}
  const licColor = l => l.endsWith("-P") ? "blue" : l.endsWith("-W") ? "yellow" : "green";
  function licClass(d,txt=false){
    if(d.data.type==="license") return txt?d.data.color:"";
    if(d.data.label.startsWith("Dual")) return txt?"yellow":" yellow";
    if(!d.data.license) return "";
    const c=/-P\b/.test(d.data.license)?"blue":/-W\b/.test(d.data.license)?"yellow":"green";
    return txt?c:c==="blue"?" blueBox":c==="yellow"?" yellow":" greenBox";
  }
  
  /* -------------------- 4. SVG LAYERS -------------------------------- */
  const svg=d3.select("#canvas"),
        gLines=svg.append("g").attr("class","links"),
        gNodes=svg.append("g").attr("class","nodes");
  
  /* -------------------- 5. BUILD TREE -------------------------------- */
  const root=d3.hierarchy(tree,d=>d.children);
  root.x0=root.y0=0;
  root.descendants().forEach(collapseAll);
  update(root);
  
  /* -------------------- 6. HELPERS ----------------------------------- */
  function collapseAll(d){
    if(d.children){
      d._children=d.children;
      d._children.forEach(collapseAll);
      d.children=null;
    }
  }
  function collapseDeep(n){
    if(n._focusedChild) n._focusedChild=n._savedChildren=null;
    if(n.children){
      n.children.forEach(collapseDeep);
      n._children=n.children; n.children=null;
    }
    n._children?.forEach(collapseDeep);
  }
  function straighten(p){
    if(p.children?.length===1){
      const c=p.children[0],dx=p.x+boxW(p)/2 - (c.x+boxW(c)/2);
      if(Math.abs(dx)>1) c.each(n=>n.x+=dx);
    }
  }
  function centerRow(p){
    if(!(p.children?.length>1)) return;
    let min=Infinity,max=-Infinity;
    p.children.forEach(c=>{
      const cx=c.x+boxW(c)/2;
      if(cx<min)min=cx;if(cx>max)max=cx;
    });
    const dx=p.x+boxW(p)/2 - (min+max)/2;
    if(Math.abs(dx)>1) p.children.forEach(c=>c.each(n=>n.x+=dx));
  }
  
  /* -------------------- 7. CLICK ------------------------------------- */
function click(e, d) {
    let needUpdate = null;   // куда будем обновлять — d  или  d.parent
  /* 1. Стратегия: создать / скрыть лицензии ------------------------- */
if (d.data.type === "strategy") {
    if (d.children) {                      // лицензии уже раскрыты → спрятать
      d._children = d.children;
      d.children  = null;
    } else {                               // лицензий ещё нет → создать
      d.children = splitLic(d.data.license).map((lic, i) => {
  
        // исходные данные лицензии
        const licData = {
          id   : `${d.data.id}_lic_${i}`,
          type : "license",
          label: lic,
          color: licColor(lic)
        };
  
        // **важно**: превращаем в d3-узел
        const h = d3.hierarchy(licData);
        h.depth  = d.depth + 1;   // tree() всё равно пересчитает, но пусть будет
        h.parent = d;             // для обратной ссылки
  
        return h;
      });
    }
    needUpdate = d;
  }
  
    /* 2. Сброс фокуса (клик по родителю-контейнеру) ------------------- */
    if (d._focusedChild) {
      d.children        = d._savedChildren;
      d._focusedChild   = d._savedChildren = null;
      d.children.forEach(collapseDeep);
      needUpdate = d;
    }
  
    /* 3. Фокусировка выбранного потомка ------------------------------- */
    else if (d.parent && !d.parent._focusedChild) {
      d.parent._savedChildren = d.parent.children;   // запомнить всех детей
      d.parent._focusedChild  = d;                   // кто сейчас в фокусе
      d.parent.children       = [d];                 // оставить только выбранного
  
      if (d._children) { d.children = d._children; d._children = null; }
      d.children?.forEach(collapseDeep);
  
      needUpdate = d.parent;         // рисуем с уровня родителя (он стал уже короче)
    }
  
    /* 4. Обычный expand/collapse для остальных узлов ------------------ */
    else if (!needUpdate) {
      if (d.children) { d._children = d.children; d.children = null; }
      else            { d.children = d._children; d._children = null; }
      needUpdate = d;
    }
  
    /* итоговая перерисовка -------------------------------------------- */
    update(needUpdate);
  }
  /* -------------------- 8. UPDATE ------------------------------------ */
  function update(source){
    const DX=NODE_W+28,DY=95,MIN=1,DUR=250,PAD=40;
  
    d3.tree().nodeSize([DX,DY])
      .separation((a,b)=>(a.parent!==b.parent)?1:Math.max((boxW(a)+boxW(b))/(2*DX),MIN))
      (root);
  
    /* центр Ja/Nein */
    if(root.children?.length===2 && !root._focusedChild){
      const [l,r]=root.children,dx=root.x-(l.x+r.x)/2;
      if(dx){l.each(n=>n.x+=dx);r.each(n=>n.x+=dx);}
    }
  
    /* вертикаль и симметрия */
    const post=root.descendants().slice().reverse();
    post.forEach(straighten); post.forEach(centerRow);
  
    /* viewBox */
    let xmin=1e9,ymin=1e9,xmax=-1e9,ymax=-1e9;
    root.descendants().forEach(d=>{
      const x0=d.x,y0=d.y,x1=d.x+boxW(d),y1=d.y+boxH(d);
      if(x0<xmin)xmin=x0;if(y0<ymin)ymin=y0;
      if(x1>xmax)xmax=x1;if(y1>ymax)ymax=y1;
    });
    svg.attr("viewBox",[xmin-PAD,ymin-PAD,(xmax-xmin)+PAD*2,(ymax-ymin)+PAD*2].join(" "));
  
    /* LINES ------------------------------------------------------------ */
    gLines.selectAll("path")
      .data(root.links(),d=>d.target.data.id)
      .join(
        enter=>enter.append("path").attr("class","link")
                   .attr("d",d=>diag({source,target:source}))
                   .call(p=>p.transition().duration(DUR).attr("d",diag)),
        update=>update.transition().duration(DUR).attr("d",diag),
        exit  =>exit.transition().duration(DUR/1.5)
                   .attr("d",d=>diag({source,target:source})).remove()
      );
  
    /* NODES ------------------------------------------------------------ */
    const node=gNodes.selectAll("g.node")
        .data(root.descendants(),d=>d.data.id);
  
    const enter=node.enter().append("g")
        .attr("class",d=>"node "+d.data.type+licClass(d))
        .attr("transform",`translate(${source.x0},${source.y0})`)
        .on("click",click);
  
    /* прямоугольники (кроме license) */
    enter.filter(d=>d.data.type!=="license").append("rect")
        .attr("width",boxW).attr("height",boxH)
        .attr("rx",d=>d.data.type==="answer"?20:4)
        .attr("ry",d=>d.data.type==="answer"?20:4);
  
    /* текст */
    enter.each(function(d){
      const lines= d.data.type==="license"? [d.data.label]
                 : d.data.type==="answer" ? [d.data.label]
                 : split2(d.data.label);
      const g=d3.select(this),lh=14;
      const t=g.append("text")
      
        .attr("text-anchor","middle").attr("dominant-baseline","middle")
        .attr("x",boxW(d)/2).attr("y",boxH(d)/2-(lines.length-1)*lh/2)
        .attr("fill", d.data.type==="license"
                       ? (d.data.color==="yellow"?"#d4a400"
                         :d.data.color==="blue"  ?"#3d78bf"
                         :"#4f7015")
                       : null)
        .attr("font-weight",d.data.type==="license"?"700":null);
      t.selectAll("tspan").data(lines).enter().append("tspan")
        .attr("x",boxW(d)/2).attr("dy",(l,i)=>i?lh:0).text(l=>l);
    });
  
    node.merge(enter).transition().duration(DUR)
        .attr("transform",d=>`translate(${d.x},${d.y})`);
    node.exit().transition().duration(DUR/1.5)
        .attr("transform",d=>`translate(${source.x},${source.y})`).remove();
  
    root.descendants().forEach(d=>{d.x0=d.x;d.y0=d.y;});
  }
  
  /* диагональ --------------------------------------------------------- */
  function diag(d){
    const x0=d.source.x+boxW(d.source)/2,
          y0=d.source.y+boxH(d.source),
          x1=d.target.x+boxW(d.target)/2,
          y1=d.target.y;
    return Math.abs(x1-x0)<1
        ? `M${x0},${y0} V${y1}`
        : `M${x0},${y0} V${y1-10} H${x1} V${y1}`;
  }
  
  /* ZOOM --------------------------------------------------------------- */
  svg.call(
    d3.zoom().scaleExtent([0.5,2]).on("zoom",({transform})=>{
      gNodes.attr("transform",transform);
      gLines.attr("transform",transform);
    })
  );