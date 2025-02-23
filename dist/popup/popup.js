(()=>{"use strict";(()=>{class s{constructor(){this.assignments=[],this.initializeEventListeners(),this.loadAssignments()}initializeEventListeners(){document.getElementById("openSettings")?.addEventListener("click",(()=>{chrome.runtime.openOptionsPage&&chrome.runtime.openOptionsPage()}))}async loadAssignments(){try{const s=await chrome.tabs.query({active:!0,currentWindow:!0});if(!s[0]?.id)return void this.showNoAssignments("No active tab found");const e=await chrome.runtime.sendMessage({type:"GET_ASSIGNMENTS"});if(!e||!e.assignments){const e=s[0]?.url;return void(e?.includes(".instructure.com")?e.includes("/grades")?(this.showNoAssignments("Loading grades..."),await chrome.runtime.sendMessage({type:"REFRESH_ASSIGNMENTS"})):this.showNoAssignments("Please navigate to a course grades page"):this.showNoAssignments("Please navigate to Canvas"))}this.assignments=e.assignments,this.renderAssignments()}catch(s){this.showNoAssignments("Failed to load assignments")}}renderAssignments(){const s=document.getElementById("assignmentList");s&&(s.innerHTML=this.assignments.map((s=>this.createAssignmentElement(s))).join(""))}createAssignmentElement(s){return`\n            <div class="assignment-item ${this.getPriorityClass(s.priorityScore)}">\n                <div class="assignment-title">${s.title}</div>\n                <div class="assignment-course">${s.course}</div>\n                <div class="assignment-due-date">Due: ${this.formatDate(s.dueDate)}</div>\n            </div>\n        `}getPriorityClass(s){return s>.7?"high-priority":s>.4?"medium-priority":"low-priority"}formatDate(s){return new Date(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}showNoAssignments(s){const e=document.getElementById("assignmentList");e&&(e.innerHTML=`\n                <div class="no-assignments">\n                    ${s}\n                </div>\n            `)}}window.addEventListener("DOMContentLoaded",(()=>{new s}))})()})();
//# sourceMappingURL=popup.js.map