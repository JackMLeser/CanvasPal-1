(()=>{"use strict";console.log("CanvasPal content script loaded");const n=async()=>{try{await new Promise((n=>{const t=()=>{document.head&&document.body?n():requestAnimationFrame(t)};t()})),(async()=>{try{const n=window.location.href.includes(".instructure.com"),t=await(async()=>{try{if(!chrome?.runtime)throw new Error("Chrome APIs not available");const n=document.createElement("style");n.textContent="\n            .canvas-pal-button {\n                position: fixed;\n                right: 20px;\n                top: 20px;\n                width: 44px;\n                height: 44px;\n                border-radius: 50%;\n                background: #0066CC;\n                color: white;\n                border: none;\n                font-size: 16px;\n                font-weight: 600;\n                cursor: pointer;\n                z-index: 2147483647;\n                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);\n                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n                display: flex;\n                align-items: center;\n                justify-content: center;\n                backdrop-filter: blur(8px);\n            }\n\n            .canvas-pal-button:hover {\n                transform: translateY(-2px);\n                background: #0056b3;\n                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);\n            }\n\n            .canvas-pal-button.has-assignments {\n                animation: canvas-pal-pulse 2s infinite;\n            }\n\n            @keyframes canvas-pal-pulse {\n                0% { transform: scale(1); }\n                50% { transform: scale(1.05); }\n                100% { transform: scale(1); }\n            }\n\n            .canvas-pal-toggle {\n                position: fixed;\n                top: 20px;\n                right: 70px;\n                z-index: 2147483647;\n                display: flex;\n                align-items: center;\n                gap: 8px;\n                background: rgba(255, 255, 255, 0.9);\n                padding: 6px 12px;\n                border-radius: 20px;\n                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n                font-family: 'Lato', sans-serif;\n                font-size: 12px;\n            }\n\n            .canvas-pal-toggle input {\n                margin: 0;\n                cursor: pointer;\n            }\n\n            .popup-container {\n                position: fixed;\n                right: 20px;\n                top: 75px;\n                width: 350px;\n                min-height: 400px;\n                background: #f9f9f9;\n                border: 2px solid #000;\n                z-index: 2147483646;\n                display: none;\n                font-family: 'Lato', sans-serif;\n            }\n\n            .popup-container.show {\n                display: block;\n            }\n\n            .popup-header {\n                display: flex;\n                align-items: center;\n                justify-content: space-between;\n                background-color: #0066CC;\n                color: white;\n                padding: 12px;\n                position: relative;\n                border-bottom: 1px solid #666;\n                margin-bottom: 16px;\n            }\n\n            .popup-title {\n                flex-grow: 1;\n                text-align: center;\n                margin: 0;\n                font-size: 2.3em;\n                color: #FFFFFF;\n                font-family: 'Lato', sans-serif;\n            }\n\n            .task-count {\n                position: absolute;\n                bottom: 8px;\n                left: 9px;\n                font-size: .7em;\n                color: #FFFFFF;\n                font-family: 'Lato', sans-serif;\n            }\n\n            .logo img {\n                width: 50px;\n                height: auto;\n                border-radius: 20%;\n                border: 3px solid #FFFFFF;\n                padding: 0;\n            }\n\n            .assignments-list {\n                max-height: 300px;\n                overflow-y: auto;\n                padding: 16px;\n            }\n\n            .assignment-item {\n                padding: 12px;\n                border: 1px solid #eee;\n                margin-bottom: 8px;\n                border-radius: 4px;\n            }\n\n            .assignment-item.high-priority {\n                border-left: 4px solid #d92b2b;\n            }\n\n            .assignment-item.medium-priority {\n                border-left: 4px solid #f0ad4e;\n            }\n\n            .assignment-item.low-priority {\n                border-left: 4px solid #5cb85c;\n            }\n\n            .settings-button {\n                bottom: 16px;\n                right: 16px;\n                position: absolute;\n                text-align: center;\n            }\n\n            .settings-button button {\n                background-color: #0066CC;\n                color: white;\n                padding: 10px 20px;\n                border-radius: 8px;\n                border: none;\n                transition: background-color 0.3s, transform 0.3s;\n                font-family: 'Lato', sans-serif;\n            }\n\n            .settings-button button:hover {\n                background-color: #0056b3;\n                transform: scale(1.08);\n            }\n        ",document.head.appendChild(n);const t=document.createElement("button");t.className="canvas-pal-button",t.textContent="0",document.body.appendChild(t);const e=document.createElement("div");e.className="canvas-pal-toggle",e.innerHTML='\n            <label>\n                <input type="checkbox" id="canvas-pal-visibility" checked>\n                <span>Follow Outside Canvas</span>\n            </label>\n        ',document.body.appendChild(e);const o=document.createElement("div");o.className="popup-container",o.innerHTML=`\n            <div class="popup-header">\n                <div class="popup-title">CanvasPAL</div>\n                <div class="task-count" id="taskCount">0 Tasks</div>\n                <div class="logo">\n                    <img src="${chrome.runtime.getURL("icons/CanvasPAL_logo.webp")}" alt="CanvasPAL Logo" />\n                </div>\n            </div>\n            <div class="assignments-list" id="assignmentList">\n                \x3c!-- Assignments will be populated here --\x3e\n            </div>\n            <div class="settings-button">\n                <button id="settings-button">Settings</button>\n            </div>\n        `,document.body.appendChild(o);const s=o.querySelector("#settings-button");return s&&s.addEventListener("click",(()=>{chrome?.runtime&&window.open(chrome.runtime.getURL("settings/settings.html"))})),{button:t,toggleContainer:e,popup:o}}catch(n){return console.error("Error creating elements:",n),null}})();if(!t)return void console.error("Failed to create elements");const{button:e,toggleContainer:o,popup:s}=t;o.style.display=n?"flex":"none",chrome?.storage?.local&&chrome.storage.local.get("settings",(t=>{try{const o=t.settings||{displayOptions:{showOutsideCanvas:!0}},s=o.displayOptions?.showOutsideCanvas??!0,i=document.getElementById("canvas-pal-visibility");i&&(i.checked=s),n||(e.style.display=s?"flex":"none")}catch(n){console.error("Error handling settings:",n)}})),e.addEventListener("click",(()=>{s.classList.toggle("show")}));const i=document.getElementById("canvas-pal-visibility");i?.addEventListener("change",(t=>{const o=t.target;chrome?.storage?.local&&chrome.storage.local.get("settings",(t=>{try{const s=t.settings||{displayOptions:{}};s.displayOptions||(s.displayOptions={}),s.displayOptions.showOutsideCanvas=o.checked,chrome.storage.local.set({settings:s}),n||(e.style.display=o.checked?"flex":"none")}catch(n){console.error("Error updating settings:",n)}}))})),document.addEventListener("click",(n=>{const t=n.target;s.contains(t)||e.contains(t)||s.classList.remove("show")})),chrome?.runtime&&(chrome.runtime.onMessage.addListener((n=>{try{if("ASSIGNMENTS_UPDATE"===n.type){e.textContent=n.data.length.toString(),e.classList.toggle("has-assignments",n.data.length>0);const t=document.getElementById("assignmentList"),o=document.getElementById("taskCount");t&&o&&function(n,t,e){try{e.textContent=`${n.length} Tasks`,t.innerHTML=n.map((n=>{return`\n            <div class="assignment-item ${t=n.priorityScore,t>=.7?"high-priority":t>=.4?"medium-priority":"low-priority"}">\n                <div style="font-weight: bold;">${n.title}</div>\n                <div>Due: ${n.dueDate}</div>\n                <div>Course: ${n.courseName}</div>\n                <div>Points: ${n.points}</div>\n            </div>\n        `;var t})).join("")}catch(n){console.error("Error updating assignments list:",n)}}(n.data,t,o)}}catch(n){console.error("Error handling assignment update:",n)}})),chrome.runtime.sendMessage({type:"GET_ASSIGNMENTS"},(n=>{try{n?.assignments&&(e.textContent=n.assignments.length.toString(),e.classList.toggle("has-assignments",n.assignments.length>0))}catch(n){console.error("Error getting initial assignments:",n)}})))}catch(n){console.error("Error initializing button:",n)}})()}catch(n){console.error("Error initializing CanvasPal:",n)}};"loading"===document.readyState?document.addEventListener("DOMContentLoaded",n):n()})();
//# sourceMappingURL=index.js.map