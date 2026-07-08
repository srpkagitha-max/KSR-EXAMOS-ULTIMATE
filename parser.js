export function parseQuestions(rawText,limit=250){
 const text=normalize(rawText), blocks=splitByQuestionNumber(text), questions=[]; let subject="General";
 for(const lines of blocks){
  const usable=[];
  for(const line of lines){
   const clean=line.replace(/\*/g,"").trim();
   if(/^(EVS|GK|DSC|TET|BANK|RRB|SI|PC|GROUPS|SSC|NEET|JEE|Psychology|Telugu|English|Maths|Science|Social|Methods)$/i.test(clean)){subject=clean;continue}
   usable.push(line);
  }
  const q=parseBlock(usable,subject);
  if(q)questions.push(q);
 }
 return questions.slice(0,limit)
}
function normalize(raw){
 let t=String(raw||"").replace(/\r/g,"\n");
 t=t.replace(/జవాబు\s*[:：\-]?\s*/gi,"\nAnswer: ").replace(/సమాధానం\s*[:：\-]?\s*/gi,"\nAnswer: ").replace(/Ans(?:wer)?\s*[:：\-]?\s*/gi,"\nAnswer: ").replace(/Answer\s*[:：\-]?\s*/gi,"\nAnswer: ");
 t=t.replace(/(^|\n)\s*Q\s*(\d+)\s*[\.)]?\s*/gi,(m,b,n)=>`${b}${n}. `);
 t=t.replace(/(^|\n)\s*([ABCD])\s*[\):\-]\s*/gi,(m,b,a)=>`${b}${a.toUpperCase()}. `);
 return t.replace(/\n{3,}/g,"\n\n").trim()
}
function splitByQuestionNumber(text){
 const lines=text.split("\n").map(x=>x.trim()).filter(Boolean), blocks=[]; let current=[];
 for(const line of lines){ if(/^\d+\s*[\.)]\s+/.test(line)){if(current.length)blocks.push(current);current=[line]}else current.push(line) }
 if(current.length)blocks.push(current); return blocks
}
function parseBlock(lines,subject){
 if(!lines.length)return null; let text=lines.join("\n").trim(), answer=null;
 const answerMatch=text.match(/Answer\s*[:：]?\s*([ABCD])/i); if(answerMatch)answer="ABCD".indexOf(answerMatch[1].toUpperCase());
 text=text.replace(/^Answer\s*[:：]?\s*[ABCD].*$/gim,"").trim();
 const optionRegex=/^\s*([ABCD])\s*[\.)]\s*(.*)$/gmi, matches=[...text.matchAll(optionRegex)];
 if(matches.length<2)return null;
 const options=["","","",""], firstOptionIndex=matches[0].index??0;
 for(let i=0;i<matches.length;i++){
  const match=matches[i],idx="ABCD".indexOf(match[1].toUpperCase());
  const start=(match.index??0)+match[0].length-(match[2]||"").length;
  const end=i+1<matches.length?(matches[i+1].index??text.length):text.length;
  let value=text.slice(start,end).trim();
  if(answer===null&&/[●⚫✔✓✅*]/.test(value))answer=idx;
  options[idx]=value.replace(/[●⚫✔✓✅*]/g,"").trim();
 }
 let questionText=text.slice(0,firstOptionIndex).trim().replace(/^\d+\s*[\.)]\s*/,"").trim();
 if(!questionText)return null;
 return{q:formatStatements(questionText),o:options.map((x,i)=>x||`Option ${"ABCD"[i]}`),a:answer===null?0:answer,subject}
}
function formatStatements(q){return String(q||"").replace(/\s+(I{1,3}|IV|V)\.\s+/g,"\n$1. ").replace(/\s*(\([ivxlcdm]+\)|[ivxlcdm]+\.)\s*/gi,"\n$1 ").replace(/\n{2,}/g,"\n").trim()}
export function expectedCount(raw){const nums=[...normalize(raw).matchAll(/(?:^|\n)\s*(\d+)\s*[\.)]\s+/g)].map(m=>Number(m[1])).filter(n=>n>0&&n<=500);return nums.length?Math.max(...nums):0}
export function shuffleArray(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
