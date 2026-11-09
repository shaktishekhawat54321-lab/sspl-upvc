let data=Store.load();
const hash=x=>btoa(unescape(encodeURIComponent(x)));
function login(){let p=adminPassword.value, saved=localStorage.getItem("ssplAdminHash")||hash("SSPL@123");if(hash(p)===saved){sessionStorage.setItem("ssplAdmin","yes");show()}else alert("Wrong password")}
function show(){loginBox.style.display="none";adminPanel.style.display="block";loadForm();if(typeof refreshCloudUi==="function")refreshCloudUi();if(typeof loadQuoteHistory==="function")loadQuoteHistory()}
function logout(){sessionStorage.removeItem("ssplAdmin");Promise.resolve(Store.signOut()).finally(()=>location.reload())}
function loadForm(){if(!data.settings.phone)data.settings.phone=data.settings.whatsapp||"7005132355";if(!data.settings.inquiry)data.settings.inquiry=data.settings.whatsapp||data.settings.phone;if(!data.settings.logo)data.settings.logo="images/sspl-logo.svg";businessName.value=data.settings.businessName;phone.value=data.settings.phone;inquiry.value=data.settings.inquiry;document.getElementById("email").value=data.settings.email||DEFAULT_DATA.settings.email;document.getElementById("hours").value=data.settings.hours||DEFAULT_DATA.settings.hours;address.value=data.settings.address;logoPreview.src=data.settings.logo;loadQuoteSettings();heroEyebrow.value=data.settings.heroEyebrow;heroTitle.value=data.settings.heroTitle;heroText.value=data.settings.heroText;renderEditors()}
function logoPreview(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{data.settings.logo=r.result;document.getElementById("logoPreview").src=r.result};r.readAsDataURL(f)}
function saveSettings(){data.settings.businessName=businessName.value.trim()||"Sani Steels Pvt Ltd";data.settings.phone=phone.value.trim();data.settings.inquiry=inquiry.value.trim();data.settings.whatsapp=data.settings.inquiry;data.settings.email=document.getElementById("email").value.trim();data.settings.hours=document.getElementById("hours").value.trim();data.settings.address=address.value.trim();data.settings.heroEyebrow=heroEyebrow.value;data.settings.heroTitle=heroTitle.value;data.settings.heroText=heroText.value;Store.saveSettings(data.settings).then(r=>alert(r.ok?"Website settings saved to "+r.where+".":"Saved on this device, but the cloud refused:\n\n"+r.error))}
function renderEditors(){productEditor.innerHTML=data.products.map((p,i)=>`<div class="product-admin"><div class="product-admin-grid"><img src="${DRAW.dataUri(p)}" alt=""><div><label>Product Name<input data-i="${i}" data-k="name" value="${esc(p.name)}"></label><label>Category<input data-i="${i}" data-k="cat" value="${esc(p.cat)}"></label></div><div><label>Rate ₹/sq.ft.<input type="number" data-i="${i}" data-k="rate" value="${p.rate}"></label><label>Description<input data-i="${i}" data-k="text" value="${esc(p.text)}"></label><label>Photo <input type="file" accept="image/*" onchange="photo(event,${i})"></label></div></div></div>`).join("")}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}
function photo(e,i){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{data.products[i].image=r.result;renderEditors()};r.readAsDataURL(f)}
function saveProducts(){document.querySelectorAll("#productEditor [data-i]").forEach(el=>{let i=+el.dataset.i,k=el.dataset.k;data.products[i][k]=k==="rate"?Number(el.value)||0:el.value});Store.saveProducts(data.products).then(r=>{Store.pruneProducts(data.products);alert(r.ok?"All product changes saved to "+r.where+".":"Saved on this device, but the cloud refused:\n\n"+r.error)})}
function changePassword(){if(newPassword.value.length<4||newPassword.value!==newPassword2.value)return alert("Enter matching password (minimum 4 characters).");localStorage.setItem("ssplAdminHash",hash(newPassword.value));newPassword.value=newPassword2.value="";alert("Password changed.")}
function exportData(){let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="sspl-website-backup.json";a.click()}
function importData(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);localStorage.setItem("ssplData",JSON.stringify(data));loadForm();alert("Backup restored.")}catch{alert("Invalid backup file.")}};r.readAsText(f)}
if(sessionStorage.getItem("ssplAdmin")==="yes"&&!firebaseConfigured())show();
// ---------- Quotation settings ----------
function loadQuoteSettings(){const g=id=>document.getElementById(id);const S=data.settings,D=DEFAULT_DATA.settings;
g("gstRate").value=S.gstRate!==undefined?S.gstRate:D.gstRate;
g("validityDays").value=S.validityDays||D.validityDays;
g("quotePrefix").value=S.quotePrefix||D.quotePrefix;
g("minAreaSqft").value=S.minAreaSqft!==undefined?S.minAreaSqft:D.minAreaSqft;
g("mmDivisor").value=String(S.mmDivisor||D.mmDivisor);
g("terms").value=(Array.isArray(S.terms)?S.terms:D.terms).join("\n")}
function saveQuoteSettings(){const g=id=>document.getElementById(id);const S=data.settings;
S.gstRate=Number(g("gstRate").value)||0;
S.validityDays=Number(g("validityDays").value)||15;
S.quotePrefix=g("quotePrefix").value.trim()||DEFAULT_DATA.settings.quotePrefix;
S.mmDivisor=Number(g("mmDivisor").value)||90000;
S.minAreaSqft=Number(g("minAreaSqft").value)||0;
S.terms=g("terms").value.split("\n").map(t=>t.trim()).filter(Boolean);
Store.saveSettings(data.settings).then(r=>alert(r.ok?"Quotation settings saved to "+r.where+".":"Saved on this device, but the cloud refused:\n\n"+r.error))}

// ===================================================================
// CLOUD MODE
// ===================================================================

function el(id){return document.getElementById(id)}

function setLoginMode(){
  const cloud = Store.mode==="cloud";
  el("loginMode").textContent = cloud
    ? "Signed-in owner access. Changes you save reach every device."
    : "This site is saving to this browser only. Changes will not reach other devices until Firebase is set up (see FIREBASE-SETUP.md).";
  el("cloudLogin").style.display = cloud ? "block" : "none";
  el("localLogin").style.display = cloud ? "none" : "block";
  if(cloud && FIREBASE_ADMIN_EMAIL) el("adminEmail").value = FIREBASE_ADMIN_EMAIL;
}

async function loginCloud(){
  el("loginError").textContent="";
  const r = await Store.signIn(el("adminEmail").value.trim(), el("adminPasswordCloud").value);
  if(!r.ok){ el("loginError").textContent = r.error; return }
  el("adminPasswordCloud").value="";
  show();
}

function cloudStatusText(){
  if(Store.mode!=="cloud") return "Not configured — this device only. Fill in firebase-config.js to switch cloud sync on.";
  if(!Store.user) return "Cloud configured, but you are not signed in.";
  return "Connected as " + Store.user.email + ". Saves reach every device within a second.";
}

function refreshCloudUi(){
  const s=el("cloudStatus"); if(s) s.textContent=cloudStatusText();
  const t=el("cloudTools"); if(t) t.style.display=(Store.mode==="cloud"&&Store.user)?"block":"none";
}

async function seedCloudNow(){
  if(!confirm("Copy this device's catalogue and settings to the cloud?\n\nThis overwrites what is in the cloud with what is on this device.")) return;
  const r = await Store.seedCloud(data);
  alert(r.ok ? "Uploaded. Every device will now see this data." : "Upload failed.\n\n" + r.error);
}

// ---------- quotation history ----------
async function loadQuoteHistory(){
  const box=el("quoteHistory"); if(!box) return;
  box.innerHTML="<p class='note'>Loading…</p>";
  const list = await Store.listQuotations(50);
  el("quoteHistWhere").textContent =
    (Store.mode==="cloud"&&Store.user) ? "Showing cloud history." : "Showing this device's history only.";
  if(!list.length){ box.innerHTML="<p class='note'>No quotations yet.</p>"; return }
  box.innerHTML = "<table class='qtable'><thead><tr><th>Quotation</th><th>Date</th><th>Customer</th><th>Phone</th><th>Items</th><th>Grand Total</th></tr></thead><tbody>"
    + list.map(q=>`<tr><td><b>${esc(q.qno||"")}</b></td><td>${esc(q.date||"")}</td><td>${esc(q.customer||"")}</td><td>${esc(q.phone||"")}</td><td>${q.itemCount||0}</td><td>Rs ${esc(String(q.grand||""))}</td></tr>`).join("")
    + "</tbody></table>";
}

// ---------- start-up ----------
Store.init().then(()=>{
  setLoginMode();
  Store.onAuth(()=>{ refreshCloudUi(); if(Store.user && Store.mode==="cloud") show() });
  refreshCloudUi();
  // cloud data arriving while the panel is open
  Store.onChange(fresh=>{
    data = fresh;
    if(el("adminPanel").style.display==="block") loadForm();
  });
});
