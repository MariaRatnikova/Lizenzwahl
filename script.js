/* -------------------- 1. DATA --------------------------------------- */
const tree = {
    id: "begin",
    type: "question",
    label: "Fremdkomponenten verwendet?",
    children: [
      {
        id: "antwort1", type: "answer", label: "Ja",
        children: [
          {
            id: "antJaFrei", type: "answerGroup", label: "Freizügige Lizenz",
            children: [
              {id:"FreiVar1",type:"strategy",label:"Maximale Verbreitung",license:"CERN-OHL-P"},
              {id:"FreiVar2",type:"strategy",label:"Dual-Lizenzierung",license:"CERN-OHL-S, CERN-OHL-P"},
              {id:"FreiVar3",type:"strategy",label:"Maximale Kontrolle",license:"CERN-OHL-S"}
            ]
          },
          {
            id:"antJaSchwach",type:"answerGroup",label:"Schwache Copyleft-Lizenz",
            children:[
              {id:"SchwachVar1",type:"strategy",label:"Dual-Lizenzierung",license:"CERN-OHL-S, CERN-OHL-W"},
              {id:"SchwachVar2",type:"strategy",label:"Maximale Kontrolle",license:"CERN-OHL-S"}
            ]
          },
          {
            id:"antJaStark",type:"answerGroup",label:"Starke Copyleft-Lizenz",
            children:[
              {id:"StarkVar1",type:"strategy",label:"Maximale Kontrolle",license:"CERN-OHL-S"}
            ]
          }
        ]
      },
      {
        id:"antwort2",type:"answer",label:"Nein",
        children:[
          {id:"antNeinVer", type:"strategy",label:"Maximale Verbreitung",license:"CERN-OHL-P"},
          {id:"antNeinDual",type:"strategy",label:"Dual-Lizenzierung",license:"CERN-OHL-S, CERN-OHL-W"},
          {id:"antNeinMax", type:"strategy",label:"Maximale Kontrolle",license:"CERN-OHL-S"}
        ]
      }
    ]
  };
  
  /* -------------------- 2. NODE GEOMETRY ------------------------------ */
  const NODE_W_WIDE   = 160;
  const NODE_W_NARROW = 120;
  const NODE_H        = 44;
  const OVAL_W        = 70;
  const OVAL_H        = 30;
  
  const boxW = d => d.data.id === "begin"
                      ? NODE_W_WIDE
                      : ["antwort1","antwort2"].includes(d.data.id)
                          ? OVAL_W
                          : NODE_W_NARROW;
  const boxH = d => ["antwort1","antwort2"].includes(d.data.id) ? OVAL_H : NODE_H;
  
  /* -------------------- 3. TEXT WRAPPING ------------------------------ */
  function split2(label,max=18){
    if(label === "Dual-Lizenzierung") label = "Dual Lizenzierung";
    if(label.length<=4) return [label];
    if(!label.includes(" ")){
      const mid=Math.ceil(label.length/2);
      return [label.slice(0,mid),label.slice(mid)];
    }
    const idx=label.lastIndexOf(" ",max);
    if(idx>0) return [label.slice(0,idx),label.slice(idx+1)];
    const first=label.indexOf(" ");
    return [label.slice(0,first),label.slice(first+1)];
  }
  
  /* -------------------- 4. LICENCE COLOR ------------------------------ */
  function licClass(d,txt=false){
    if(d.data.label.startsWith("Dual")) return txt ? "yellow" : " yellow";
    if(!d.data.license) return "";
    const c = /-P\b/.test(d.data.license) ? "blue"
           : /-W\b/.test(d.data.license) ? "yellow"
           : "green";
    return txt? c
              : c==="blue"  ? " blueBox"
              : c==="yellow"? " yellow"
              :               " greenBox";
  }
  const splitLic = s => s.split(/,\s*/);
  
  /* -------------------- 5. D3 SETUP ----------------------------------- */
  const svg    = d3.select("#canvas"),
        gLinks = svg.append("g").attr("class","links"),
        gNodes = svg.append("g").attr("class","nodes");
  
  const root = d3.hierarchy(tree,d=>d.children);
  root.x0 = root.y0 = 0;
  root.descendants().forEach(collapseAll);
  update(root);
  
 /* ------------ CLICK: разворот ИЛИ фокус ----------------------------- */
function click(event, d){
    // 1) узел-лейбл и стратегии не дают «фокуса» – только разворачиваем/сворачиваем
    if (d.data.type === "label" || d.data.type === "strategy"){
      if (d.children){ d._children = d.children; d.children = null; }
      else            { d.children = d._children; d._children = null; }
      return update(d);
    }
  
    // 2) если на узле уже есть фокус-дитя → снять фокус (показать братьев)
    if (d._focus){
      d.children = d._focusSiblings;
      d._focus = null;
      d._focusSiblings = null;
      update(d);
      return;
    }
  
    // 3) если клик на ответе/answerGroup → поставить фокус
    if (d.parent && d.parent.children){
      d.parent._focus       = d;                            // запомним, кто выбран
      d.parent._focusSiblings = d.parent.children;          // сохраним всех
      d.parent.children     = [d];                          // оставим одного
      update(d.parent);                                     // перестраиваем от родителя
    }
  }
  
  /* -------------------- UPDATE (compact + responsive) ----------------- */
  function update(source){
    const DX = NODE_W_NARROW + 28,
          DY = 95,
          MIN = 1,
          DUR = 300,
          PAD = 40;
  
    /* --- layout ------------------------------------------------------- */
    const layout = d3.tree()
        .nodeSize([DX, DY])
        .separation((a,b)=>{
          if (a.parent !== b.parent) return 1;
          const need = (boxW(a)+boxW(b))/(2*DX);
          return Math.max(need, MIN);
        });
  
    layout(root);
  
    /* --- симметрия Ja / Nein (работает только когда оба есть) --------- */
    if (root.children?.length === 2 && !root._focus){
      const [l,r] = root.children;
      const shift = root.x - (l.x + r.x)/2;
      if (shift){ l.each(n=>n.x+=shift); r.each(n=>n.x+=shift); }
    }
  
    /* --- центрируем label-узлы под родителя --------------------------- */
    root.descendants().forEach(n=>{
      if (n.data.type === "label"){
        const dx = n.parent.x - n.x;
        if (dx) n.each(c=>c.x+=dx);
      }
    });
  
    /* --- responsive viewBox (быстро, без getBBox) -------------------- */
    let xmin=1e9, ymin=1e9, xmax=-1e9, ymax=-1e9;
    root.descendants().forEach(d=>{
      const x0=d.x, y0=d.y, x1=d.x+boxW(d), y1=d.y+boxH(d);
      if(x0<xmin)xmin=x0; if(y0<ymin)ymin=y0;
      if(x1>xmax)xmax=x1; if(y1>ymax)ymax=y1;
    });
    svg.attr("viewBox",[ xmin-PAD, ymin-PAD, (xmax-xmin)+PAD*2, (ymax-ymin)+PAD*2 ].join(" "));
  
    /* --- линии -------------------------------------------------------- */
    gLinks.selectAll("path")
      .data(root.links(),d=>d.target.data.id)
      .join(
        enter=>enter.append("path").attr("class","link")
                    .attr("d",d=>diag({source,target:source}))
                    .call(p=>p.transition().duration(DUR).attr("d",diag)),
        update=>update.transition().duration(DUR).attr("d",diag),
        exit  =>exit.transition().duration(DUR/1.5)
                    .attr("d",d=>diag({source,target:source})).remove()
      );
  
    /* --- узлы --------------------------------------------------------- */
    const node=gNodes.selectAll("g.node")
        .data(root.descendants(),d=>d.data.id);
  
    const enter=node.enter().append("g")
        .attr("class",d=>"node "+d.data.type+licClass(d))
        .attr("transform",`translate(${source.x0},${source.y0})`)
        .on("click",click);
  
    enter.append("rect")
        .attr("width",boxW).attr("height",boxH)
        .attr("rx",d=>(d.data.type==="label"||d.data.type==="answer")?20:4)
        .attr("ry",d=>(d.data.type==="label"||d.data.type==="answer")?20:4);
  
    /* текст и подписи лицензий – та же логика, опущена ради краткости */
  
    node.merge(enter).transition().duration(DUR)
        .attr("transform",d=>`translate(${d.x},${d.y})`);
    enter.merge(node).classed("collapsed",d=>d._children);
  
    node.exit().transition().duration(DUR/1.5)
        .attr("transform",d=>`translate(${source.x},${source.y})`).remove();
  
    root.descendants().forEach(d=>{ d.x0=d.x; d.y0=d.y; });
  }
  /* -------------------- 8. HELPERS ----------------------------------- */
  function collapseAll(d){
    if(d.children){
      d._children = d.children;
      d._children.forEach(collapseAll);
      d.children = null;
    }
  }
  function diag(d){
    return `M${d.source.x + boxW(d.source)/2},${d.source.y + boxH(d.source)}
            V${d.target.y - 10}
            H${d.target.x + boxW(d.target)/2}
            V${d.target.y}`;
  }
  
  /* -------------------- 9. ZOOM / PAN -------------------------------- */
  svg.call(
    d3.zoom().scaleExtent([0.5,2])
      .on("zoom", ({transform}) => {
        gNodes.attr("transform", transform);
        gLinks.attr("transform", transform);
      })
  );