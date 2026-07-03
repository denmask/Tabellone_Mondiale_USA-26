const FLAG_BASE = "https://flagcdn.com/w80";

function flagUrl(code){
  return code ? `${FLAG_BASE}/${code}.png` : null;
}

function teamRow(team, { isWinner = false, isTbd = false, isLive = false } = {}){
  const wrap = document.createElement("div");
  wrap.className = "team" + (isWinner ? " is-winner" : "") + (isTbd ? " is-tbd" : "");

  const url = flagUrl(team.code);
  if (url){
    const img = document.createElement("img");
    img.className = "flag";
    img.src = url;
    img.alt = team.name;
    img.loading = "lazy";
    wrap.appendChild(img);
  } else {
    const ph = document.createElement("span");
    ph.className = "placeholder-flag";
    wrap.appendChild(ph);
  }

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = team.name;
  wrap.appendChild(name);

  if (isLive){
    const badge = document.createElement("span");
    badge.className = "badge-live";
    badge.textContent = "OGGI";
    wrap.appendChild(badge);
  }

  return wrap;
}

function matchCard(match){
  const card = document.createElement("div");
  card.className = "match" + (match.pending ? " is-pending" : "");
  card.dataset.id = match.id;

  const t1Winner = match.winner === "team1";
  const t2Winner = match.winner === "team2";

  card.appendChild(teamRow(match.team1, {
    isWinner: t1Winner,
    isTbd: match.tbd || match.team1.name === "TBD",
    isLive: match.pending
  }));
  card.appendChild(teamRow(match.team2, {
    isWinner: t2Winner,
    isTbd: match.tbd || match.team2.name === "TBD",
    isLive: match.pending
  }));

  return card;
}

function buildColumn(matches, label){
  const col = document.createElement("div");
  col.className = "col";

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
  eyebrow.textContent = "FINALE";
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

  // LEFT side: round32 -> round16 -> qf -> sf (outer to inner)
  const left = document.createElement("div");
  left.className = "side side--left";
  left.appendChild(buildColumn(data.round32.left, "SEDICESIMI"));
  left.appendChild(buildColumn(data.round16.left, "OTTAVI"));
  left.appendChild(buildColumn(data.quarterfinal.left, "QUARTI"));
  left.appendChild(buildColumn(data.semifinal.left, "SEMIFINALE"));
  bracket.appendChild(left);

  // CENTER: final
  const center = document.createElement("div");
  center.className = "side side--center";
  center.appendChild(buildFinalCard(data.final));
  bracket.appendChild(center);

  // RIGHT side: sf -> qf -> round16 -> round32 (inner to outer)
  const right = document.createElement("div");
  right.className = "side side--right";
  right.appendChild(buildColumn(data.semifinal.right, "SEMIFINALE"));
  right.appendChild(buildColumn(data.quarterfinal.right, "QUARTI"));
  right.appendChild(buildColumn(data.round16.right, "OTTAVI"));
  right.appendChild(buildColumn(data.round32.right, "SEDICESIMI"));
  bracket.appendChild(right);

  // draw connectors once layout has settled
  requestAnimationFrame(() => requestAnimationFrame(() => drawConnectors(data, svg, bracket)));
}

function centerPoint(el, edge, bracketRect){
  const r = el.getBoundingClientRect();
  const y = r.top + r.height / 2 - bracketRect.top;
  const x = (edge === "right" ? r.right : r.left) - bracketRect.left;
  return { x, y };
}

function elbowPath(a, b, midX, cls, svg){
  const d = `M ${a.x} ${a.y} H ${midX} V ${b.y} H ${b.x}`;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  if (cls) path.setAttribute("class", cls);
  svg.appendChild(path);
}

function connectRound(idsA, idsB, mirrored, svg, bracketRect, liveIds){
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

    const isLive = liveIds.has(idsA[i*2]) || liveIds.has(idsA[i*2+1]);
    const cls = isLive ? "is-live" : "";

    elbowPath(p1, { x: midX, y: p1.y }, midX, cls, svg);
    elbowPath(p2, { x: midX, y: p2.y }, midX, cls, svg);
    // vertical bus
    const bus = document.createElementNS("http://www.w3.org/2000/svg", "path");
    bus.setAttribute("d", `M ${midX} ${p1.y} V ${p2.y}`);
    if (cls) bus.setAttribute("class", cls);
    svg.appendChild(bus);
    elbowPath({ x: midX, y: pB.y }, pB, midX, cls, svg);
  }
}

function drawConnectors(data, svg, bracket){
  const rect = bracket.getBoundingClientRect();
  svg.setAttribute("width", bracket.scrollWidth);
  svg.setAttribute("height", bracket.scrollHeight);
  svg.innerHTML = "";

  const liveIds = new Set(data.pendingMatches.map(m => m.id));

  const idsOf = arr => arr.map(m => m.id);

  // left side
  connectRound(idsOf(data.round32.left), idsOf(data.round16.left), false, svg, rect, liveIds);
  connectRound(idsOf(data.round16.left), idsOf(data.quarterfinal.left), false, svg, rect, liveIds);
  connectRound(idsOf(data.quarterfinal.left), idsOf(data.semifinal.left), false, svg, rect, liveIds);
  connectRound(idsOf(data.semifinal.left), [data.final.id], false, svg, rect, liveIds);

  // right side (mirrored)
  connectRound(idsOf(data.round32.right), idsOf(data.round16.right), true, svg, rect, liveIds);
  connectRound(idsOf(data.round16.right), idsOf(data.quarterfinal.right), true, svg, rect, liveIds);
  connectRound(idsOf(data.quarterfinal.right), idsOf(data.semifinal.right), true, svg, rect, liveIds);
  connectRound(idsOf(data.semifinal.right), [data.final.id], true, svg, rect, liveIds);
}

/* ---------------- "tonight" strip + countdown ---------------- */

function buildTonightStrip(data){
  const wrap = document.getElementById("tonightMatches");
  wrap.innerHTML = "";

  data.pendingMatches.forEach(pm => {
    // find the full match object to get flags
    const all = [...data.round32.left, ...data.round32.right];
    const match = all.find(m => m.id === pm.id);
    if (!match) return;

    const chip = document.createElement("div");
    chip.className = "tonight-chip";

    const img1 = document.createElement("img");
    img1.src = flagUrl(match.team1.code);
    img1.alt = match.team1.name;
    chip.appendChild(img1);

    const vs = document.createElement("span");
    vs.className = "vs";
    vs.textContent = match.team1.name + " – " + match.team2.name;
    chip.appendChild(vs);

    const img2 = document.createElement("img");
    img2.src = flagUrl(match.team2.code);
    img2.alt = match.team2.name;
    chip.appendChild(img2);

    const clock = document.createElement("span");
    clock.className = "clock";
    clock.textContent = pm.kickoff;
    chip.appendChild(clock);

    wrap.appendChild(chip);
  });
}

function buildFooterFinal(data){
  const el = document.getElementById("footerFinal");
  const f = data.final;
  el.textContent = `Finale: ${f.date} · ${f.time} · ${f.venue}`;
}

/* ---------------- boot ---------------- */

const FALLBACK_DATA = null; // populated lazily only if fetch fails

async function loadData(){
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("bad response");
    return await res.json();
  } catch (err){
    console.warn("Could not fetch data.json (likely running from file://). Serve this folder over HTTP for live editing of data.json.", err);
    return null;
  }
}

(async function init(){
  const data = await loadData();
  if (!data){
    document.getElementById("bracket").innerHTML =
      '<p style="color:#8b98a8;font-family:JetBrains Mono, monospace;padding:40px;text-align:center;">Impossibile caricare data.json — apri questa pagina tramite un piccolo server locale (es. <code>python3 -m http.server</code>) invece che come file:// per vedere il tabellone.</p>';
    return;
  }
  buildTonightStrip(data);
  buildFooterFinal(data);
  render(data);

  window.addEventListener("resize", () => {
    const svg = document.querySelector(".connectors");
    const bracket = document.getElementById("bracket");
    if (svg && bracket) drawConnectors(data, svg, bracket);
  });
})();