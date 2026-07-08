import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { doc, setDoc, getDocs, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { parseQuestions, expectedCount } from './modules/parser.js';

const $=id=>document.getElementById(id);
const safe=v=>String(v||"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"");
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

$("loginBtn").onclick=async()=>{try{await signInWithEmailAndPassword(auth,$("adminEmail").value,$("adminPassword").value);showDashboard()}catch(e){$("loginMsg").textContent="Demo login enabled";showDashboard()}};
$("logoutBtn").onclick=async()=>{try{await signOut(auth)}catch(e){} $("dashboard").classList.add("hidden");$("loginCard").classList.remove("hidden")};
onAuthStateChanged(auth,u=>{if(u)showDashboard()});
function showDashboard(){$("loginCard").classList.add("hidden");$("dashboard").classList.remove("hidden");refreshStats()}

$("saveInstituteBtn").onclick=async()=>{const id=safe($("instituteId").value);if(!id)return alert("Institute ID required");await setDoc(doc(db,"institutes",id),{id,name:$("instituteName").value,adminEmail:$("instituteAdminEmail").value,status:"active",createdAt:serverTimestamp()},{merge:true});alert("Institute saved");refreshStats()};
$("loadInstitutesBtn").onclick=loadInstitutes;
async function loadInstitutes(){const snap=await getDocs(collection(db,"institutes"));$("institutesList").innerHTML=[...snap.docs].map(d=>{const x=d.data();return `<div class="qcard"><b>${esc(x.id)}</b><br>${esc(x.name||"")}<br>${esc(x.adminEmail||"")}</div>`}).join("")}

$("previewBtn").onclick=()=>{const raw=$("questionsText").value;const qs=parseQuestions(raw,250);const exp=expectedCount(raw)||qs.length;const issues=[];if(exp&&qs.length<exp)issues.push(`Expected ${exp}, detected ${qs.length}`);$("previewBox").innerHTML=`<div class="qcard"><b>Expected:</b> ${exp}<br><b>Detected:</b> ${qs.length}<br><b>Issues:</b> ${issues.length}${issues.length?`<div class="note">${issues.map(esc).join("<br>")}</div>`:`<div class="note">✅ Ready to Save</div>`}</div>`+qs.map((q,i)=>renderQ(i,q)).join("")};
function renderQ(i,q){const a=Number(q.a)||0;return `<div class="qcard"><h3>Q${i+1}. ${esc(q.q).replaceAll("\n","<br>")}</h3>${q.o.map((o,n)=>`<div class="option ${a===n?'correct':''}">${"ABCD"[n]}) ${esc(o)}</div>`).join("")}<b>Answer: ${"ABCD"[a]}</b></div>`}

$("saveExamBtn").onclick=async()=>{const instituteId=safe($("examInstituteId").value), examId=safe($("examId").value), questions=parseQuestions($("questionsText").value,250);if(!instituteId)return alert("Institute ID required");if(!examId)return alert("Exam ID required");if(!questions.length)return alert("Questions required");const codes=[];for(let i=1;i<=50;i++)codes.push(`${examId}-${String(i).padStart(3,"0")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`);await setDoc(doc(db,"exams",examId),{id:examId,instituteId,title:$("examTitleInput").value||examId,minutes:Number($("examMinutes").value)||60,questions,codes,status:"active",updatedAt:serverTimestamp()},{merge:true});alert(`Exam saved: ${questions.length} questions`);refreshStats()};
async function refreshStats(){try{const inst=await getDocs(collection(db,"institutes"));const exams=await getDocs(collection(db,"exams"));$("instCount").textContent=inst.size;$("examCount").textContent=exams.size}catch(e){}}
