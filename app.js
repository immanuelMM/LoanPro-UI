/* LoanPro — app.js (Reverted to LocalStorage) */

// ── Data ──────────────────────────────────────────────────
var DB = {
  get: function(k){ try{ return JSON.parse(localStorage.getItem(k))||[]; }catch(e){ return []; } },
  set: function(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
};

var loans     = DB.get('lp_loans');
var borrowers = DB.get('lp_borrowers');
var payments  = DB.get('lp_payments');
var activity  = DB.get('lp_activity');
var storedSettings = localStorage.getItem('lp_settings');
var settings = { emailjs_service: 'default_service', emailjs_template: 'template_53kpkj7', emailjs_public_key: 'QsV4vGpnW4fLkBGMU', auto_send: true };

if (storedSettings) {
  try {
    var parsed = JSON.parse(storedSettings);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
       Object.assign(settings, parsed);
       // EXCEPTION: Always ensure the IDs are the latest working ones to override cached errors
       settings.emailjs_service = 'default_service';
       settings.emailjs_template = 'template_53kpkj7';
    }
  } catch(e) {}
}

function save(){
  DB.set('lp_loans',loans);
  DB.set('lp_borrowers',borrowers);
  DB.set('lp_payments',payments);
  DB.set('lp_activity',activity);
  DB.set('lp_settings',settings);
}

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

// ── Utilities ─────────────────────────────────────────────
function fmt(n){
  return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2}).format(n||0);
}
function fmtDate(d){
  if(!d) return '—';
  return new Date(d).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});
}
function today(){ return new Date().toISOString().split('T')[0]; }

function logActivity(type,msg){
  activity.unshift({id:uid(),type:type,msg:msg,date:new Date().toISOString()});
  if(activity.length>50) activity.pop();
  save();
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg,type){
  type=type||'success';
  var c=document.getElementById('toastContainer');
  var t=document.createElement('div');
  t.className='toast toast-'+type;
  var icons={success:'✓',error:'✕',info:'ℹ',warning:'⚠'};
  t.innerHTML='<span class="toast-icon">'+(icons[type]||'✓')+'</span><span>'+msg+'</span>';
  c.appendChild(t);
  requestAnimationFrame(function(){ t.classList.add('show'); });
  setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); },350); },3200);
}

// ── Modal ─────────────────────────────────────────────────
function openModal(title,body,footer){
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalBody').innerHTML=body;
  document.getElementById('modalFooter').innerHTML=footer||'';
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal(){ document.getElementById('modalOverlay').classList.remove('open'); }
document.getElementById('modalClose').addEventListener('click',closeModal);
document.getElementById('modalOverlay').addEventListener('click',function(e){
  if(e.target===e.currentTarget) closeModal();
});

// ── Calculations ──────────────────────────────────────────
function calcLoan(principal,rate,term,type){
  var r=rate/100, totalInterest, monthlyPayment, schedule=[];
  if(type==='simple'){
    totalInterest=principal*r;
    var total=principal+totalInterest;
    monthlyPayment=total/term;
    var bal=total;
    for(var i=1;i<=term;i++){
      var inte=totalInterest/term, prin=principal/term;
      bal-=monthlyPayment;
      schedule.push({period:i,payment:monthlyPayment,principal:prin,interest:inte,balance:Math.max(0,bal)});
    }
  } else {
    var mr=r/12;
    if(mr===0){ monthlyPayment=principal/term; }
    else { monthlyPayment=principal*(mr*Math.pow(1+mr,term))/(Math.pow(1+mr,term)-1); }
    var bal2=principal; totalInterest=0;
    for(var j=1;j<=term;j++){
      var inte2=bal2*mr, prin2=monthlyPayment-inte2;
      bal2-=prin2; totalInterest+=inte2;
      schedule.push({period:j,payment:monthlyPayment,principal:prin2,interest:inte2,balance:Math.max(0,bal2)});
    }
  }
  return {totalInterest:totalInterest,monthlyPayment:monthlyPayment,totalAmount:principal+totalInterest,schedule:schedule};
}

function loanPaid(loan){
  return payments.filter(function(p){ return p.loanId===loan.id; }).reduce(function(s,p){ return s+p.amount; },0);
}
function loanOutstanding(loan){
  return Math.max(0,loan.totalAmount-loanPaid(loan));
}
function loanStatus(loan){
  if(loan.status==='closed') return 'closed';
  if(loanOutstanding(loan)<=0) return 'paid';
  if(loan.dueDate && new Date(loan.dueDate)<new Date()) return 'overdue';
  return loan.status||'active';
}
function badgeHTML(st){
  var map={active:'badge-active',pending:'badge-pending',overdue:'badge-overdue',closed:'badge-closed',paid:'badge-paid'};
  return '<span class="badge '+(map[st]||'badge-active')+'">'+st+'</span>';
}

// ── Router ────────────────────────────────────────────────
var routes={};
function register(hash,fn){ routes[hash]=fn; }

function navigate(hash){
  var page=(hash||'').replace('#','')||'dashboard';
  var base=page.split('/')[0];
  var area=document.getElementById('contentArea');
  document.querySelectorAll('.nav-item').forEach(function(el){
    el.classList.toggle('active',el.dataset.page===base);
  });
  var labels={dashboard:'Dashboard',loans:'Loans','new-loan':'New Loan',borrowers:'Borrowers','new-borrower':'New Borrower',payments:'Payments',reports:'Reports','loan-detail':'Loan Detail',settings:'Settings'};
  document.getElementById('breadcrumbText').textContent=labels[base]||base;
  document.getElementById('badge-loans').textContent=loans.length;
  document.getElementById('badge-borrowers').textContent=borrowers.length;
  var hasOverdue=loans.some(function(l){ return loanStatus(l)==='overdue'; });
  document.getElementById('notifDot').classList.toggle('visible',hasOverdue);
  if(routes[base]){ area.innerHTML=''; routes[base](page,area); }
  else { area.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Page not found</div></div>'; }
}

function initEmailJS() {
  if (window.emailjs && settings.emailjs_public_key) {
    emailjs.init(settings.emailjs_public_key);
  }
}
window.addEventListener('load', initEmailJS);

window.addEventListener('hashchange',function(){ navigate(location.hash); });

document.getElementById('sidebarToggle').addEventListener('click',function(){
  document.getElementById('sidebar').classList.toggle('collapsed');
});
document.getElementById('mobileMenuBtn').addEventListener('click',function(){
  document.getElementById('sidebar').classList.toggle('mobile-open');
});

(function(){
  var el=document.getElementById('topbarDate');
  el.textContent=new Date().toLocaleDateString('en-PH',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
})();

// ── Dashboard ──────────────────────────────────────────────
register('dashboard',function(_,area){
  var totLoaned=loans.reduce(function(s,l){ return s+l.principal; },0);
  var totOut=loans.reduce(function(s,l){ return s+loanOutstanding(l); },0);
  var totColl=loans.reduce(function(s,l){ return s+loanPaid(l); },0);
  var actCnt=loans.filter(function(l){ return loanStatus(l)==='active'; }).length;
  var ovCnt=loans.filter(function(l){ return loanStatus(l)==='overdue'; }).length;

  area.innerHTML='<div class="page">'+
    '<div class="page-header"><div class="page-header-info"><h1 class="page-title">Dashboard</h1><p class="page-subtitle">Welcome back! Here\'s your financial overview.</p></div>'+
    '<div class="page-actions"><button class="btn btn-primary" onclick="location.hash=\'#new-loan\'">+ New Loan</button></div></div>'+
    '<div class="kpi-grid">'+
      '<div class="kpi-card teal"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="kpi-info"><span class="kpi-label">Total Loaned</span><span class="kpi-value">'+fmt(totLoaned)+'</span><span class="kpi-sub">'+loans.length+' loans issued</span></div></div>'+
      '<div class="kpi-card rose"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="kpi-info"><span class="kpi-label">Outstanding</span><span class="kpi-value">'+fmt(totOut)+'</span><span class="kpi-sub">'+ovCnt+' overdue</span></div></div>'+
      '<div class="kpi-card emerald"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="kpi-info"><span class="kpi-label">Collected</span><span class="kpi-value">'+fmt(totColl)+'</span><span class="kpi-sub">'+payments.length+' payments recorded</span></div></div>'+
      '<div class="kpi-card indigo"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="kpi-info"><span class="kpi-label">Borrowers</span><span class="kpi-value">'+borrowers.length+'</span><span class="kpi-sub">'+actCnt+' active loans</span></div></div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 340px;gap:20px;">'+
      '<div class="table-container"><div class="table-header"><span class="table-title">Recent Loans</span><button class="btn btn-secondary btn-sm" onclick="location.hash=\'#loans\'">View All</button></div>'+
      '<table><thead><tr><th>Borrower</th><th>Amount</th><th>Term</th><th>Status</th></tr></thead><tbody id="dashTbody"></tbody></table></div>'+
      '<div class="card" style="padding:0;overflow:hidden"><div class="table-header"><span class="table-title">Recent Activity</span></div><div id="dashAct" style="padding:0 20px"></div></div>'+
    '</div></div>';

  var tb=document.getElementById('dashTbody');
  var rec=[].concat(loans).sort(function(a,b){ return b.createdAt.localeCompare(a.createdAt); }).slice(0,6);
  if(!rec.length){ tb.innerHTML='<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No loans yet</div></div></td></tr>'; }
  else { rec.forEach(function(l){ var b=borrowers.find(function(x){ return x.id===l.borrowerId; }); tb.innerHTML+='<tr onclick="location.hash=\'#loan-detail/'+l.id+'\'" style="cursor:pointer"><td class="td-primary">'+(b?b.name:'—')+'</td><td class="td-amount">'+fmt(l.principal)+'</td><td>'+l.term+' mo.</td><td>'+badgeHTML(loanStatus(l))+'</td></tr>'; }); }

  var ac=document.getElementById('dashAct');
  var rAct=activity.slice(0,8);
  if(!rAct.length){ ac.innerHTML='<div style="padding:20px 0;color:var(--text-muted);font-size:13px;text-align:center">No activity yet.</div>'; }
  else { var dm={loan:'activity-dot-loan',payment:'activity-dot-payment',borrower:'activity-dot-borrower',overdue:'activity-dot-overdue'}; rAct.forEach(function(a){ ac.innerHTML+='<div class="activity-item"><div class="activity-dot '+(dm[a.type]||'activity-dot-loan')+'"></div><div style="flex:1;font-size:13px;color:var(--text-secondary)">'+a.msg+'</div><div style="font-size:11px;color:var(--text-muted);white-space:nowrap">'+fmtDate(a.date)+'</div></div>'; }); }
});

// ── Borrowers ──────────────────────────────────────────────
register('borrowers',function(_,area){
  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">Borrowers</h1><p class="page-subtitle">Manage all registered borrowers.</p></div><div class="page-actions"><button class="btn btn-primary" onclick="location.hash=\'#new-borrower\'">+ Add Borrower</button></div></div>'+
    '<div class="table-container"><div class="table-header"><span class="table-title">All Borrowers</span><div class="search-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input id="bSrch" type="text" placeholder="Search..." oninput="filterBorrowers()"></div></div>'+
    '<table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Active Loans</th><th>Total Loaned</th><th>Actions</th></tr></thead><tbody id="bTbody"></tbody></table></div></div>';
  renderBorrowers();
});

function filterBorrowers(){
  var q=(document.getElementById('bSrch').value||'').toLowerCase();
  document.querySelectorAll('#bTbody tr').forEach(function(tr){ tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none'; });
}

function renderBorrowers(){
  var tb=document.getElementById('bTbody'); if(!tb) return;
  if(!borrowers.length){ tb.innerHTML='<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No borrowers yet</div><div class="empty-sub">Add your first borrower to get started.</div></div></td></tr>'; return; }
  tb.innerHTML='';
  borrowers.forEach(function(b){
    var bl=loans.filter(function(l){ return l.borrowerId===b.id; });
    var al=bl.filter(function(l){ var s=loanStatus(l); return s==='active'||s==='overdue'; }).length;
    var tl=bl.reduce(function(s,l){ return s+l.principal; },0);
    tb.innerHTML+='<tr><td class="td-primary">'+b.name+'</td><td>'+(b.phone||'—')+'</td><td>'+(b.email||'—')+'</td><td>'+al+'</td><td class="td-amount">'+fmt(tl)+'</td>'+
      '<td><div class="td-actions"><button class="icon-btn icon-btn-edit" onclick="editBorrower(\''+b.id+'\')">✎</button><button class="icon-btn icon-btn-delete" onclick="deleteBorrower(\''+b.id+'\')">✕</button></div></td></tr>';
  });
}

function editBorrower(id){
  var b=borrowers.find(function(x){ return x.id===id; }); if(!b) return;
  openModal('Edit Borrower',
    '<div class="form-grid"><div class="form-group"><label>Full Name</label><input class="form-control" id="ebN" value="'+b.name+'"></div>'+
    '<div class="form-group"><label>Phone</label><input class="form-control" id="ebP" value="'+(b.phone||'')+'"></div>'+
    '<div class="form-group"><label>Email</label><input class="form-control" id="ebE" value="'+(b.email||'')+'"></div>'+
    '<div class="form-group"><label>Address</label><input class="form-control" id="ebA" value="'+(b.address||'')+'"></div></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveBorrower(\''+id+'\')">Save</button>'
  );
}
function saveBorrower(id){
  var b=borrowers.find(function(x){ return x.id===id; }); if(!b) return;
  var n=document.getElementById('ebN').value.trim();
  if(!n){ toast('Name is required.','error'); return; }
  b.name=n; b.phone=document.getElementById('ebP').value.trim();
  b.email=document.getElementById('ebE').value.trim(); b.address=document.getElementById('ebA').value.trim();
  save(); closeModal(); renderBorrowers(); toast('Borrower updated!');
}
function deleteBorrower(id){
  var b=borrowers.find(function(x){ return x.id===id; }); if(!b) return;
  if(loans.some(function(l){ return l.borrowerId===id; })){ toast('Cannot delete — borrower has loans.','error'); return; }
  openModal('Delete Borrower','<p style="color:var(--text-secondary)">Delete <strong>'+b.name+'</strong>? Cannot be undone.</p>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmDelBorrower(\''+id+'\')">Delete</button>');
}
function confirmDelBorrower(id){ borrowers=borrowers.filter(function(x){ return x.id!==id; }); save(); closeModal(); renderBorrowers(); toast('Borrower deleted.','info'); }

// ── New Borrower ───────────────────────────────────────────
register('new-borrower',function(_,area){
  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">New Borrower</h1><p class="page-subtitle">Register a new borrower.</p></div></div>'+
    '<div class="form-card"><div class="form-section-title">Personal Information</div><div class="form-grid">'+
    '<div class="form-group"><label for="nbN">Full Name *</label><input id="nbN" class="form-control" placeholder="e.g. Juan Dela Cruz"></div>'+
    '<div class="form-group"><label for="nbPh">Phone</label><input id="nbPh" class="form-control" placeholder="09171234567"></div>'+
    '<div class="form-group"><label for="nbEm">Email</label><input id="nbEm" class="form-control" type="email" placeholder="juan@email.com"></div>'+
    '<div class="form-group"><label for="nbGov">Government ID</label><input id="nbGov" class="form-control" placeholder="SSS / PhilHealth No."></div>'+
    '<div class="form-group full-width"><label for="nbAd">Address</label><input id="nbAd" class="form-control" placeholder="Street, Barangay, City"></div>'+
    '<div class="form-group full-width"><label for="nbNt">Notes</label><textarea id="nbNt" class="form-control" rows="2" placeholder="Additional info..."></textarea></div>'+
    '</div><hr class="form-divider"><div class="form-actions"><button class="btn btn-primary btn-lg" onclick="submitNewBorrower()">Register Borrower</button><button class="btn btn-secondary" onclick="location.hash=\'#borrowers\'">Cancel</button></div></div></div>';
});
function submitNewBorrower(){
  var name=document.getElementById('nbN').value.trim();
  if(!name){ toast('Full name is required.','error'); return; }
  var b={id:uid(),name:name,phone:document.getElementById('nbPh').value.trim(),email:document.getElementById('nbEm').value.trim(),
    govId:document.getElementById('nbGov').value.trim(),address:document.getElementById('nbAd').value.trim(),
    notes:document.getElementById('nbNt').value.trim(),createdAt:new Date().toISOString()};
  borrowers.push(b); logActivity('borrower','New borrower registered: '+b.name); save();
  toast(b.name+' registered!'); location.hash='#borrowers';
}

// ── New Loan ───────────────────────────────────────────────
register('new-loan',function(_,area){
  var opts=borrowers.map(function(b){ return '<option value="'+b.id+'">'+b.name+'</option>'; }).join('');
  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">New Loan</h1><p class="page-subtitle">Create a new loan application.</p></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start">'+
    '<div class="form-card" style="max-width:100%"><div class="form-section-title">Loan Details</div><div class="form-grid">'+
    '<div class="form-group"><label>Borrower *</label><select id="nlBor" class="form-control" onchange="updatePreview()"><option value="">— Select —</option>'+opts+'</select></div>'+
    '<div class="form-group"><label>Principal (PHP) *</label><input id="nlAmt" class="form-control" type="number" min="1" placeholder="50000" oninput="updatePreview()"></div>'+
    '<div class="form-group"><label>Interest Rate (%) *</label><input id="nlRate" class="form-control" type="number" min="0" step="0.1" placeholder="20" oninput="updatePreview()"></div>'+
    '<div class="form-group"><label>Term (months) *</label><input id="nlTerm" class="form-control" type="number" min="1" placeholder="12" oninput="updatePreview()"></div>'+
    '<div class="form-group"><label>Interest Type</label><select id="nlType" class="form-control" onchange="updatePreview()"><option value="simple">Simple Interest</option><option value="compound">Reducing Balance</option></select></div>'+
    '<div class="form-group"><label>Start Date</label><input id="nlStart" class="form-control" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label>Purpose</label><select id="nlPurp" class="form-control"><option>Business Capital</option><option>Education</option><option>Medical</option><option>Home Improvement</option><option>Personal</option><option>Other</option></select></div>'+
    '<div class="form-group"><label>Status</label><select id="nlStat" class="form-control"><option value="active">Active</option><option value="pending">Pending</option></select></div>'+
    '<div class="form-group full-width"><label>Notes</label><textarea id="nlNotes" class="form-control" rows="2" placeholder="Collateral, conditions..."></textarea></div>'+
    '</div><hr class="form-divider"><div class="form-actions"><button class="btn btn-primary btn-lg" onclick="submitNewLoan()">Create Loan</button><button class="btn btn-secondary" onclick="location.hash=\'#loans\'">Cancel</button></div></div>'+
    '<div class="card" id="lnPrev" style="position:sticky;top:20px"><div class="form-section-title">Loan Preview</div><div id="prevContent" style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0">Fill in the form to preview.</div></div>'+
    '</div></div>';
});
function updatePreview(){
  var p=parseFloat(document.getElementById('nlAmt').value)||0;
  var r=parseFloat(document.getElementById('nlRate').value)||0;
  var t=parseInt(document.getElementById('nlTerm').value)||0;
  var tp=document.getElementById('nlType').value;
  var el=document.getElementById('prevContent'); if(!el) return;
  if(!p||!r||!t){ el.innerHTML='<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0">Fill amount, rate and term.</div>'; return; }
  var c=calcLoan(p,r,t,tp);
  el.innerHTML='<div class="detail-row"><span class="detail-key">Principal</span><span class="detail-val">'+fmt(p)+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Total Interest</span><span class="detail-val">'+fmt(c.totalInterest)+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Total Repayable</span><span class="detail-val" style="color:var(--primary)">'+fmt(c.totalAmount)+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Monthly Payment</span><span class="detail-val">'+fmt(c.monthlyPayment)+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Term</span><span class="detail-val">'+t+' months</span></div>';
}
function submitNewLoan(){
  var bid=document.getElementById('nlBor').value, p=parseFloat(document.getElementById('nlAmt').value), r=parseFloat(document.getElementById('nlRate').value), t=parseInt(document.getElementById('nlTerm').value), tp=document.getElementById('nlType').value, sd=document.getElementById('nlStart').value;
  if(!bid){ toast('Select a borrower.','error'); return; }
  if(!p||p<=0){ toast('Enter a valid amount.','error'); return; }
  if(!r&&r!==0){ toast('Enter a valid rate.','error'); return; }
  if(!t||t<1){ toast('Enter a valid term.','error'); return; }
  var c=calcLoan(p,r,t,tp);
  var due=new Date(sd); due.setMonth(due.getMonth()+t);
  var loan={id:uid(),borrowerId:bid,principal:p,rate:r,term:t,type:tp,startDate:sd,dueDate:due.toISOString().split('T')[0],
    purpose:document.getElementById('nlPurp').value,notes:document.getElementById('nlNotes').value.trim(),
    status:document.getElementById('nlStat').value,totalInterest:c.totalInterest,monthlyPayment:c.monthlyPayment,
    totalAmount:c.totalAmount,schedule:c.schedule,createdAt:new Date().toISOString()};
  loans.push(loan);
  var b=borrowers.find(function(x){ return x.id===bid; });
  logActivity('loan','Loan of '+fmt(p)+' created for '+(b?b.name:'borrower'));
  save(); toast('Loan created!'); 
  setTimeout(function(){ 
    generatePDF(loan.id); 
    if(settings.auto_send && b && b.email) {
      sendLoanEmail(loan.id);
    }
  }, 500);
  location.hash='#loan-detail/'+loan.id;
}


// ── Loans List ─────────────────────────────────────────────
register('loans',function(_,area){
  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">All Loans</h1><p class="page-subtitle">Browse and manage every loan.</p></div>'+
    '<div class="page-actions"><button class="btn btn-primary" onclick="location.hash=\'#new-loan\'">+ New Loan</button></div></div>'+
    '<div class="table-container"><div class="table-header"><span class="table-title">Loans</span><div style="display:flex;gap:10px;flex-wrap:wrap">'+
    '<select class="filter-select" id="lStF" onchange="renderLT()"><option value="">All Status</option><option value="active">Active</option><option value="pending">Pending</option><option value="overdue">Overdue</option><option value="paid">Paid</option><option value="closed">Closed</option></select>'+
    '<div class="search-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input id="lSrch" type="text" placeholder="Search..." oninput="renderLT()"></div></div></div>'+
    '<table><thead><tr><th>ID</th><th>Borrower</th><th>Principal</th><th>Monthly</th><th>Outstanding</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="lTbody"></tbody></table></div></div>';
  renderLT();
});
function renderLT(){
  var tb=document.getElementById('lTbody'); if(!tb) return;
  var sf=(document.getElementById('lStF')||{}).value||'';
  var q=((document.getElementById('lSrch')||{}).value||'').toLowerCase();
  var fl=loans.filter(function(l){
    var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
    return (!sf||loanStatus(l)===sf)&&(!q||(b&&b.name.toLowerCase().includes(q)));
  }).sort(function(a,b){ return b.createdAt.localeCompare(a.createdAt); });
  if(!fl.length){ tb.innerHTML='<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No loans found</div></div></td></tr>'; return; }
  tb.innerHTML='';
  fl.forEach(function(l){
    var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
    var out=loanOutstanding(l), st=loanStatus(l);
    tb.innerHTML+='<tr>'+
      '<td style="font-family:monospace;font-size:11px;color:var(--text-muted)">'+l.id.slice(-6).toUpperCase()+'</td>'+
      '<td class="td-primary">'+(b?b.name:'—')+'</td>'+
      '<td class="td-amount">'+fmt(l.principal)+'</td>'+
      '<td>'+fmt(l.monthlyPayment)+'</td>'+
      '<td style="color:'+(out>0?'var(--danger)':'var(--success)')+';font-weight:700">'+fmt(out)+'</td>'+
      '<td>'+fmtDate(l.dueDate)+'</td>'+
      '<td>'+badgeHTML(st)+'</td>'+
      '<td><div class="td-actions">'+
        '<button class="icon-btn icon-btn-view" title="View" onclick="location.hash=\'#loan-detail/'+l.id+'\'">👁</button>'+
        '<button class="icon-btn icon-btn-pay" title="Pay" onclick="openPayModal(\''+l.id+'\')">$</button>'+
        '<button class="icon-btn icon-btn-delete" title="Delete" onclick="delLoan(\''+l.id+'\')">✕</button>'+
      '</div></td></tr>';
  });
}
function delLoan(id){
  var l=loans.find(function(x){ return x.id===id; }); if(!l) return;
  var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
  openModal('Delete Loan','<p style="color:var(--text-secondary)">Delete the <strong>'+fmt(l.principal)+'</strong> loan for <strong>'+(b?b.name:'borrower')+'</strong>? All payments will also be removed.</p>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmDelLoan(\''+id+'\')">Delete</button>');
}
function confirmDelLoan(id){
  loans=loans.filter(function(x){ return x.id!==id; });
  payments=payments.filter(function(x){ return x.loanId!==id; });
  save(); closeModal(); renderLT(); toast('Loan deleted.','info');
}

// ── Loan Detail ────────────────────────────────────────────
register('loan-detail',function(page,area){
  var id=page.split('/')[1];
  var loan=loans.find(function(x){ return x.id===id; });
  if(!loan){ area.innerHTML='<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Loan not found</div><button class="btn btn-secondary" onclick="location.hash=\'#loans\'">Back</button></div>'; return; }
  var b=borrowers.find(function(x){ return x.id===loan.borrowerId; });
  var out=loanOutstanding(loan), paid=loanPaid(loan), pct=Math.min(100,(paid/loan.totalAmount)*100), st=loanStatus(loan);
  var lPay=payments.filter(function(p){ return p.loanId===id; }).sort(function(a,b){ return b.date.localeCompare(a.date); });

  var srows=''; (loan.schedule||[]).forEach(function(r){ srows+='<tr><td>'+r.period+'</td><td>'+fmt(r.payment)+'</td><td>'+fmt(r.principal)+'</td><td>'+fmt(r.interest)+'</td><td style="color:var(--primary)">'+fmt(r.balance)+'</td></tr>'; });
  var prows=''; if(!lPay.length){ prows='<tr><td colspan="4"><div class="empty-state" style="padding:30px"><div class="empty-icon">💳</div><div class="empty-title">No payments yet</div></div></td></tr>'; }
  else { lPay.forEach(function(p){ prows+='<tr><td>'+fmtDate(p.date)+'</td><td class="td-amount">'+fmt(p.amount)+'</td><td style="color:var(--text-muted);font-size:12px">'+(p.note||'—')+'</td><td><div class="td-actions"><button class="icon-btn icon-btn-receipt" title="Download Receipt" onclick="downloadReceipt(\''+p.id+'\')">🧾</button><button class="icon-btn icon-btn-delete" onclick="delPayment(\''+p.id+'\',\''+loan.id+'\')">✕</button></div></td></tr>'; }); }

  area.innerHTML='<div class="page">'+
    '<div class="page-header"><div class="page-header-info"><h1 class="page-title">Loan Detail</h1><p class="page-subtitle">'+(b?b.name:'?')+' · #'+loan.id.slice(-6).toUpperCase()+'</p></div>'+
    '<div class="page-actions"><button class="btn btn-secondary" onclick="location.hash=\'#loans\'">← Back</button>'+
    '<button class="btn btn-secondary" onclick="generatePDF(\''+loan.id+'\')">⬇️ Download PDF</button>'+
    '<button class="btn btn-secondary" onclick="sendLoanEmail(\''+loan.id+'\')">📧 Send Email</button>'+
    (st!=='paid'&&st!=='closed'?'<button class="btn btn-primary" onclick="openPayModal(\''+loan.id+'\')">Record Payment</button>':'')+
    (st!=='closed'?'<button class="btn btn-secondary" onclick="closeLoan(\''+loan.id+'\')">Close Loan</button>':'')+
    '</div></div>'+
    '<div class="loan-detail-grid">'+
    '<div style="display:flex;flex-direction:column;gap:20px">'+
      '<div class="card"><div class="form-section-title">Loan Summary</div>'+
        '<div class="detail-row"><span class="detail-key">Borrower</span><span class="detail-val">'+(b?b.name:'—')+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Principal</span><span class="detail-val">'+fmt(loan.principal)+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Interest Rate</span><span class="detail-val">'+loan.rate+'% ('+loan.type+')</span></div>'+
        '<div class="detail-row"><span class="detail-key">Term</span><span class="detail-val">'+loan.term+' months</span></div>'+
        '<div class="detail-row"><span class="detail-key">Monthly Payment</span><span class="detail-val">'+fmt(loan.monthlyPayment)+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Total Interest</span><span class="detail-val">'+fmt(loan.totalInterest)+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Total Repayable</span><span class="detail-val">'+fmt(loan.totalAmount)+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Start Date</span><span class="detail-val">'+fmtDate(loan.startDate)+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Due Date</span><span class="detail-val">'+fmtDate(loan.dueDate)+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Purpose</span><span class="detail-val">'+(loan.purpose||'—')+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Status</span><span class="detail-val">'+badgeHTML(st)+'</span></div>'+
        (loan.notes?'<div class="detail-row"><span class="detail-key">Notes</span><span class="detail-val" style="font-size:12px;max-width:55%;text-align:right">'+loan.notes+'</span></div>':'')+
      '</div>'+
      '<div class="table-container"><div class="table-header"><span class="table-title">Amortization Schedule</span></div>'+
        '<div style="max-height:320px;overflow-y:auto"><table><thead><tr><th>#</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>'+srows+'</tbody></table></div></div>'+
    '</div>'+
    '<div style="display:flex;flex-direction:column;gap:20px">'+
      '<div class="card"><div class="form-section-title">Repayment Progress</div>'+
        '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px">'+fmt(paid)+' paid of '+fmt(loan.totalAmount)+'</div>'+
        '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:'+pct.toFixed(1)+'%"></div></div>'+
        '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">'+pct.toFixed(1)+'% repaid</div>'+
        '<hr class="form-divider">'+
        '<div class="detail-row"><span class="detail-key">Amount Paid</span><span class="detail-val" style="color:var(--success)">'+fmt(paid)+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Outstanding</span><span class="detail-val" style="color:'+(out>0?'var(--danger)':'var(--success)')+'">'+fmt(out)+'</span></div>'+
        '<div class="detail-row"><span class="detail-key">Payments Made</span><span class="detail-val">'+lPay.length+'</span></div>'+
      '</div>'+
      '<div class="table-container"><div class="table-header"><span class="table-title">Payment History</span></div>'+
        '<div style="max-height:300px;overflow-y:auto"><table><thead><tr><th>Date</th><th>Amount</th><th>Note</th><th></th></tr></thead><tbody>'+prows+'</tbody></table></div></div>'+
    '</div></div></div>';
});

function closeLoan(id){ var l=loans.find(function(x){ return x.id===id; }); if(!l) return; l.status='closed'; save(); toast('Loan closed.','info'); navigate('#loan-detail/'+id); }
function delPayment(pid,lid){ payments=payments.filter(function(x){ return x.id!==pid; }); save(); toast('Payment removed.','info'); navigate('#loan-detail/'+lid); }
function downloadReceipt(pid){ generateImageReceipt(pid); }

// ── Payments ───────────────────────────────────────────────
register('payments',function(_,area){
  var al=loans.filter(function(l){ var s=loanStatus(l); return s==='active'||s==='overdue'||s==='pending'; });
  var opts=al.map(function(l){ var b=borrowers.find(function(x){ return x.id===l.borrowerId; }); return '<option value="'+l.id+'">'+(b?b.name:'?')+' — '+fmt(l.principal)+' ('+l.id.slice(-6).toUpperCase()+')</option>'; }).join('');
  var rp=[].concat(payments).sort(function(a,b){ return b.date.localeCompare(a.date); }).slice(0,15);
  var rrows='';
  if(!rp.length){ rrows='<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">💳</div><div class="empty-title">No payments yet</div></div></td></tr>'; }
  else { rp.forEach(function(p){ var l=loans.find(function(x){ return x.id===p.loanId; }); var b=l?borrowers.find(function(x){ return x.id===l.borrowerId; }):null; rrows+='<tr><td>'+fmtDate(p.date)+'</td><td class="td-primary">'+(b?b.name:'—')+'</td><td style="font-family:monospace;font-size:11px;color:var(--text-muted)">'+(l?l.id.slice(-6).toUpperCase():'—')+'</td><td class="td-amount">'+fmt(p.amount)+'</td><td style="color:var(--text-muted);font-size:12px">'+(p.note||'—')+'</td><td><button class="icon-btn icon-btn-receipt" title="Download Receipt" onclick="downloadReceipt(\''+p.id+'\')">🧾</button></td></tr>'; }); }

  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">Record Payment</h1><p class="page-subtitle">Log a repayment against an active loan.</p></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">'+
    '<div class="form-card" style="max-width:100%"><div class="form-section-title">Payment Details</div><div class="form-grid col-1">'+
    '<div class="form-group"><label>Loan *</label><select id="pyLoan" class="form-control" onchange="refPayInfo()"><option value="">— Select Loan —</option>'+opts+'</select></div>'+
    '<div class="form-group"><label>Amount (PHP) *</label><input id="pyAmt" class="form-control" type="number" min="1" placeholder="5000"></div>'+
    '<div class="form-group"><label>Date</label><input id="pyDate" class="form-control" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label>Note / Reference</label><input id="pyNote" class="form-control" placeholder="e.g. GCash ref #1234"></div>'+
    '</div><hr class="form-divider"><div class="form-actions"><button class="btn btn-primary btn-lg" onclick="submitPay()">Record Payment</button></div></div>'+
    '<div class="card" id="payInfo"><div style="color:var(--text-muted);font-size:13px;text-align:center;padding:30px 0">Select a loan to see details.</div></div></div>'+
    '<div class="table-container" style="margin-top:24px"><div class="table-header"><span class="table-title">Recent Payments</span></div>'+
    '<table><thead><tr><th>Date</th><th>Borrower</th><th>Loan ID</th><th>Amount</th><th>Note</th><th>Action</th></tr></thead><tbody>'+rrows+'</tbody></table></div></div>';
});
function refPayInfo(){
  var lid=(document.getElementById('pyLoan')||{}).value||'';
  var card=document.getElementById('payInfo'); if(!card) return;
  var loan=loans.find(function(x){ return x.id===lid; });
  if(!loan){ card.innerHTML='<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:30px 0">Select a loan to see details.</div>'; return; }
  var b=borrowers.find(function(x){ return x.id===loan.borrowerId; });
  var out=loanOutstanding(loan), pd=loanPaid(loan), pct=loan.totalAmount>0?((pd/loan.totalAmount)*100).toFixed(1):'0.0';
  card.innerHTML='<div class="form-section-title">Loan Info</div>'+
    '<div class="detail-row"><span class="detail-key">Borrower</span><span class="detail-val">'+(b?b.name:'—')+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Total Repayable</span><span class="detail-val">'+fmt(loan.totalAmount)+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Monthly Payment</span><span class="detail-val">'+fmt(loan.monthlyPayment)+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Amount Paid</span><span class="detail-val" style="color:var(--success)">'+fmt(pd)+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Outstanding</span><span class="detail-val" style="color:var(--danger)">'+fmt(out)+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Due Date</span><span class="detail-val">'+fmtDate(loan.dueDate)+'</span></div>'+
    '<hr class="form-divider"><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:'+Math.min(100,+pct)+'%"></div></div>'+
    '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">'+pct+'% repaid</div>';
}
function openPayModal(loanId){
  var loan=loans.find(function(x){ return x.id===loanId; }); if(!loan) return;
  var b=borrowers.find(function(x){ return x.id===loan.borrowerId; });
  var out=loanOutstanding(loan);
  openModal('Record Payment',
    '<div class="form-grid col-1" style="gap:14px">'+
    '<div class="detail-row"><span class="detail-key">Borrower</span><span class="detail-val">'+(b?b.name:'—')+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Outstanding</span><span class="detail-val" style="color:var(--danger)">'+fmt(out)+'</span></div>'+
    '<div class="form-group"><label>Amount (PHP) *</label><input class="form-control" id="mpAmt" type="number" min="1" value="'+loan.monthlyPayment.toFixed(2)+'"></div>'+
    '<div class="form-group"><label>Date</label><input class="form-control" id="mpDate" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label>Note</label><input class="form-control" id="mpNote" placeholder="Optional..."></div></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitModalPay(\''+loanId+'\')">Record</button>'
  );
}
function submitModalPay(lid){
  var amt=parseFloat(document.getElementById('mpAmt').value);
  if(!amt||amt<=0){ toast('Enter a valid amount.','error'); return; }
  recPay(lid,amt,document.getElementById('mpDate').value,document.getElementById('mpNote').value.trim());
  closeModal(); navigate(location.hash||'#dashboard');
}
function submitPay(){
  var lid=(document.getElementById('pyLoan')||{}).value||'';
  var amt=parseFloat((document.getElementById('pyAmt')||{}).value||0);
  if(!lid){ toast('Select a loan.','error'); return; }
  if(!amt||amt<=0){ toast('Enter a valid amount.','error'); return; }
  recPay(lid,amt,(document.getElementById('pyDate')||{}).value||today(),(document.getElementById('pyNote')||{}).value||'');
  navigate('#payments');
}
function recPay(lid,amt,date,note){
  var loan=loans.find(function(x){ return x.id===lid; });
  var b=loan?borrowers.find(function(x){ return x.id===loan.borrowerId; }):null;
  var pid = uid();
  payments.push({id:pid,loanId:lid,amount:amt,date:date,note:note,createdAt:new Date().toISOString()});
  logActivity('payment','Payment of '+fmt(amt)+' recorded for '+(b?b.name:'loan'));
  save(); 
  toast(fmt(amt)+' payment recorded!');
  setTimeout(function(){ generateImageReceipt(pid); }, 700);
}

// ── Reports ────────────────────────────────────────────────
register('reports',function(_,area){
  var tl=loans.reduce(function(s,l){ return s+l.principal; },0);
  var tc=loans.reduce(function(s,l){ return s+loanPaid(l); },0);
  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">Reports &amp; Analytics</h1><p class="page-subtitle">Visual insights into your loan portfolio.</p></div></div>'+
    '<div class="stats-row" style="margin-bottom:24px">'+
    '<div class="stat-mini"><div class="stat-mini-label">Total Loans</div><div class="stat-mini-value">'+loans.length+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">Active</div><div class="stat-mini-value">'+loans.filter(function(l){ return loanStatus(l)==='active'; }).length+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">Overdue</div><div class="stat-mini-value" style="color:var(--danger)">'+loans.filter(function(l){ return loanStatus(l)==='overdue'; }).length+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">Paid Off</div><div class="stat-mini-value" style="color:var(--success)">'+loans.filter(function(l){ return loanStatus(l)==='paid'; }).length+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">Total Loaned</div><div class="stat-mini-value">'+fmt(tl)+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">Collected</div><div class="stat-mini-value">'+fmt(tc)+'</div></div>'+
    '</div>'+
    '<div class="reports-grid">'+
    '<div class="chart-card"><div class="chart-title">Loan Status Breakdown</div><div class="chart-container"><canvas id="chSt"></canvas></div></div>'+
    '<div class="chart-card"><div class="chart-title">Monthly Collections</div><div class="chart-container"><canvas id="chMo"></canvas></div></div>'+
    '<div class="chart-card"><div class="chart-title">Loan Volume by Purpose</div><div class="chart-container"><canvas id="chPu"></canvas></div></div>'+
    '<div class="chart-card"><div class="chart-title">Outstanding vs Collected</div><div class="chart-container"><canvas id="chOC"></canvas></div></div>'+
    '</div></div>';
  setTimeout(drawCharts,60);
});
function drawCharts(){
  if(typeof Chart==='undefined') return;
  var isLight = document.documentElement.getAttribute('data-theme') === 'light';
  Chart.defaults.color = isLight ? '#475569' : '#8fa3bf';
  Chart.defaults.borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)';
  var sc={active:0,pending:0,overdue:0,paid:0,closed:0};
  loans.forEach(function(l){ var st=loanStatus(l); if(sc[st]!==undefined) sc[st]++; });
  new Chart(document.getElementById('chSt'),{type:'doughnut',data:{labels:['Active','Pending','Overdue','Paid','Closed'],datasets:[{data:[sc.active,sc.pending,sc.overdue,sc.paid,sc.closed],backgroundColor:['#14b8a6','#f59e0b','#f43f5e','#10b981','#506478'],borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},cutout:'65%'}});
  var mm={}; payments.forEach(function(p){ var m=p.date.slice(0,7); mm[m]=(mm[m]||0)+p.amount; });
  var mos=Object.keys(mm).sort().slice(-8);
  new Chart(document.getElementById('chMo'),{type:'bar',data:{labels:mos.map(function(m){ var sp=m.split('-'); return new Date(+sp[0],+sp[1]-1).toLocaleString('default',{month:'short',year:'2-digit'}); }),datasets:[{label:'Collected',data:mos.map(function(m){ return mm[m]; }),backgroundColor:'rgba(20,184,166,0.7)',borderRadius:6,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  var pm={}; loans.forEach(function(l){ var p=l.purpose||'Other'; pm[p]=(pm[p]||0)+l.principal; });
  new Chart(document.getElementById('chPu'),{type:'doughnut',data:{labels:Object.keys(pm),datasets:[{data:Object.values(pm),backgroundColor:['#6366f1','#14b8a6','#f59e0b','#f43f5e','#10b981','#3b82f6'],borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},cutout:'60%'}});
  var totC=loans.reduce(function(s,l){ return s+loanPaid(l); },0), totO=loans.reduce(function(s,l){ return s+loanOutstanding(l); },0), totP=loans.reduce(function(s,l){ return s+l.principal; },0);
  new Chart(document.getElementById('chOC'),{type:'bar',data:{labels:['Collected','Outstanding','Total Loaned'],datasets:[{data:[totC,totO,totP],backgroundColor:['rgba(16,185,129,0.75)','rgba(244,63,94,0.75)','rgba(20,184,166,0.5)'],borderRadius:6,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
}

// ── Settings ──────────────────────────────────────────────────
register('settings', function(_, area) {
  area.innerHTML = '<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">Settings</h1><p class="page-subtitle">Configure system notifications and integrations.</p></div></div>' +
    '<div class="form-card"><div class="form-section-title">EmailJS Configuration</div>' +
    '<p style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">To send emails directly from the browser, sign up at <a href="https://www.emailjs.com/" target="_blank" style="color:var(--primary)">EmailJS.com</a> and enter your keys below.</p>' +
    '<div class="form-grid">' +
    '<div class="form-group"><label>Service ID</label><input class="form-control" id="stSvc" value="' + (settings.emailjs_service || '') + '" placeholder="e.g. service_xxxx"></div>' +
    '<div class="form-group"><label>Template ID</label><input class="form-control" id="stTmp" value="' + (settings.emailjs_template || '') + '" placeholder="e.g. template_xxxx"></div>' +
    '<div class="form-group"><label>Public Key</label><input class="form-control" id="stKey" value="' + (settings.emailjs_public_key || '') + '" placeholder="e.g. user_xxxx"></div>' +
    '<div class="form-group"><label>Auto-send on Generation</label><div style="margin-top:8px"><label class="btn-check"><input type="checkbox" id="stAuto" ' + (settings.auto_send ? 'checked' : '') + '> Enable automatic email sending</label></div></div>' +
    '</div><hr class="form-divider"><div class="form-actions"><button class="btn btn-primary" onclick="saveSettings()">Save Settings</button></div></div></div>';
});

function saveSettings() {
  settings.emailjs_service = document.getElementById('stSvc').value.trim();
  settings.emailjs_template = document.getElementById('stTmp').value.trim();
  settings.emailjs_public_key = document.getElementById('stKey').value.trim();
  settings.auto_send = document.getElementById('stAuto').checked;
  save();
  initEmailJS();
  toast('Settings saved!');
}

function sendLoanEmail(loanId) {
  if (!settings.emailjs_service || !settings.emailjs_template || !settings.emailjs_public_key) {
    toast('EmailJS not configured in Settings.', 'warning');
    return;
  }
  
  var loan = loans.find(function(x) { return x.id === loanId; });
  if (!loan) return;
  var b = borrowers.find(function(x) { return x.id === loan.borrowerId; });
  if (!b || !b.email) {
    toast('Borrower has no email address.', 'error');
    return;
  }

  toast('Preparing email...', 'info');

  // Generate PDF for the attachment
  if (!window.jspdf) { toast('PDF library error.', 'error'); return; }
  var doc = createPDFObject(loanId);
  if (!doc) return;

  // Convert PDF to base64 (with compression if possible)
  var pdfBase64 = doc.output('datauristring', { filename: 'loan.pdf' }).split(',')[1];

  var templateParams = {
    email: b.email,
    name: b.name,
    title: 'Loan Agreement #' + loan.id.slice(-6).toUpperCase(),
    loan_id: loan.id.slice(-6).toUpperCase(),
    loan_amount: fmt(loan.principal),
    loan_terms: loan.term + ' Months',
    amount: fmt(loan.principal),
    due_date: fmtDate(loan.dueDate),
    content: pdfBase64 // This should match the attachment parameter name in EmailJS template
  };

  emailjs.send(settings.emailjs_service, settings.emailjs_template, templateParams)
    .then(function() {
      toast('Email sent to ' + b.email, 'success');
      logActivity('email', 'Loan notification sent to ' + b.name);
    }, function(error) {
      console.error('EmailJS Error:', error);
      toast('Failed to send email.', 'error');
    });
}

// ── PDF Logic ──────────────────────────────────────────────────
function generatePDF(loanId) {
  var doc = createPDFObject(loanId);
  if (!doc) return;

  var loan = loans.find(function(x) { return x.id === loanId; });
  var b = borrowers.find(function(x) { return x.id === loan.borrowerId; });
  var fileName = 'LoanPro_' + b.name.replace(/ /g, '_') + '_' + loan.id.slice(-6).toUpperCase() + '.pdf';
  
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(fileName);
  }
}

function createPDFObject(loanId) {
  if (!window.jspdf) { toast('PDF library loading...', 'warning'); return null; }
  var doc = new jspdf.jsPDF({ compress: true });
  var loan = loans.find(function(x) { return x.id === loanId; });
  if (!loan) return null;
  var b = borrowers.find(function(x) { return x.id === loan.borrowerId; });
  if (!b) return null;

  var out = loanOutstanding(loan);
  var paid = loanPaid(loan);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('LoanPro', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Official Loan Agreement & Financial Statement', 105, 28, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Date Generated: ' + fmtDate(new Date().toISOString()), 14, 40);
  doc.text('Reference No: ' + loan.id.slice(-8).toUpperCase(), 196, 40, { align: 'right' });

  doc.autoTable({
    startY: 48,
    head: [['BORROWER INFORMATION', '']],
    body: [
      ['Full Name:', b.name],
      ['Phone Number:', b.phone || 'N/A'],
      ['Email Address:', b.email || 'N/A'],
      ['Home Address:', b.address || 'N/A']
    ],
    theme: 'plain',
    headStyles: { fontSize: 11, fontStyle: 'bold', textColor: [30, 41, 59], fillColor: [241, 245, 249], cellPadding: 4 },
    bodyStyles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', width: 40, textColor: [71, 85, 105] }, 1: { textColor: [30, 41, 59] } },
    margin: { left: 14, right: 14 }
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [['LOAN CONTRACT DETAILS', '']],
    body: [
      ['Principal Loan Amount:', fmt(loan.principal)],
      ['Interest Rate:', loan.rate + '% (' + loan.type.toUpperCase() + ')'],
      ['Loan Term:', loan.term + ' Months'],
      ['Monthly Installment:', fmt(loan.monthlyPayment)],
      ['Total Repayable Amount:', fmt(loan.totalAmount)],
      ['Contract Start Date:', fmtDate(loan.startDate)],
      ['Maturity / Due Date:', fmtDate(loan.dueDate)],
      ['Purpose of Loan:', loan.purpose || 'General Purpose']
    ],
    theme: 'plain',
    headStyles: { fontSize: 11, fontStyle: 'bold', textColor: [30, 41, 59], fillColor: [241, 245, 249], cellPadding: 4 },
    bodyStyles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', width: 50, textColor: [71, 85, 105] }, 1: { fontStyle: 'bold', textColor: [20, 184, 166] } },
    margin: { left: 14, right: 14 }
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [['CURRENT ACCOUNT STATEMENT', '']],
    body: [
      ['Total Amount Paid to Date:', fmt(paid)],
      ['Outstanding Balance:', fmt(out)],
      ['Current Account Status:', loanStatus(loan).toUpperCase()]
    ],
    theme: 'plain',
    headStyles: { fontSize: 11, fontStyle: 'bold', textColor: [30, 41, 59], fillColor: [241, 245, 249], cellPadding: 4 },
    bodyStyles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', width: 55, textColor: [71, 85, 105] }, 1: { fontStyle: 'bold', textColor: [244, 63, 94] } },
    margin: { left: 14, right: 14 }
  });

  doc.addPage();
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('AMORTIZATION SCHEDULE', 14, 20);

  var tableBody = (loan.schedule || []).map(function(r) {
    return [r.period, fmt(r.payment), fmt(r.principal), fmt(r.interest), fmt(r.balance)];
  });

  doc.autoTable({
    startY: 25,
    head: [['Period', 'Payment', 'Principal', 'Interest', 'Balance']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [20, 184, 166] },
    styles: { fontSize: 9 }
  });

  var finalY = doc.lastAutoTable.finalY + 15;
  var lPay = payments.filter(function(p){ return p.loanId===loanId; }).sort(function(a,b){ return a.date.localeCompare(b.date); });
  if (lPay.length > 0) {
    if (finalY > 240) { doc.addPage(); finalY = 20; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RECENT PAYMENT HISTORY', 14, finalY);
    var payBody = lPay.map(function(p) { return [fmtDate(p.date), fmt(p.amount), p.note || '—']; });
    doc.autoTable({ startY: finalY + 5, head: [['DATE', 'AMOUNT PAID', 'REMARKS']], body: payBody, theme: 'grid', headStyles: { fillColor: [71, 85, 105], fontSize: 9, halign: 'left' }, styles: { fontSize: 8.5 }, margin: { left: 14, right: 14 } });
    finalY = doc.lastAutoTable.finalY + 15;
  }

  if (finalY > 230) { doc.addPage(); finalY = 20; }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  var agreementText = "Agreement: The Borrower hereby acknowledges receipt of the full principal amount and agrees to the terms and repayment schedule outlined above. In case of default, the Lender reserves the right to take necessary legal action to recover the outstanding balance plus applicable penalties.";
  var lines = doc.splitTextToSize(agreementText, 180);
  doc.text(lines, 14, finalY);
  finalY += lines.length * 4 + 25;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, finalY, 80, finalY);
  doc.text('Authorized Borrower Signature', 14, finalY + 5);
  doc.line(130, finalY, 196, finalY);
  doc.text('Lender / Administrator Signature', 130, finalY + 5);
  
  return doc;
}

function generateImageReceipt(payId) {
  var p = payments.find(function(x) { return x.id === payId; });
  if (!p) return;
  var loan = loans.find(function(x) { return x.id === p.loanId; });
  if (!loan) return;
  var b = borrowers.find(function(x) { return x.id === loan.borrowerId; });
  if (!b) return;

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  // High DPI scaling
  var dpr = window.devicePixelRatio || 1;
  canvas.width = 400 * dpr;
  canvas.height = 600 * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = '400px';
  canvas.style.height = '600px';

  // Background & Shadow effect
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 400, 600);
  
  // Header Gradient
  var grad = ctx.createLinearGradient(0, 0, 400, 0);
  grad.addColorStop(0, '#14b8a6');
  grad.addColorStop(1, '#0d9488');
  
  // Logo
  ctx.fillStyle = grad;
  ctx.font = 'bold 34px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LoanPro', 200, 70);
  
  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px "Inter", sans-serif';
  ctx.fillText('OFFICIAL PAYMENT RECEIPT', 200, 95);

  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(40, 115); ctx.lineTo(360, 115); ctx.stroke();

  // Details
  ctx.textAlign = 'left';
  ctx.font = '13px "Inter", sans-serif';
  ctx.fillStyle = '#94a3b8';
  var y = 150;
  
  ctx.fillText('DATE', 40, y);
  ctx.fillText('RECEIPT NO.', 40, y + 40);
  ctx.fillText('LOAN REFERENCE', 40, y + 80);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 15px "Inter", sans-serif';
  ctx.fillText(fmtDate(p.date), 360, y);
  ctx.fillText(p.id.slice(-8).toUpperCase(), 360, y + 40);
  ctx.fillText(loan.id.slice(-6).toUpperCase(), 360, y + 80);

  y = 260;
  ctx.strokeStyle = '#f1f5f9';
  ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(360, y); ctx.stroke();

  y += 40;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px "Inter", sans-serif';
  ctx.fillText('BORROWER', 40, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px "Inter", sans-serif';
  ctx.fillText(b.name, 360, y);

  y += 40;
  ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(360, y); ctx.stroke();

  // Amount Section
  y += 60;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px "Inter", sans-serif';
  ctx.fillText('TOTAL AMOUNT PAID', 200, y);
  
  y += 45;
  ctx.fillStyle = '#14b8a6';
  ctx.font = 'bold 38px "Inter", sans-serif';
  ctx.fillText(fmt(p.amount), 200, y);

  // Remarks
  y += 45;
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 13px "Inter", sans-serif';
  var note = p.note || 'Regular Loan Repayment';
  ctx.fillText('"' + note + '"', 200, y);

  // Footer / Balance
  y = 500;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(40, y, 320, 45);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(40, y, 320, 45);
  
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px "Inter", sans-serif';
  ctx.fillText('REMAINING BALANCE', 55, y + 27);
  
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f43f5e';
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillText(fmt(loanOutstanding(loan)), 345, y + 27);

  y = 575;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText('Thank you! This is a system-generated receipt.', 200, y);

  // Download Action
  var link = document.createElement('a');
  link.download = 'Receipt_' + b.name.replace(/ /g, '_') + '_' + p.id.slice(-6).toUpperCase() + '.png';
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

// ── Seed Demo Data ─────────────────────────────────────────
function seedDemo(){
  if(localStorage.getItem('lp_seeded')) return;
  var b1={id:uid(),name:'Maria Santos',phone:'09171234567',email:'maria@email.com',address:'Quezon City',govId:'SSS-1234',notes:'',createdAt:new Date().toISOString()};
  var b2={id:uid(),name:'Jose Reyes',phone:'09281234567',email:'jose@email.com',address:'Makati City',govId:'PH-567',notes:'',createdAt:new Date().toISOString()};
  borrowers.push(b1,b2);
  var c1=calcLoan(50000,12,12,'simple');
  var d1=new Date(); d1.setMonth(d1.getMonth()+12);
  var l1=Object.assign({id:uid(),borrowerId:b1.id,principal:50000,rate:12,term:12,type:'simple',startDate:today(),dueDate:d1.toISOString().split('T')[0],purpose:'Business Capital',notes:'Sari-sari store',status:'active',createdAt:new Date().toISOString()},c1);
  var c2=calcLoan(30000,10,6,'compound');
  var sd2=new Date(Date.now()-7*30*864e5); var d2=new Date(sd2); d2.setMonth(d2.getMonth()+6);
  var l2=Object.assign({id:uid(),borrowerId:b2.id,principal:30000,rate:10,term:6,type:'compound',startDate:sd2.toISOString().split('T')[0],dueDate:d2.toISOString().split('T')[0],purpose:'Education',notes:'',status:'active',createdAt:sd2.toISOString()},c2);
  loans.push(l1,l2);
  payments.push({id:uid(),loanId:l1.id,amount:c1.monthlyPayment,date:today(),note:'Month 1 payment',createdAt:new Date().toISOString()});
  payments.push({id:uid(),loanId:l2.id,amount:5000,date:today(),note:'Partial payment',createdAt:new Date().toISOString()});
  activity.unshift({id:uid(),type:'borrower',msg:'New borrower registered: Maria Santos',date:new Date().toISOString()});
  activity.unshift({id:uid(),type:'borrower',msg:'New borrower registered: Jose Reyes',date:new Date().toISOString()});
  activity.unshift({id:uid(),type:'loan',msg:'Loan of '+fmt(50000)+' created for Maria Santos',date:new Date().toISOString()});
  activity.unshift({id:uid(),type:'loan',msg:'Loan of '+fmt(30000)+' created for Jose Reyes',date:new Date().toISOString()});
  activity.unshift({id:uid(),type:'payment',msg:'Payment of '+fmt(c1.monthlyPayment)+' recorded for Maria Santos',date:new Date().toISOString()});
  save(); localStorage.setItem('lp_seeded','1');
}

// ── Theme Management ───────────────────────────────────────
var themeToggleBtn = document.getElementById('themeToggleBtn');
var sunIcon = themeToggleBtn.querySelector('.sun-icon');
var moonIcon = themeToggleBtn.querySelector('.moon-icon');

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('lp_theme', theme);
  if (theme === 'light') {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  } else {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  }
}

var savedTheme = localStorage.getItem('lp_theme') || 'dark';
setTheme(savedTheme);

themeToggleBtn.addEventListener('click', function() {
  var currentTheme = document.documentElement.getAttribute('data-theme');
  setTheme(currentTheme === 'light' ? 'dark' : 'light');
});

// ── Bootstrap ──────────────────────────────────────────────
seedDemo();
navigate(location.hash||'#dashboard');
