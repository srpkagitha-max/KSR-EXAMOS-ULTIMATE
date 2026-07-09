import { auth, db } from './firebase-config.js';import { signInWithEmailAndPassword,signOut,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";import { doc,setDoc,getDocs,collection,serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";import { parseQuestions,expectedCount } from './modules/parser.js';
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
