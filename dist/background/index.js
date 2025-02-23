(()=>{"use strict";console.log("Background script loaded");let e=[];function s(e){let s=0;const o=new Date(e.dueDate),t=new Date,a=Math.ceil((o.getTime()-t.getTime())/864e5);switch(s+=a<=0?1:a<=1?.9:a<=3?.8:a<=7?.6:.3,e.maxPoints&&(s+=e.maxPoints/100*.5),e.type.toLowerCase()){case"quiz":s+=.2;break;case"assignment":s+=.1;break;case"discussion":s+=.05}return Math.min(Math.max(s/2,0),1)}chrome.runtime.onMessage.addListener(((o,t,a)=>{switch(console.log("Background received message:",o),o.type){case"DASHBOARD_DATA":console.log("Processing dashboard data:",o.data);const t=[];o.data.forEach((e=>{e.assignments.forEach((s=>{t.push({id:`${e.courseName}-${s.name}`,title:s.name,dueDate:s.dueDate,course:e.courseName,courseId:e.id?.toString()||"0",type:s.type,points:0,maxPoints:0,completed:!1,priorityScore:0,url:"#",details:{isCompleted:!1,isLocked:!1}})}))})),r=t,console.log("Processing assignments:",r),r.forEach((e=>{e.priorityScore=s(e)})),r.sort(((e,s)=>s.priorityScore-e.priorityScore)),e=r,chrome.tabs.query({},(s=>{s.forEach((s=>{s.id&&chrome.tabs.sendMessage(s.id,{type:"ASSIGNMENTS_UPDATE",data:e}).catch((e=>{console.log("Error sending message to tab:",e)}))}))}));break;case"GRADE_DATA":console.log("Processing grade data:",o.data);const n=new Map;o.data.assignments.forEach((e=>{n.set(e.name,{points:e.points,maxPoints:e.pointsPossible,weight:e.weight})})),e.forEach((e=>{const o=n.get(e.title);o&&(e.points=o.points,e.maxPoints=o.maxPoints,e.gradeWeight=o.weight,e.priorityScore=s(e))})),e.sort(((e,s)=>s.priorityScore-e.priorityScore)),chrome.tabs.query({},(s=>{s.forEach((s=>{s.id&&chrome.tabs.sendMessage(s.id,{type:"ASSIGNMENTS_UPDATE",data:e}).catch((e=>{console.log("Error sending message to tab:",e)}))}))}));break;case"GET_ASSIGNMENTS":console.log("Sending assignments:",e),a({assignments:e});break;case"CLEAR_ASSIGNMENTS":e=[],a({success:!0})}var r;return!0})),chrome.runtime.onInstalled.addListener((()=>{console.log("Extension installed/updated"),chrome.storage.local.set({settings:{displayOptions:{showOutsideCanvas:!0}}})})),chrome.alarms.create("refreshAssignments",{periodInMinutes:5}),chrome.alarms.onAlarm.addListener((e=>{"refreshAssignments"===e.name&&chrome.tabs.query({},(e=>{e.forEach((e=>{e.id&&chrome.tabs.sendMessage(e.id,{type:"REFRESH_ASSIGNMENTS"}).catch((e=>{console.log("Error sending refresh message to tab:",e)}))}))}))}))})();
//# sourceMappingURL=index.js.map