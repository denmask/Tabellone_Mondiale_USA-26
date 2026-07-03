const FLAG_BASE = "https://flagcdn.com/w80";

const FANTA_COACHES = {
  "Marocco": "Aidan Conti",
  "Francia": "Kevin Sandri",
  "Portogallo": "Alex Beltrame",
  "Spagna": "Andrea Campagnolo",
  "Belgio": "Lorenzo Moro",
  "Brasile": "Federico Burello",
  "Norvegia": "Kevin Di Bernardo",
  "Inghilterra": "Denis Mascherin",
  "Argentina": "Mattia Beltrame",
  "Germania": "Nicola Marano",
  "Olanda": "Valentina Pozzi",
  "Croazia": "Cristian Tartaro"
};

function flagUrl(code){
  return code ? `${FLAG_BASE}/${code}.png` : null;
}

function teamRow(team, { isWinner = false, isTbd = false } = {}){
  const wrap = document.createElement("div");
  wrap.className = "team" + (isWinner ? " is-winner" : "") + (isTbd ? " is-tbd" : "");

  const url = flagUrl(team.code);
  if (url){
    const img = document.createElement("img");
    img.className = "flag";
    img.src = url;
    img.alt = team.name;
    wrap.appendChild(img);
  } else {
    const ph = document.createElement("span");
    ph.className = "placeholder-flag";
    wrap.appendChild(ph);
  }

  const nameContainer = document.createElement("div");
  nameContainer.className = "name-container";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = team.name;
  nameContainer.appendChild(name);

  if (FANTA_COACHES[team.name]) {
    const coach = document.createElement("span");
    coach.className = "fanta-coach";
    coach.textContent = FANTA_COACHES[team.name];
    nameContainer.appendChild(coach);
  }
  wrap.appendChild(nameContainer);

  if (team.score !== undefined && team.score !== "") {
    const scoreDisp = document.createElement("span");
    scoreDisp.className = "team-score";
    scoreDisp.textContent = team.score;
    wrap.appendChild(scoreDisp);
  }

  return wrap;
}

function matchCard(match){
  const card = document.createElement("div");
  card.className = "match";
  card.dataset.id = match.id;

  const t1Winner = match.winner === "team1";
  const t2Winner = match.winner === "team2";

  card.appendChild(teamRow(match.team1, {
    isWinner: t1Winner,
    isTbd: match.tbd || match.team1.name.includes("TBD") || match.team1.name.includes("/")
  }));
  card.appendChild(teamRow(match.team2, {
    isWinner: t2Winner,
    isTbd: match.tbd || match.team2.name.includes("TBD") || match.team2.name.includes("/")
  }));

  return card;
}

function buildColumn(matches, label, gridClass){
  const col = document.createElement("div");
  col.className = `col ${gridClass}`;
  
  if (label === "OTTAVI") {
    col.className += " col-ottavi-highlight";
  }

  const tag = document.createElement("div");
  tag.className = "col-label";
  tag.textContent = label;
  col.appendChild(tag);

  matches.forEach(m => col.appendChild(matchCard(m)));
  return col;
}

function buildFinalCard(final){
  const card = document.createElement("div");
  card.className = "final-card";
  card.dataset.id = final.id;

  const eyebrow = document.createElement("div");
  eyebrow.className = "final-card__eyebrow";
  eyebrow.textContent = "FINALE FANTAMUNDIAL";
  card.appendChild(eyebrow);

  card.appendChild(teamRow(final.team1, { isTbd: true }));
  card.appendChild(teamRow(final.team2, { isTbd: true }));

  const meta = document.createElement("div");
  meta.className = "final-card__meta";
  meta.innerHTML = `<b>${final.date}</b><br>${final.time}<br>${final.venue}`;
  card.appendChild(meta);

  return card;
}

function render(data){
  const bracket = document.getElementById("bracket");
  bracket.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "connectors");
  bracket.appendChild(svg);

  // INIEZIONE COLONNE LATO SINISTRO (Sfruttando le classi Griglia Geometriche)
  bracket.appendChild(buildColumn(data.round32.left, "SEDICESIMI", "col-r32"));
  bracket.appendChild(buildColumn(data.round16.left, "OTTAVI", "col-r16"));
  bracket.appendChild(buildColumn(data.quarterfinal.left, "QUARTI", "col-qf"));
  bracket.appendChild(buildColumn(data.semifinal.left, "SEMIFINALE", "col-sf"));

  // CENTRO FINALE
  const centerCol = document.createElement("div");
  centerCol.className = "col col-f";
  centerCol.appendChild(buildFinalCard(data.final));
  bracket.appendChild(centerCol);

  // INIEZIONE COLONNE LATO DESTRO (Speculari e bilanciate)
  bracket.appendChild(buildColumn(data.semifinal.right, "SEMIFINALE", "col-sf"));
  bracket.appendChild(buildColumn(data.quarterfinal.right, "QUARTI", "col-qf"));
  bracket.appendChild(buildColumn(data.round16.right, "OTTAVI", "col-r16"));
  bracket.appendChild(buildColumn(data.round32.right, "SEDICESIMI", "col-r32"));

  requestAnimationFrame(() => requestAnimationFrame(() => drawConnectors(data, svg, bracket)));
}

function centerPoint(el, edge, bracketRect){
  const r = el.getBoundingClientRect();
  const y = r.top + r.height / 2 - bracketRect.top;
  const x = (edge === "right" ? r.right : r.left) - bracketRect.left;
  return { x, y };
}

function elbowPath(a, b, midX, svg){
  const d = `M ${a.x} ${a.y} H ${midX} V ${b.y} H ${b.x}`;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
}

function connectRound(idsA, idsB, mirrored, svg, bracketRect){
  const edgeSrc = mirrored ? "left" : "right";
  const edgeDst = mirrored ? "right" : "left";

  for (let i = 0; i < idsB.length; i++){
    const elA1 = document.querySelector(`[data-id="${idsA[i*2]}"]`);
    const elA2 = document.querySelector(`[data-id="${idsA[i*2+1]}"]`);
    const elB  = document.querySelector(`[data-id="${idsB[i]}"]`);
    if (!elA1 || !elA2 || !elB) continue;

    const p1 = centerPoint(elA1, edgeSrc, bracketRect);
    const p2 = centerPoint(elA2, edgeSrc, bracketRect);
    const pB = centerPoint(elB, edgeDst, bracketRect);
    const midX = (p1.x + pB.x) / 2;

    elbowPath(p1, { x: midX, y: p1.y }, midX, svg);
    elbowPath(p2, { x: midX, y: p2.y }, midX, svg);

    const bus = document.createElementNS("http://www.w3.org/2000/svg", "path");
    bus.setAttribute("d", `M ${midX} ${p1.y} V ${p2.y}`);
    svg.appendChild(bus);
    elbowPath({ x: midX, y: pB.y }, pB, midX, svg);
  }
}

function drawConnectors(data, svg, bracket){
  if (window.innerWidth <= 1200) return; // Disattiva i connettori su mobile per evitare bug visivi
  
  const rect = bracket.getBoundingClientRect();
  svg.setAttribute("width", bracket.scrollWidth);
  svg.setAttribute("height", bracket.scrollHeight);
  svg.innerHTML = "";

  const idsOf = arr => arr.map(m => m.id);

  connectRound(idsOf(data.round32.left), idsOf(data.round16.left), false, svg, rect);
  connectRound(idsOf(data.round16.left), idsOf(data.quarterfinal.left), false, svg, rect);
  connectRound(idsOf(data.quarterfinal.left), idsOf(data.semifinal.left), false, svg, rect);
  connectRound(idsOf(data.semifinal.left), [data.final.id], false, svg, rect);

  connectRound(idsOf(data.round32.right), idsOf(data.round16.right), true, svg, rect);
  connectRound(idsOf(data.round16.right), idsOf(data.quarterfinal.right), true, svg, rect);
  connectRound(data.quarterfinal.right.map(m => m.id), data.semifinal.right.map(m => m.id), true, svg, rect);
  connectRound(data.semifinal.right.map(m => m.id), [data.final.id], true, svg, rect);
}

async function loadData(){
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("bad response");
    return await res.json();
  } catch (err){
    return null;
  }
}

(async function init(){
  const themeToggle = document.getElementById("themeToggle");
  if(localStorage.getItem("theme") === "light"){
    document.body.classList.add("light-theme");
  }
  
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    localStorage.setItem("theme", document.body.classList.contains("light-theme") ? "light" : "dark");
  });

  const data = await loadData();
  if (!data) return;
  render(data);

  window.addEventListener("resize", () => {
    const svg = document.querySelector(".connectors");
    const bracket = document.getElementById("bracket");
    if (svg && bracket) drawConnectors(data, svg, bracket);
  });
})();