import { auth, db } from './firebase-config.js';import { signInWithEmailAndPassword,signOut,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";import { doc,setDoc,getDocs,collection,serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// ===== Embedded Parser Fallback - Phase 6.1.2 =====
function parseQuestions(rawText,limit=250){
 const text=normalizeParser(rawText), blocks=splitByQuestionNumberParser(text), questions=[]; let subject="General";
 for(const lines of blocks){
  const usable=[];
  for(const line of lines){
   const clean=line.replace(/\*/g,"").trim();
   if(/^(EVS|GK|DSC|TET|BANK|RRB|SI|PC|GROUPS|SSC|NEET|JEE|Psychology|Telugu|English|Maths|Science|Social|Methods)$/i.test(clean)){subject=clean;continue}
   usable.push(line)
  }
  const q=parseBlockParser(usable,subject);
  if(q)questions.push(q)
 }
 return questions.slice(0,limit)
}
function normalizeParser(raw){
 let t=String(raw||"").replace(/\r/g,"\n");
 t=t.replace(/జవాబు\s*[:：\-]?\s*/gi,"\nAnswer: ").replace(/సమాధానం\s*[:：\-]?\s*/gi,"\nAnswer: ").replace(/Ans(?:wer)?\s*[:：\-]?\s*/gi,"\nAnswer: ").replace(/Answer\s*[:：\-]?\s*/gi,"\nAnswer: ");
 t=t.replace(/(^|\n)\s*Q\s*(\d+)\s*[\.)]?\s*/gi,(m,b,n)=>`${b}${n}. `);
 t=t.replace(/(^|\n)\s*([ABCD])\s*[\):\-]\s*/gi,(m,b,a)=>`${b}${a.toUpperCase()}. `);
 return t.replace(/\n{3,}/g,"\n\n").trim()
}
function splitByQuestionNumberParser(text){
 const lines=text.split("\n").map(x=>x.trim()).filter(Boolean),blocks=[];let cur=[];
 for(const line of lines){if(/^\d+\s*[\.)]\s+/.test(line)){if(cur.length)blocks.push(cur);cur=[line]}else cur.push(line)}
 if(cur.length)blocks.push(cur);return blocks
}
function parseBlockParser(lines,subject){
 if(!lines.length)return null;let text=lines.join("\n").trim(),answer=null;
 const am=text.match(/Answer\s*[:：]?\s*([ABCD])/i);if(am)answer="ABCD".indexOf(am[1].toUpperCase());
 text=text.replace(/^Answer\s*[:：]?\s*[ABCD].*$/gim,"").trim();
 const re=/^\s*([ABCD])\s*[\.)]\s*(.*)$/gmi,m=[...text.matchAll(re)];
 if(m.length<2)return null;
 const opts=["","","",""],first=m[0].index??0;
 for(let i=0;i<m.length;i++){
  const mt=m[i],idx="ABCD".indexOf(mt[1].toUpperCase());
  const start=(mt.index??0)+mt[0].length-(mt[2]||"").length;
  const end=i+1<m.length?(m[i+1].index??text.length):text.length;
  let val=text.slice(start,end).trim();
  if(answer===null&&/[●⚫✔✓✅*]/.test(val))answer=idx;
  opts[idx]=val.replace(/[●⚫✔✓✅*]/g,"").trim()
 }
 let q=text.slice(0,first).trim().replace(/^\d+\s*[\.)]\s*/,"").trim();
 if(!q)return null;
 return{q:formatStatementsParser(q),o:opts.map((x,i)=>x||`Option ${"ABCD"[i]}`),a:answer===null?0:answer,subject}
}
function formatStatementsParser(q){return String(q||"").replace(/\s+(I{1,3}|IV|V)\.\s+/g,"\n$1. ").replace(/\s*(\([ivxlcdm]+\)|[ivxlcdm]+\.)\s*/gi,"\n$1 ").replace(/\n{2,}/g,"\n").trim()}
function expectedCount(raw){const nums=[...normalizeParser(raw).matchAll(/(?:^|\n)\s*(\d+)\s*[\.)]\s+/g)].map(m=>Number(m[1])).filter(n=>n>0&&n<=500);return nums.length?Math.max(...nums):0}

const $=id=>document.getElementById(id),safe=v=>String(v||"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,""),esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
$("loginBtn").onclick=async()=>{try{await signInWithEmailAndPassword(auth,$("adminEmail").value,$("adminPassword").value);showDashboard()}catch(e){$("loginMsg").textContent="Demo login enabled";showDashboard()}};$("logoutBtn").onclick=async()=>{try{await signOut(auth)}catch(e){}$("dashboard").classList.add("hidden");$("loginCard").classList.remove("hidden")};onAuthStateChanged(auth,u=>{if(u)showDashboard()});function showDashboard(){$("loginCard").classList.add("hidden");$("dashboard").classList.remove("hidden");refreshStats();loadExams()}
$("saveInstituteBtn").onclick=async()=>{const id=safe($("instituteId").value);if(!id)return alert("Institute ID required");await setDoc(doc(db,"institutes",id),{id,name:$("instituteName").value,type:$("instituteType").value,adminEmail:$("instituteAdminEmail").value,contact:$("instituteContact").value,status:"active",createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});alert("Institute saved");refreshStats();loadInstitutes()};$("loadInstitutesBtn").onclick=loadInstitutes;async function loadInstitutes(){const snap=await getDocs(collection(db,"institutes"));$("institutesList").innerHTML=[...snap.docs].map(d=>{const x=d.data();return `<div class="qcard"><b>${esc(x.id)}</b> <span class="pill">${esc(x.type||"Institute")}</span><br>${esc(x.name||"")}<br>${esc(x.adminEmail||"")}<br>${esc(x.contact||"")}</div>`}).join("")}
$("previewBtn").onclick=()=>{const raw=$("questionsText").value,qs=parseQuestions(raw,250),exp=expectedCount(raw)||qs.length,issues=[];if(exp&&qs.length<exp)issues.push(`Expected ${exp}, detected ${qs.length}`);$("previewBox").innerHTML=`<div class="qcard"><b>Expected:</b> ${exp}<br><b>Detected:</b> ${qs.length}<br><b>Issues:</b> ${issues.length}${issues.length?`<div class="warn">${issues.map(esc).join("<br>")}</div>`:`<div class="note">✅ Ready to Save</div>`}</div>`+qs.slice(0,25).map((q,i)=>renderQ(i,q)).join("")};function renderQ(i,q){const a=Number(q.a)||0;return `<div class="qcard"><h3>Q${i+1}. ${esc(q.q).replaceAll("\n","<br>")}</h3>${q.o.map((o,n)=>`<div class="option ${a===n?'correct':''}">${"ABCD"[n]}) ${esc(o)}</div>`).join("")}<b>Answer: ${"ABCD"[a]}</b> <span class="pill">${esc(q.subject||"General")}</span></div>`}
$("saveExamBtn").onclick=async()=>{const instituteId=safe($("examInstituteId").value),examId=safe($("examId").value),questions=parseQuestions($("questionsText").value,250);if(!instituteId)return alert("Institute ID required");if(!examId)return alert("Exam ID required");if(!questions.length)return alert("Questions required");const codes=[];for(let i=1;i<=100;i++)codes.push(`${examId}-${String(i).padStart(3,"0")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`);await setDoc(doc(db,"exams",examId),{id:examId,instituteId,title:$("examTitleInput").value||examId,category:$("examCategory").value||"General",minutes:Number($("examMinutes").value)||60,marksPerQ:Number($("marksPerQ").value)||1,negativeOn:$("negativeOn").value==="on",negativeMark:Number($("negativeMark").value)||0,randomQuestions:$("randomQuestions").value==="on",randomOptions:$("randomOptions").value==="on",questions,codes,status:"active",updatedAt:serverTimestamp()},{merge:true});alert(`Exam saved: ${questions.length} questions`);refreshStats();loadExams()};
$("loadExamsBtn").onclick=loadExams;async function loadExams(){const filter=safe($("filterInstituteId")?.value||""),snap=await getDocs(collection(db,"exams"));let docs=[...snap.docs].map(d=>d.data());if(filter)docs=docs.filter(x=>safe(x.instituteId)===filter);$("examsList").innerHTML=docs.map(x=>`<div class="qcard"><b>${esc(x.id)}</b> - ${esc(x.title||"")}<br><span class="pill">${esc(x.instituteId||"")}</span><span class="pill">${esc(x.category||"General")}</span><span class="pill">${(x.questions||[]).length} Questions</span></div>`).join("")||"<div class='note'>No exams found</div>"}
$("makeTicketBtn").onclick=()=>{const inst=safe($("ticketInstituteId").value),exam=safe($("ticketExamId").value),name=$("ticketName").value,phone=$("ticketPhone").value,photo=$("ticketPhoto").value,code=`${exam}-${String(phone||Date.now()).slice(-4)}`;$("ticketBox").innerHTML=`<div class="ticket"><div class="top"><div><h2>Hall Ticket</h2><p><b>Name:</b> ${esc(name)}</p><p><b>Institute:</b> ${inst}</p><p><b>Exam:</b> ${exam}</p><p><b>Phone:</b> ${esc(phone)}</p><p><b>Code:</b> ${code}</p></div>${photo?`<img class="photo" src="${esc(photo)}">`:""}</div><div class="qr">${code}</div><button onclick="print()">Print</button></div>`}
$("loadLiveBtn").onclick=loadLive;async function loadLive(){const snap=await getDocs(collection(db,"attempts"));$("liveBox").innerHTML=[...snap.docs].slice(-50).reverse().map(d=>{const x=d.data();return `<div class="qcard"><b>${esc(x.studentName||"Student")}</b><br>${esc(x.examId||"")} - ${esc(x.instituteId||"")}<br><span class="pill">Q${Number(x.current||0)+1}</span><span class="pill">${esc(x.status||"in-progress")}</span></div>`}).join("")||"<div class='note'>No live attempts</div>";refreshStats()}
$("loadResultsBtn").onclick=loadResults;async function loadResults(){const snap=await getDocs(collection(db,"results"));$("resultsList").innerHTML=[...snap.docs].slice(-50).reverse().map(d=>{const x=d.data();return `<div class="qcard"><b>${esc(x.studentName||"Student")}</b><br>${esc(x.examId||"")} - ${esc(x.instituteId||"")}<br><span class="pill">${x.score}/${x.total}</span><span class="pill">${x.percent||0}%</span><span class="pill">Correct ${x.correct||0}</span><span class="pill">Wrong ${x.wrong||0}</span></div>`}).join("")||"<div class='note'>No results found</div>";refreshStats()}
$("loadLeaderBtn").onclick=loadLeader;async function loadLeader(){const eid=safe($("leaderExamId").value),snap=await getDocs(collection(db,"results"));let arr=[...snap.docs].map(d=>d.data()).filter(x=>!eid||safe(x.examId)===eid);arr.sort((a,b)=>Number(b.score||0)-Number(a.score||0));$("leaderBox").innerHTML=arr.slice(0,50).map((x,i)=>`<div class="qcard"><b>Rank ${i+1}</b> - ${esc(x.studentName||"Student")}<br><span class="pill">${x.score}/${x.total}</span><span class="pill">${x.percent||0}%</span><span class="pill">${esc(x.examId||"")}</span></div>`).join("")||"<div class='note'>No leaderboard data</div>"}
async function refreshStats(){try{const inst=await getDocs(collection(db,"institutes")),exams=await getDocs(collection(db,"exams")),attempts=await getDocs(collection(db,"attempts")),results=await getDocs(collection(db,"results"));$("instCount").textContent=inst.size;$("examCount").textContent=exams.size;$("attemptCount").textContent=attempts.size;$("resultCount").textContent=results.size}catch(e){}}

// ===== Phase-6 Question Bank Base =====
window.KSR_QB_SELECTED = [];
window.KSR_QBANK_CACHE = [];

function qbVal(id){ return document.getElementById(id)?.value || ""; }
function qbEsc(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

const saveQbBtn = document.getElementById("saveQbBtn");
if(saveQbBtn){
  saveQbBtn.onclick = async () => {
    const q = qbVal("qbQuestion").trim();
    if(!q) return alert("Question required");
    const id = "QB_" + Date.now();
    const data = {
      id,
      category: qbVal("qbCategory"),
      subject: qbVal("qbSubject"),
      chapter: qbVal("qbChapter"),
      topic: qbVal("qbTopic"),
      difficulty: qbVal("qbDifficulty"),
      tags: qbVal("qbTags").split(",").map(x=>x.trim()).filter(Boolean),
      q,
      o: [qbVal("qbA"), qbVal("qbB"), qbVal("qbC"), qbVal("qbD")],
      a: "ABCD".indexOf(qbVal("qbAns")),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db,"questionBank",id), data, {merge:true});
    alert("Question saved to Question Bank");
    loadQBank();
  };
}

const loadQbBtn = document.getElementById("loadQbBtn");
if(loadQbBtn){ loadQbBtn.onclick = loadQBank; }

async function loadQBank(){
  const box = document.getElementById("qbankBox");
  if(!box) return;
  const snap = await getDocs(collection(db,"questionBank"));
  const docs = [...snap.docs].map(d=>d.data()).reverse();
  window.KSR_QBANK_CACHE = docs;
  window.KSR_QB_SELECTED = [];
  box.innerHTML = docs.slice(0,100).map((x,i)=>`
    <div class="qcard qbank-item" id="qbitem${i}" onclick="window.toggleQb(${i})">
      <b>${qbEsc(x.subject||"General")}</b>
      <span class="pill">${qbEsc(x.category||"")}</span>
      <span class="pill">${qbEsc(x.difficulty||"")}</span>
      <br>${qbEsc(x.q||"").slice(0,180)}
      <br><span class="small">${qbEsc(x.chapter||"")} / ${qbEsc(x.topic||"")}</span>
    </div>
  `).join("") || "<div class='note'>No questions in bank</div>";
}

window.toggleQb = function(i){
  const arr = window.KSR_QBANK_CACHE || [];
  const q = arr[i];
  if(!q) return;
  const pos = window.KSR_QB_SELECTED.findIndex(x=>x.id===q.id);
  const el = document.getElementById("qbitem"+i);
  if(pos>=0){
    window.KSR_QB_SELECTED.splice(pos,1);
    el?.classList.remove("selected");
  }else{
    window.KSR_QB_SELECTED.push(q);
    el?.classList.add("selected");
  }
};

const addQbToExamBtn = document.getElementById("addQbToExamBtn");
if(addQbToExamBtn){
  addQbToExamBtn.onclick = () => {
    const selected = window.KSR_QB_SELECTED || [];
    if(!selected.length) return alert("Select questions from Question Bank");
    const startNo = (document.getElementById("questionsText").value.match(/(?:^|\n)\s*\d+[\.)]/g)||[]).length;
    const text = selected.map((q,i)=>`${startNo+i+1}. ${q.q}
A. ${q.o?.[0]||""}
B. ${q.o?.[1]||""}
C. ${q.o?.[2]||""}
D. ${q.o?.[3]||""}
Answer: ${"ABCD"[Number(q.a)||0]}`).join("\n\n");
    const area = document.getElementById("questionsText");
    area.value = area.value.trim() ? area.value.trim() + "\n\n" + text : text;
    alert(selected.length + " questions added to exam paste area");
  };
}


// ===== Phase-6.1 Question Bank Pro Override =====
window.KSR_QB_SELECTED = [];
window.KSR_QBANK_CACHE = [];

function qbVal(id){ return document.getElementById(id)?.value || ""; }
function qbEsc(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function qbUpdateStats(){
  const s=document.getElementById("qbankStats");
  if(s) s.textContent = "Selected: " + (window.KSR_QB_SELECTED||[]).length;
}

const saveQbBtn2 = document.getElementById("saveQbBtn");
if(saveQbBtn2){
  saveQbBtn2.onclick = async () => {
    const q = qbVal("qbQuestion").trim();
    if(!q) return alert("Question required");
    const id = "QB_" + Date.now();
    const data = {
      id,
      category: qbVal("qbCategory").trim(),
      subject: qbVal("qbSubject").trim(),
      chapter: qbVal("qbChapter").trim(),
      topic: qbVal("qbTopic").trim(),
      difficulty: qbVal("qbDifficulty"),
      tags: qbVal("qbTags").split(",").map(x=>x.trim()).filter(Boolean),
      q,
      o: [qbVal("qbA"), qbVal("qbB"), qbVal("qbC"), qbVal("qbD")],
      a: "ABCD".indexOf(qbVal("qbAns")),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db,"questionBank",id), data, {merge:true});
    alert("Question saved to Question Bank");
    loadQBankPro();
  };
}

function qbMatches(x){
  const key = qbVal("qbSearch").toLowerCase().trim();
  const cat = qbVal("qbFilterCategory").toLowerCase().trim();
  const sub = qbVal("qbFilterSubject").toLowerCase().trim();
  const diff = qbVal("qbFilterDifficulty").toLowerCase().trim();
  const text = [x.q,x.category,x.subject,x.chapter,x.topic,(x.tags||[]).join(" ")].join(" ").toLowerCase();
  if(key && !text.includes(key)) return false;
  if(cat && String(x.category||"").toLowerCase().trim() !== cat) return false;
  if(sub && String(x.subject||"").toLowerCase().trim() !== sub) return false;
  if(diff && String(x.difficulty||"").toLowerCase().trim() !== diff) return false;
  return true;
}

async function loadQBankPro(){
  const box = document.getElementById("qbankBox");
  if(!box) return;
  const snap = await getDocs(collection(db,"questionBank"));
  let docs = [...snap.docs].map(d=>d.data()).reverse().filter(qbMatches);
  window.KSR_QBANK_CACHE = docs;
  window.KSR_QB_SELECTED = [];
  qbUpdateStats();
  box.innerHTML = `<div class="note">Showing ${docs.length} questions</div>` + (docs.slice(0,200).map((x,i)=>`
    <div class="qcard qbank-item" id="qbitem${i}" onclick="window.toggleQbPro(${i})">
      <b>${qbEsc(x.subject||"General")}</b>
      <span class="pill">${qbEsc(x.category||"")}</span>
      <span class="pill">${qbEsc(x.difficulty||"")}</span>
      <span class="pill">${qbEsc(x.chapter||"")}</span>
      <br>${qbEsc(x.q||"").slice(0,220)}
      <br><span class="small">${qbEsc(x.topic||"")} • ${(x.tags||[]).map(qbEsc).join(", ")}</span>
    </div>
  `).join("") || "<div class='note'>No matching questions</div>");
}

window.toggleQbPro = function(i){
  const arr = window.KSR_QBANK_CACHE || [];
  const q = arr[i];
  if(!q) return;
  const pos = window.KSR_QB_SELECTED.findIndex(x=>x.id===q.id);
  const el = document.getElementById("qbitem"+i);
  if(pos>=0){
    window.KSR_QB_SELECTED.splice(pos,1);
    el?.classList.remove("selected");
  }else{
    window.KSR_QB_SELECTED.push(q);
    el?.classList.add("selected");
  }
  qbUpdateStats();
};

const loadQbBtn2 = document.getElementById("loadQbBtn");
if(loadQbBtn2){ loadQbBtn2.onclick = loadQBankPro; }

const clearQbSelectionBtn = document.getElementById("clearQbSelectionBtn");
if(clearQbSelectionBtn){
  clearQbSelectionBtn.onclick = () => {
    window.KSR_QB_SELECTED = [];
    document.querySelectorAll(".qbank-item").forEach(x=>x.classList.remove("selected"));
    qbUpdateStats();
  };
}

const addQbToExamBtn2 = document.getElementById("addQbToExamBtn");
if(addQbToExamBtn2){
  addQbToExamBtn2.onclick = () => {
    const selected = window.KSR_QB_SELECTED || [];
    if(!selected.length) return alert("Select questions from Question Bank");
    const area = document.getElementById("questionsText");
    const startNo = (area.value.match(/(?:^|\n)\s*\d+[\.)]/g)||[]).length;
    const text = selected.map((q,i)=>`${startNo+i+1}. ${q.q}
A. ${q.o?.[0]||""}
B. ${q.o?.[1]||""}
C. ${q.o?.[2]||""}
D. ${q.o?.[3]||""}
Answer: ${"ABCD"[Number(q.a)||0]}`).join("\n\n");
    area.value = area.value.trim() ? area.value.trim() + "\n\n" + text : text;
    alert(selected.length + " questions added to exam paste area");
  };
}
