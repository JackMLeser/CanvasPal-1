(()=>{"use strict";var e;!function(e){e[e.DEBUG=0]="DEBUG",e[e.INFO=1]="INFO",e[e.WARN=2]="WARN",e[e.ERROR=3]="ERROR"}(e||(e={}));class t{constructor(t,n=e.INFO){this.context=t,this.currentLevel=n,this.cleanOldLogs()}static getInstance(n,i=e.INFO){const s=`${n}-${i}`;return this.instances.has(s)||this.instances.set(s,new t(n,i)),this.instances.get(s)}setLevel(e){this.currentLevel=e}debug(t,n){this.log(e.DEBUG,t,n)}info(t,n){this.log(e.INFO,t,n)}warn(t,n){this.log(e.WARN,t,n)}error(t,n){this.log(e.ERROR,t,n)}async log(t,n,...i){if(t>=this.currentLevel){const s=(new Date).toISOString(),a=`[${s}] ${this.getLogPrefix(t)} [${this.context}] ${n}`;if(i.length){const e=this.formatLogData(i);console.log(a,e)}else console.log(a);const o={timestamp:s,level:t,message:n,data:i,stack:Error().stack};this.saveLogs(o),t===e.ERROR&&this.notifyError(o)}}getLogPrefix(t){switch(t){case e.DEBUG:return"🔍 DEBUG:";case e.INFO:return"📢 INFO:";case e.WARN:return"⚠️ WARN:";case e.ERROR:return"❌ ERROR:";default:return"📢"}}formatLogData(e){try{if(Array.isArray(e))return e.map((e=>this.formatLogData(e)));if(e&&"object"==typeof e){if(e instanceof Error)return{name:e.name,message:e.message,stack:e.stack};const t={};for(const[n,i]of Object.entries(e))t[n]=this.formatLogData(i);return t}return e}catch(e){return"[Error formatting log data]"}}async saveLogs(e){const{logs:n=[]}=await chrome.storage.local.get("logs");n.push(e),n.length>t.MAX_LOGS&&n.splice(0,n.length-t.MAX_LOGS),await chrome.storage.local.set({logs:n})}async cleanOldLogs(){const{logs:e=[]}=await chrome.storage.local.get("logs"),t=new Date;t.setDate(t.getDate()-30);const n=e.filter((e=>new Date(e.timestamp)>t));await chrome.storage.local.set({logs:n})}notifyError(e){chrome.notifications.create({type:"basic",iconUrl:"/dist/icons/icon128.png",title:"CanvasPal Error",message:e.message,priority:2})}async getLogs(e){const{logs:t=[]}=await chrome.storage.local.get("logs");return e?t.filter((t=>t.level===e)):t}}t.MAX_LOGS=1e3,t.instances=new Map,t.getInstance("default");class n{constructor(){this.metrics=[],this.logger=new t("PerformanceMonitor")}static getInstance(){return n.instance||(n.instance=new n),n.instance}startMetric(e,t){const n=`${e}_${Date.now()}`;return this.metrics.push({name:e,startTime:performance.now(),metadata:t}),n}endMetric(e){const t=this.metrics.find((t=>t.name===e&&!t.endTime));t&&(t.endTime=performance.now(),t.duration=t.endTime-t.startTime,this.logger.debug(`Performance metric - ${e}:`,{duration:`${t.duration.toFixed(2)}ms`,metadata:t.metadata}))}getReport(){const e=this.metrics.filter((e=>void 0!==e.duration));if(0===e.length)return{metrics:[],summary:{totalDuration:0,averageDuration:0,slowestOperation:{name:"none",duration:0},fastestOperation:{name:"none",duration:0}}};const t=e.reduce(((e,t)=>e+(t.duration||0)),0),n=t/e.length,i=[...e].sort(((e,t)=>(t.duration||0)-(e.duration||0)));return{metrics:e,summary:{totalDuration:t,averageDuration:n,slowestOperation:{name:i[0].name,duration:i[0].duration||0},fastestOperation:{name:i[i.length-1].name,duration:i[i.length-1].duration||0}}}}clear(){this.metrics=[]}monitorAsync(e,t,n){return this.startMetric(e,n),t().finally((()=>this.endMetric(e)))}monitor(e,t,n){this.startMetric(e,n);const i=t();return this.endMetric(e),i}}class i{constructor(e){this.panel=null,this.isVisible=!1,this.logger=new t("DebugPanel"),this.performanceMonitor=n.getInstance(),this.debugManager=e,this.initializeKeyboardShortcut()}createPanel(){const e=()=>{if(!document.body)return void requestAnimationFrame(e);this.panel=document.createElement("div"),this.panel.id="canvaspal-debug-panel",this.panel.innerHTML='\n                <div class="debug-panel-header">\n                    <span>🔍 CanvasPal Debug</span>\n                    <div class="debug-panel-controls">\n                        <button id="clear-metrics" title="Clear Performance Metrics">🗑️</button>\n                        <button id="canvaspal-debug-close">✕</button>\n                    </div>\n                </div>\n                <div class="debug-panel-content">\n                    <div id="performance-metrics"></div>\n                    <div id="assignment-info"></div>\n                </div>\n            ',this.panel.style.cssText="\n                position: fixed;\n                bottom: 20px;\n                right: 20px;\n                width: 350px;\n                max-height: 500px;\n                background: rgba(0, 0, 0, 0.9);\n                color: white;\n                padding: 15px;\n                border-radius: 8px;\n                font-family: monospace;\n                font-size: 12px;\n                z-index: 9999;\n                overflow-y: auto;\n                box-shadow: 0 0 10px rgba(0,0,0,0.5);\n                display: none;\n            ";const t=document.createElement("style");t.textContent="\n                .debug-panel-header {\n                    display: flex;\n                    justify-content: space-between;\n                    align-items: center;\n                    margin-bottom: 10px;\n                    padding-bottom: 10px;\n                    border-bottom: 1px solid rgba(255,255,255,0.1);\n                }\n\n                .debug-panel-controls {\n                    display: flex;\n                    gap: 8px;\n                }\n\n                .debug-panel-controls button {\n                    background: none;\n                    border: none;\n                    color: white;\n                    cursor: pointer;\n                    padding: 4px;\n                    border-radius: 4px;\n                    transition: background 0.2s;\n                }\n\n                .debug-panel-controls button:hover {\n                    background: rgba(255,255,255,0.1);\n                }\n\n                .performance-section {\n                    margin: 10px 0;\n                    padding: 8px;\n                    background: rgba(255,255,255,0.05);\n                    border-radius: 4px;\n                }\n\n                .metric-item {\n                    margin: 4px 0;\n                    display: flex;\n                    justify-content: space-between;\n                }\n\n                .metric-value {\n                    color: #90EE90;\n                }\n\n                .slow-metric {\n                    color: #ff6b6b;\n                }\n\n                .normal-metric {\n                    color: #ffd700;\n                }\n\n                .fast-metric {\n                    color: #90EE90;\n                }\n            ",document.head?document.head.appendChild(t):document.addEventListener("DOMContentLoaded",(()=>{document.head.appendChild(t)})),document.body.appendChild(this.panel),document.getElementById("canvaspal-debug-close")?.addEventListener("click",(()=>{this.toggleVisibility()})),document.getElementById("clear-metrics")?.addEventListener("click",(()=>{this.performanceMonitor.clear(),this.updatePerformanceMetrics()}))};"loading"===document.readyState?document.addEventListener("DOMContentLoaded",e):e()}initializeKeyboardShortcut(){document.addEventListener("keydown",(e=>{this.debugManager.isDebugEnabled()&&(e.ctrlKey||e.metaKey)&&e.shiftKey&&"D"===e.key&&(e.preventDefault(),this.toggleVisibility())}))}toggleVisibility(){(this.isVisible||this.debugManager.isDebugEnabled())&&(this.panel||this.isVisible||this.createPanel(),this.panel&&(this.isVisible=!this.isVisible,this.panel.style.display=this.isVisible?"block":"none",!this.isVisible&&this.panel.parentNode&&(this.panel.parentNode.removeChild(this.panel),this.panel=null),this.logger.debug("Debug panel "+(this.isVisible?"shown":"hidden"))))}updatePerformanceMetrics(){const e=document.getElementById("performance-metrics");if(!e)return;const t=this.performanceMonitor.getReport();e.innerHTML=`\n            <div class="performance-section">\n                <h3>Performance Summary</h3>\n                <div class="metric-item">\n                    <span>Total Duration:</span>\n                    <span class="metric-value">${t.summary.totalDuration.toFixed(2)}ms</span>\n                </div>\n                <div class="metric-item">\n                    <span>Average Duration:</span>\n                    <span class="metric-value">${t.summary.averageDuration.toFixed(2)}ms</span>\n                </div>\n                <div class="metric-item">\n                    <span>Slowest Operation:</span>\n                    <span class="slow-metric">${t.summary.slowestOperation.name} (${t.summary.slowestOperation.duration.toFixed(2)}ms)</span>\n                </div>\n                <div class="metric-item">\n                    <span>Fastest Operation:</span>\n                    <span class="fast-metric">${t.summary.fastestOperation.name} (${t.summary.fastestOperation.duration.toFixed(2)}ms)</span>\n                </div>\n            </div>\n            <div class="performance-section">\n                <h3>Recent Operations</h3>\n                ${t.metrics.slice(-5).map((e=>`\n                    <div class="metric-item">\n                        <span>${e.name}</span>\n                        <span class="${this.getMetricSpeedClass(e.duration||0)}">${e.duration?.toFixed(2)}ms</span>\n                    </div>\n                `)).join("")}\n            </div>\n        `}getMetricSpeedClass(e){return e>100?"slow-metric":e>50?"normal-metric":"fast-metric"}updateAssignmentInfo(e){const t=document.getElementById("assignment-info");if(!t)return;const n=this.getAssignmentTypeCounts(e),i=this.getPriorityRanges(e);t.innerHTML=`\n            <div style="margin-bottom: 15px;">\n                <div style="color: #0066cc; margin-bottom: 8px;">\n                    Found ${e.length} assignments\n                </div>\n                ${this.renderTypeCounts(n)}\n                ${this.renderPriorityDistribution(i)}\n            </div>\n            ${this.renderAssignmentList(e)}\n        `,this.updatePerformanceMetrics()}getAssignmentTypeCounts(e){return e.reduce(((e,t)=>(e[t.type]=(e[t.type]||0)+1,e)),{})}getPriorityRanges(e){return e.reduce(((e,t)=>(t.priorityScore>=.7?e.high=(e.high||0)+1:t.priorityScore>=.4?e.medium=(e.medium||0)+1:e.low=(e.low||0)+1,e)),{})}renderTypeCounts(e){return`\n            <div style="margin-bottom: 10px;">\n                <div style="color: #ffd700; margin-bottom: 5px;">Assignment Types:</div>\n                ${Object.entries(e).map((([e,t])=>`\n                    <div style="margin-left: 10px; color: #90EE90;">\n                        ${e}: ${t}\n                    </div>\n                `)).join("")}\n            </div>\n        `}renderPriorityDistribution(e){const t={high:"#ff6b6b",medium:"#ffd700",low:"#90EE90"};return`\n            <div style="margin-bottom: 10px;">\n                <div style="color: #ffd700; margin-bottom: 5px;">Priority Distribution:</div>\n                ${Object.entries(e).map((([e,n])=>`\n                    <div style="margin-left: 10px; color: ${t[e]};">\n                        ${e}: ${n}\n                    </div>\n                `)).join("")}\n            </div>\n        `}renderAssignmentList(e){return`\n            <div style="margin-top: 15px;">\n                <div style="color: #ffd700; margin-bottom: 5px;">Detailed Assignments:</div>\n                ${e.map((e=>this.renderAssignmentDetail(e))).join("")}\n            </div>\n        `}renderAssignmentDetail(e){const t=e.priorityScore>=.7?"#ff6b6b":e.priorityScore>=.4?"#ffd700":"#90EE90";return`\n            <div style="margin: 8px 0; padding: 8px; border-left: 2px solid ${t}; background: rgba(255,255,255,0.1);">\n                <div style="margin-bottom: 4px;">📚 ${e.title}</div>\n                <div style="color: #90EE90; margin-bottom: 4px;">\n                    ${e.points?`📝 ${e.points}/${e.maxPoints} points`:"No points data"}\n                </div>\n                <div style="color: #ADD8E6; font-size: 11px;">\n                    ⏰ Due: ${this.formatDate(e.dueDate)}\n                </div>\n                <div style="color: #DDA0DD; font-size: 11px;">\n                    📚 Course: ${e.course}\n                </div>\n                <div style="color: ${t}; font-size: 11px; margin-top: 4px;">\n                    ⚡ Priority: ${Math.round(100*e.priorityScore)}%\n                </div>\n            </div>\n        `}logDetectionEvent(e,t){this.logger.debug(e,t)}formatDate(e){if("All Day"===e||"No due date"===e)return e;const t=e.startsWith("Due: ")?e.substring(5):e;try{const n=new Date(t);return isNaN(n.getTime())?e:n.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}catch{return e}}updatePerformanceAnalysis(e){}}class s{constructor(e){this.panel=null,this.isVisible=!1,this.logger=new t("DateDebugPanel"),this.debugManager=e,this.initializeKeyboardShortcut()}initializeKeyboardShortcut(){document.addEventListener("keydown",(e=>{this.debugManager.isDebugEnabled()&&(e.ctrlKey||e.metaKey)&&e.shiftKey&&"T"===e.key&&(e.preventDefault(),this.toggleVisibility())}))}createPanel(){if(!document.body)return void requestAnimationFrame((()=>this.createPanel()));this.panel=document.createElement("div"),this.panel.id="date-debug-panel",this.panel.style.cssText="\n            position: fixed;\n            bottom: 20px;\n            left: 20px;\n            width: 300px;\n            max-height: 400px;\n            background: rgba(0, 0, 0, 0.9);\n            color: white;\n            padding: 15px;\n            border-radius: 8px;\n            font-family: monospace;\n            font-size: 12px;\n            z-index: 9999;\n            overflow-y: auto;\n            box-shadow: 0 0 10px rgba(0,0,0,0.5);\n            display: none;\n        ";const e=document.createElement("div");e.innerHTML='\n            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">\n                <span style="color: #ffd700; font-weight: bold;">📅 Date Detection Debug</span>\n                <button id="date-debug-close" style="background: none; border: none; color: white; cursor: pointer;">✕</button>\n            </div>\n        ',this.panel.appendChild(e);const t=document.createElement("div");t.id="date-debug-content",this.panel.appendChild(t),document.body.appendChild(this.panel),document.getElementById("date-debug-close")?.addEventListener("click",(()=>{this.toggleVisibility()}))}toggleVisibility(){(this.isVisible||this.debugManager.isDebugEnabled())&&(this.panel||this.isVisible||this.createPanel(),this.panel&&(this.isVisible=!this.isVisible,this.panel.style.display=this.isVisible?"block":"none",!this.isVisible&&this.panel.parentNode&&(this.panel.parentNode.removeChild(this.panel),this.panel=null),this.logger.debug("Date debug panel "+(this.isVisible?"shown":"hidden"))))}updateDebugInfo(e){const t=document.getElementById("date-debug-content");t&&(t.innerHTML=`\n            <div class="date-stats" style="margin-bottom: 15px;">\n                <div style="color: #0066cc; margin-bottom: 8px;">\n                    Found ${e.totalDates} date${1!==e.totalDates?"s":""}\n                </div>\n                ${this.renderTypeDistribution(e.types)}\n            </div>\n            <div class="date-detections">\n                <div style="color: #ffd700; margin-bottom: 8px;">Detected Dates:</div>\n                ${this.renderDetections(e.detections)}\n            </div>\n        `)}renderTypeDistribution(e){const t={due:"#ff6b6b",availability:"#4CAF50",unlock:"#2196F3",unknown:"#9e9e9e"};return Object.entries(e).map((([e,n])=>`\n                <div style="margin-left: 10px; color: ${t[e]};">\n                    ${e.charAt(0).toUpperCase()+e.slice(1)}: ${n}\n                </div>\n            `)).join("")}renderDetections(e){return e.map((e=>`\n                <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px;">\n                    <div style="margin-bottom: 4px; color: #90EE90;">\n                        ${e.text}\n                    </div>\n                    <div style="font-size: 11px; color: #ADD8E6;">\n                        Type: ${e.type}\n                    </div>\n                    <div style="font-size: 11px; color: #DDA0DD;">\n                        Parsed: ${e.date}\n                    </div>\n                    <div style="font-size: 11px; color: #FFB6C1;">\n                        Element: ${e.element}\n                    </div>\n                </div>\n            `)).join("")}logDateDetection(e,t){this.logger.debug(e,t)}}class a{constructor(){this.logger=new t("PerformanceLogger")}async logPerformance(e){try{const t=await this.getLogs(),n={timestamp:Date.now(),metrics:e,summary:this.calculateSummary(e)};for(t.unshift(n);t.length>a.MAX_LOGS;)t.pop();await chrome.storage.local.set({[a.STORAGE_KEY]:t}),this.logger.debug("Performance log saved:",n)}catch(e){this.logger.error("Error saving performance log:",e)}}calculateSummary(e){if(0===e.length)return{totalDuration:0,averageDuration:0,slowestOperation:"",fastestOperation:""};const t=e.reduce(((e,t)=>e+t.duration),0),n=[...e].sort(((e,t)=>t.duration-e.duration));return{totalDuration:t,averageDuration:t/e.length,slowestOperation:n[0].name,fastestOperation:n[n.length-1].name}}async getLogs(){try{return(await chrome.storage.local.get(a.STORAGE_KEY))[a.STORAGE_KEY]||[]}catch(e){return this.logger.error("Error retrieving performance logs:",e),[]}}async getPerformanceAnalysis(){const e=await this.getLogs();if(e.length<2)return{trends:[],hotspots:[],recommendations:["Not enough data for analysis"]};const t={};e.forEach((e=>{e.metrics.forEach((e=>{t[e.name]||(t[e.name]=[]),t[e.name].push(e.duration)}))}));const n=Object.entries(t).map((([e,t])=>{const n=t.slice(0,Math.floor(t.length/2)),i=t.slice(Math.floor(t.length/2)),s=this.calculateAverage(n),a=this.calculateAverage(i),o=(s-a)/a*100;return{operation:e,averageDuration:s,trend:this.calculateTrend(o),percentageChange:o}})),i=Object.entries(t).map((([e,t])=>({operation:e,frequency:t.length,averageDuration:this.calculateAverage(t)}))).filter((t=>t.averageDuration>100||t.frequency>.5*e.length)).sort(((e,t)=>t.averageDuration*t.frequency-e.averageDuration*e.frequency));return{trends:n,hotspots:i,recommendations:this.generateRecommendations(n,i)}}calculateAverage(e){return e.reduce(((e,t)=>e+t),0)/e.length}calculateTrend(e){return e<-5?"improving":e>5?"degrading":"stable"}generateRecommendations(e,t){const n=[],i=e.filter((e=>"degrading"===e.trend));return i.length>0&&n.push(`Performance degradation detected in: ${i.map((e=>`${e.operation} (${e.percentageChange.toFixed(1)}% slower)`)).join(", ")}`),t.forEach((e=>{e.averageDuration>200&&n.push(`Consider optimizing ${e.operation} (avg: ${e.averageDuration.toFixed(1)}ms, called ${e.frequency} times)`)})),t.length>3&&n.push("Consider reducing the number of expensive operations running in parallel"),0===n.length&&n.push("Performance is within acceptable ranges"),n}async clearLogs(){try{await chrome.storage.local.remove(a.STORAGE_KEY),this.logger.info("Performance logs cleared")}catch(e){this.logger.error("Error clearing performance logs:",e)}}}a.MAX_LOGS=100,a.STORAGE_KEY="performanceLogs";class o{constructor(){this.config={enabled:!1,logLevel:"info",showDateDebug:!1,showAssignmentDebug:!1,showPriorityDebug:!1,showPerformanceMetrics:!1},this.logger=new t("DebugManager"),this.mainPanel=new i(this),this.datePanel=new s(this),this.performanceMonitor=n.getInstance(),this.performanceLogger=new a,this.initializeKeyboardShortcuts(),this.initializePerformanceLogging(),this.loadDebugConfig()}initializePerformanceLogging(){setInterval((async()=>{if(this.config.enabled&&this.config.showPerformanceMetrics){const e=this.performanceMonitor.getReport().metrics.filter((e=>void 0!==e.duration)).map((e=>({name:e.name,duration:e.duration,metadata:e.metadata})));await this.performanceLogger.logPerformance(e),this.config.showPerformanceMetrics&&await this.updatePerformanceAnalysis()}}),3e5)}async updatePerformanceAnalysis(){const e=await this.performanceLogger.getPerformanceAnalysis();this.mainPanel.updatePerformanceAnalysis(e)}initializeKeyboardShortcuts(){document.addEventListener("keydown",(e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey)switch(e.key){case"`":e.preventDefault(),this.toggleDebugMode();break;case"D":e.preventDefault(),this.mainPanel.toggleVisibility();break;case"T":e.preventDefault(),this.datePanel.toggleVisibility();break;case"P":e.preventDefault(),this.togglePerformanceMetrics()}}))}async togglePerformanceMetrics(){this.config.showPerformanceMetrics=!this.config.showPerformanceMetrics,this.config.showPerformanceMetrics&&await this.updatePerformanceAnalysis(),this.saveDebugConfig()}async loadDebugConfig(){try{this.config={...this.config,enabled:!1,showDateDebug:!1,showAssignmentDebug:!1,showPriorityDebug:!1,showPerformanceMetrics:!1},await chrome.storage.sync.set({debugConfig:this.config}),this.applyConfig()}catch(e){this.logger.error("Error loading debug config:",e)}}async saveDebugConfig(){try{await chrome.storage.sync.set({debugConfig:this.config})}catch(e){this.logger.error("Error saving debug config:",e)}}applyConfig(){this.config.enabled?(this.logger.setLevel(this.getLogLevel()),this.config.showDateDebug&&this.datePanel.toggleVisibility(),(this.config.showAssignmentDebug||this.config.showPriorityDebug)&&this.mainPanel.toggleVisibility()):this.disableAllPanels()}disableAllPanels(){document.querySelectorAll('[id$="-debug-panel"]').forEach((e=>{e.style.display="none"}))}toggleDebugMode(){this.config.enabled=!this.config.enabled,this.applyConfig(),this.saveDebugConfig(),this.logger.info("Debug mode "+(this.config.enabled?"enabled":"disabled"))}updateDebugConfig(e){this.config={...this.config,...e},this.applyConfig(),this.saveDebugConfig()}getLogLevel(){switch(this.config.logLevel){case"debug":return 0;case"info":default:return 1;case"warn":return 2;case"error":return 3}}getMainPanel(){return this.mainPanel}getDatePanel(){return this.datePanel}isDebugEnabled(){return this.config.enabled}getConfig(){return{...this.config}}async clearPerformanceLogs(){await this.performanceLogger.clearLogs(),this.config.showPerformanceMetrics&&await this.updatePerformanceAnalysis()}async getPerformanceAnalysis(){return this.performanceLogger.getPerformanceAnalysis()}}class r{constructor(){this.defaultSettings={priorityWeights:{GRADE_IMPACT:.4,COURSE_GRADE:.3,DUE_DATE:.3},typeWeights:{quiz:1.2,assignment:1,discussion:.8,announcement:.5},displayOptions:{showCourseNames:!0,showGradeImpact:!0,showPriorityScores:!0,highlightOverdue:!0,showOutsideCanvas:!0},refreshInterval:30,debugSettings:{enabled:!1,logLevel:"info",showDateDebug:!1,showAssignmentDebug:!1,showPriorityDebug:!1},icalUrl:""},this.logger=new t("SettingsManager"),this.debugManager=new o,this.initializeEventListeners(),this.loadSettings()}initializeEventListeners(){document.getElementById("saveSettings")?.addEventListener("click",(()=>this.saveSettings())),document.getElementById("resetSettings")?.addEventListener("click",(()=>this.resetSettings())),["gradeImpact","courseGrade","dueDate"].forEach((e=>{const t=document.getElementById(e),n=document.getElementById(`${e}Value`);t&&n&&t.addEventListener("input",(()=>{n.textContent=`${t.value}%`,this.validateWeights()}))})),document.getElementById("debugEnabled")?.addEventListener("change",(e=>{const t=e.target.checked;this.updateDebugSettings({enabled:t})})),document.getElementById("logLevel")?.addEventListener("change",(e=>{const t=e.target.value;this.updateDebugSettings({logLevel:t})})),["showDateDebug","showAssignmentDebug","showPriorityDebug"].forEach((e=>{document.getElementById(e)?.addEventListener("change",(t=>{const n=t.target.checked;this.updateDebugSettings({[e]:n})}))}))}updateDebugSettings(e){this.debugManager.updateDebugConfig(e),this.saveSettings()}async loadSettings(){try{let e=(await chrome.storage.sync.get("settings")).settings||this.defaultSettings;e={...e,debugSettings:{...e.debugSettings,enabled:!1,showDateDebug:!1,showAssignmentDebug:!1,showPriorityDebug:!1}},await chrome.storage.sync.set({settings:e}),this.applySettingsToForm(e)}catch(e){this.logger.error("Error loading settings:",e),this.applySettingsToForm(this.defaultSettings)}}applySettingsToForm(e){document.getElementById("gradeImpact").value=(100*e.priorityWeights.GRADE_IMPACT).toString(),document.getElementById("courseGrade").value=(100*e.priorityWeights.COURSE_GRADE).toString(),document.getElementById("dueDate").value=(100*e.priorityWeights.DUE_DATE).toString(),document.getElementById("quizWeight").value=e.typeWeights.quiz.toString(),document.getElementById("assignmentWeight").value=e.typeWeights.assignment.toString(),document.getElementById("discussionWeight").value=e.typeWeights.discussion.toString(),document.getElementById("announcementWeight").value=e.typeWeights.announcement.toString(),document.getElementById("showCourseNames").checked=e.displayOptions.showCourseNames,document.getElementById("showGradeImpact").checked=e.displayOptions.showGradeImpact,document.getElementById("showPriorityScores").checked=e.displayOptions.showPriorityScores,document.getElementById("highlightOverdue").checked=e.displayOptions.highlightOverdue,document.getElementById("showOutsideCanvas").checked=e.displayOptions.showOutsideCanvas,document.getElementById("refreshInterval").value=e.refreshInterval.toString(),document.getElementById("icalUrl").value=e.icalUrl;const t=e.debugSettings;document.getElementById("debugEnabled").checked=t.enabled,document.getElementById("logLevel").value=t.logLevel,document.getElementById("showDateDebug").checked=t.showDateDebug,document.getElementById("showAssignmentDebug").checked=t.showAssignmentDebug,document.getElementById("showPriorityDebug").checked=t.showPriorityDebug,this.updateWeightDisplays(),this.validateWeights()}async saveSettings(){if(this.validateWeights())try{const e={priorityWeights:{GRADE_IMPACT:parseInt(document.getElementById("gradeImpact").value)/100,COURSE_GRADE:parseInt(document.getElementById("courseGrade").value)/100,DUE_DATE:parseInt(document.getElementById("dueDate").value)/100},typeWeights:{quiz:parseFloat(document.getElementById("quizWeight").value),assignment:parseFloat(document.getElementById("assignmentWeight").value),discussion:parseFloat(document.getElementById("discussionWeight").value),announcement:parseFloat(document.getElementById("announcementWeight").value)},displayOptions:{showCourseNames:document.getElementById("showCourseNames").checked,showGradeImpact:document.getElementById("showGradeImpact").checked,showPriorityScores:document.getElementById("showPriorityScores").checked,highlightOverdue:document.getElementById("highlightOverdue").checked,showOutsideCanvas:document.getElementById("showOutsideCanvas").checked},refreshInterval:parseInt(document.getElementById("refreshInterval").value),debugSettings:{enabled:document.getElementById("debugEnabled").checked,logLevel:document.getElementById("logLevel").value,showDateDebug:document.getElementById("showDateDebug").checked,showAssignmentDebug:document.getElementById("showAssignmentDebug").checked,showPriorityDebug:document.getElementById("showPriorityDebug").checked},icalUrl:document.getElementById("icalUrl").value};await chrome.storage.sync.set({settings:e}),await this.notifySettingsChanged(e),this.showSaveSuccess()}catch(e){this.logger.error("Error saving settings:",e),this.showSaveError()}}async resetSettings(){try{await chrome.storage.sync.set({settings:this.defaultSettings}),this.applySettingsToForm(this.defaultSettings),await this.notifySettingsChanged(this.defaultSettings),this.showSaveSuccess()}catch(e){this.logger.error("Error resetting settings:",e),this.showSaveError()}}validateWeights(){const e=parseInt(document.getElementById("gradeImpact").value)+parseInt(document.getElementById("courseGrade").value)+parseInt(document.getElementById("dueDate").value),t=document.getElementById("weightValidation");return!!t&&(100!==e?(t.textContent=`Total weight must be 100% (currently ${e}%)`,t.className="weight-validation error",!1):(t.textContent="✓ Weights are valid",t.className="weight-validation success",!0))}updateWeightDisplays(){["gradeImpact","courseGrade","dueDate"].forEach((e=>{const t=document.getElementById(e).value,n=document.getElementById(`${e}Value`);n&&(n.textContent=`${t}%`)}))}async notifySettingsChanged(e){try{await chrome.runtime.sendMessage({type:"SETTINGS_UPDATED",settings:e});const t=await chrome.tabs.query({url:"*://*.instructure.com/*"});for(const n of t)if(n.id)try{await chrome.tabs.sendMessage(n.id,{type:"SETTINGS_UPDATED",settings:e})}catch(e){this.logger.debug(`Could not notify tab ${n.id}: ${e}`)}this.logger.info("Settings updated and propagated")}catch(e){throw this.logger.error("Error notifying settings change:",e),e}}showSaveSuccess(){const e=document.getElementById("saveSettings");if(e){const t=e.textContent;e.textContent="✓ Saved",e.classList.add("success"),setTimeout((()=>{e&&(e.textContent=t,e.classList.remove("success"))}),2e3)}}showSaveError(){const e=document.getElementById("saveSettings");if(e){const t=e.textContent;e.textContent="✗ Error",e.classList.add("error"),setTimeout((()=>{e&&(e.textContent=t,e.classList.remove("error"))}),2e3)}}}window.addEventListener("DOMContentLoaded",(()=>{new r}))})();
//# sourceMappingURL=settings.js.map