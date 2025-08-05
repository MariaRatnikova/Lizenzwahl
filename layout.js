const V_GAP   = 120;         // вертикальный шаг
const H_GAP   = 200;         // горизонтальный шаг
const NODE_W  = 180;         // ориентировочная ширина узла
const NODE_H  = 40;          // высота + внутренние отступы

/* 1. построить DOM‑узлы **********************************************/
function buildDOM(node, parent) {
  const box = document.createElement("div");
  box.className = "node";
  box.id = node.id;
  box.dataset.type = node.type;
  box.innerHTML  = `<span>${node.label}</span>` +
                   (node.license ? `<span class="license">– ${node.license}</span>` : "");
  parent.appendChild(box);

  (node.children || []).forEach(ch => buildDOM(ch, parent));
}
buildDOM(tree, document.getElementById("canvas"));

/* 2. вычислить координаты (leaf‑based x), сохранить в map ************/
const coords = {};                 // id → {x,y}

(function calcCoords(node, depth = 0, nextX = {v:0}) {
  if (!node.children || !node.children.length) {
    // лист
    coords[node.id] = { x: nextX.v++, y: depth };
  } else {
    node.children.forEach(ch => calcCoords(ch, depth+1, nextX));
    // x родителя = середина диапазона детей
    const first = coords[node.children[0].id].x;
    const last  = coords[node.children.at(-1).id].x;
    coords[node.id] = { x:(first+last)/2, y: depth };
  }
})(tree);

/* 3. применить absolute‑позиции **************************************/
for (const [id, {x,y}] of Object.entries(coords)) {
  const el = document.getElementById(id);
  el.style.left = (x * H_GAP) + "px";
  el.style.top  = (y * V_GAP) + "px";
}

/* 4. нарисовать линии в едином <svg id="links"> **********************/
const svg = document.getElementById("links");
svg.setAttribute("width", 9999);  // достаточно большой
svg.setAttribute("height", 9999);
svg.style.position = "absolute";
svg.style.top = 0;
svg.style.left = 0;

function addLine(x1,y1,x2,y2) {
  const ln = document.createElementNS("http://www.w3.org/2000/svg","line");
  ln.setAttribute("x1",x1); ln.setAttribute("y1",y1);
  ln.setAttribute("x2",x2); ln.setAttribute("y2",y2);
  ln.setAttribute("stroke","#7a9b8f"); ln.setAttribute("stroke-width","2");
  svg.appendChild(ln);
}

(function drawLinks(node) {
  const p = coords[node.id];
  const px = p.x * H_GAP + NODE_W/2;
  const py = p.y * V_GAP + NODE_H;
  (node.children || []).forEach(ch => {
    const c = coords[ch.id];
    const cx = c.x * H_GAP + NODE_W/2;
    const cy = c.y * V_GAP;
    addLine(px, py, cx, cy);
    drawLinks(ch);
  });
})(tree);

/* 5. раскрытие / сворачивание ****************************************/
document.querySelectorAll(".node").forEach(box => {
  box.addEventListener("click", e => {
    const id = e.currentTarget.id;
    toggleBranch(id);
    e.stopPropagation();
  });
});

function toggleBranch(nodeId) {
  const ids = collectDesc(nodeId);
  ids.forEach(id => {
    document.getElementById(id).parentElement.classList.toggle("collapsed");
  });
}
function collectDesc(id, acc=[]) {
  const node = findById(tree,id);
  (node.children||[]).forEach(ch => {
    acc.push(ch.id); collectDesc(ch.id,acc);
  });
  return acc;
}