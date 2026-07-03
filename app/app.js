/* LoanPro — app.js (Reverted to LocalStorage) */

// ── Data ──────────────────────────────────────────────────
var DB = {
  get: function(k){ try{ return JSON.parse(localStorage.getItem(k))||[]; }catch(e){ return []; } },
  set: function(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
};

var loans        = DB.get('lp_loans');
var borrowers    = DB.get('lp_borrowers');
var payments     = DB.get('lp_payments');
var activity     = DB.get('lp_activity');
var bankLoans    = DB.get('lp_bank_loans');
var bankPayments = DB.get('lp_bank_payments');
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
  DB.set('lp_bank_loans',bankLoans);
  DB.set('lp_bank_payments',bankPayments);
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
function fmtLongDate(d){
  if(!d) return '—';
  return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
}
function fmtNoSymbol(n){
  return new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
}
function numberToWords(num) {
  var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  var n = parseFloat(num);
  if (isNaN(n)) return '';
  if (n === 0) return 'zero';
  
  var parts = [];
  var intPart = Math.floor(n);
  var decPart = Math.round((n - intPart) * 100);
  
  if (intPart >= 100) {
    parts.push(ones[Math.floor(intPart / 100)] + ' hundred');
    intPart = intPart % 100;
  }
  
  if (intPart > 0) {
    if (intPart < 20) {
      parts.push(ones[intPart]);
    } else {
      var t = Math.floor(intPart / 10);
      var o = intPart % 10;
      parts.push(tens[t] + (o > 0 ? '-' + ones[o] : ''));
    }
  }
  
  if (decPart > 0) {
    parts.push('point');
    if (decPart < 20) {
      parts.push(ones[decPart]);
    } else {
      var dt = Math.floor(decPart / 10);
      var do_ = decPart % 10;
      parts.push(tens[dt] + (do_ > 0 ? '-' + ones[do_] : ''));
    }
  }
  
  return parts.join(' ').trim();
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
function paidThisMonth(loanId){
  var cm=today().slice(0,7);
  return payments.some(function(p){
    return p.loanId===loanId && (p.createdAt||p.date).slice(0,7)===cm;
  });
}
function getDueLoans(){
  var todayDate=new Date(today());
  var cm=today().slice(0,7);
  var currentDay=todayDate.getDate();
  var daysInMonth=new Date(todayDate.getFullYear(),todayDate.getMonth()+1,0).getDate();
  return loans.filter(function(l){
    var st=loanStatus(l);
    if(st==='closed'||st==='paid') return false;
    if(loanOutstanding(l)<=0) return false;
    if(!l.startDate) return false;
    if(new Date(l.startDate)>todayDate) return false;
    if(l.startDate.slice(0,7)===cm) return false; // started this month — first payment next month
    // Monthly payment falls on same day-of-month as start date (capped to current month's max days)
    var payDay=Math.min(new Date(l.startDate).getDate(),daysInMonth);
    // Show 7 days before due, or any day after due (overdue)
    if(payDay-currentDay>7) return false;
    return !paidThisMonth(l.id);
  }).sort(function(a,b){ return new Date(a.dueDate)-new Date(b.dueDate); });
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
  var labels={dashboard:'Dashboard',loans:'Active Loans','new-loan':'New Loan',borrowers:'Borrowers','new-borrower':'New Borrower',payments:'Payments',reports:'Reports','loan-detail':'Loan Detail',settings:'Settings',notifications:'Due Payments',archive:'Archive','bank-loans':'Bank / Credit Loans','bank-loan-detail':'Bank Loan Detail'};
  document.getElementById('breadcrumbText').textContent=labels[base]||base;
  document.getElementById('badge-loans').textContent=loans.filter(function(l){ var s=loanStatus(l); return s!=='paid'&&s!=='closed'; }).length;
  document.getElementById('badge-borrowers').textContent=borrowers.length;
  var dueCnt=getDueLoans().length;
  document.getElementById('badge-notifications').textContent=dueCnt;
  document.getElementById('notifDot').classList.toggle('visible',dueCnt>0);
  var blBadge=document.getElementById('badge-bank-loans');
  if(blBadge) blBadge.textContent=bankLoans.filter(function(bl){ return bl.status!=='closed'; }).length;
  if(routes[base]){ area.innerHTML=''; routes[base](page,area); }
  else { area.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Page not found</div></div>'; }
  
  // Close mobile sidebar on navigate
  document.getElementById('sidebar').classList.remove('mobile-open');
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
document.getElementById('sidebarOverlay').addEventListener('click', function() {
  document.getElementById('sidebar').classList.remove('mobile-open');
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
    '<div class="grid-split sidebar-right">'+
      '<div class="table-container"><div class="table-header"><span class="table-title">Recent Loans</span><button class="btn btn-secondary btn-sm" onclick="location.hash=\'#loans\'">View All</button></div>'+
      '<table><thead><tr><th>Borrower</th><th>Amount</th><th>Term</th><th>Status</th></tr></thead><tbody id="dashTbody"></tbody></table></div>'+
      '<div class="card" style="padding:0;overflow:hidden"><div class="table-header"><span class="table-title">Recent Activity</span></div><div id="dashAct" style="padding:0 20px"></div></div>'+
    '</div>'+
    '<div class="table-container" style="margin-top:24px" id="dashDueWrap"></div>'+
    '</div>';

  var tb=document.getElementById('dashTbody');
  var rec=[].concat(loans).sort(function(a,b){ return b.createdAt.localeCompare(a.createdAt); }).slice(0,6);
  if(!rec.length){ tb.innerHTML='<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No loans yet</div></div></td></tr>'; }
  else { rec.forEach(function(l){ var b=borrowers.find(function(x){ return x.id===l.borrowerId; }); tb.innerHTML+='<tr onclick="location.hash=\'#loan-detail/'+l.id+'\'" style="cursor:pointer"><td class="td-primary" data-label="Borrower">'+(b?b.name:'—')+'</td><td class="td-amount" data-label="Amount">'+fmt(l.principal)+'</td><td data-label="Term">'+l.term+' mo.</td><td data-label="Status">'+badgeHTML(loanStatus(l))+'</td></tr>'; }); }

  var ac=document.getElementById('dashAct');
  var rAct=activity.slice(0,8);
  if(!rAct.length){ ac.innerHTML='<div style="padding:20px 0;color:var(--text-muted);font-size:13px;text-align:center">No activity yet.</div>'; }
  else { var dm={loan:'activity-dot-loan',payment:'activity-dot-payment',borrower:'activity-dot-borrower',overdue:'activity-dot-overdue'}; rAct.forEach(function(a){ ac.innerHTML+='<div class="activity-item"><div class="activity-dot '+(dm[a.type]||'activity-dot-loan')+'"></div><div style="flex:1;font-size:13px;color:var(--text-secondary)">'+a.msg+'</div><div style="font-size:11px;color:var(--text-muted);white-space:nowrap">'+fmtDate(a.date)+'</div></div>'; }); }

  var dueWrap=document.getElementById('dashDueWrap');
  var dueList=getDueLoans();
  if(dueList.length){
    var todayDate=new Date(today());
    var dueRows=''; dueList.slice(0,5).forEach(function(l){
      var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
      var dd=new Date(l.dueDate);
      var diff=Math.ceil((dd-todayDate)/(1000*60*60*24));
      var label=diff<0?'Overdue '+Math.abs(diff)+'d':'Unpaid this month';
      var color=diff<0?'var(--danger)':'var(--warning)';
      dueRows+='<tr>'+
        '<td class="td-primary" data-label="Borrower">'+(b?b.name:'—')+'</td>'+
        '<td data-label="Due Date">'+fmtDate(l.dueDate)+'</td>'+
        '<td data-label="Status"><span style="color:'+color+';font-weight:700;font-size:12px">'+label+'</span></td>'+
        '<td class="td-amount" data-label="Outstanding" style="color:var(--danger)">'+fmt(loanOutstanding(l))+'</td>'+
        '<td data-label="Actions"><div class="td-actions">'+
          '<button class="icon-btn icon-btn-pay" title="Record Payment" onclick="openPayModal(\''+l.id+'\')">$</button>'+
          '<button class="icon-btn icon-btn-view" title="View" onclick="location.hash=\'#loan-detail/'+l.id+'\'">👁</button>'+
        '</div></td></tr>';
    });
    dueWrap.innerHTML='<div class="table-header"><span class="table-title" style="color:var(--danger)">⚠ Due Payments ('+dueList.length+')</span><button class="btn btn-secondary btn-sm" onclick="location.hash=\'#notifications\'">View All</button></div>'+
      '<table><thead><tr><th>Borrower</th><th>Due Date</th><th>Status</th><th>Outstanding</th><th>Actions</th></tr></thead><tbody>'+dueRows+'</tbody></table>';
  } else {
    dueWrap.innerHTML='<div class="table-header"><span class="table-title" style="color:var(--success)">✓ No Due Payments</span></div><div style="padding:16px 24px;font-size:13px;color:var(--text-muted)">All loans are on track.</div>';
  }
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
    tb.innerHTML+='<tr><td class="td-primary" data-label="Name">'+b.name+'</td><td data-label="Phone">'+(b.phone||'—')+'</td><td data-label="Email">'+(b.email||'—')+'</td><td data-label="Active Loans">'+al+'</td><td class="td-amount" data-label="Total Loaned">'+fmt(tl)+'</td>'+
      '<td data-label="Actions"><div class="td-actions"><button class="icon-btn icon-btn-edit" onclick="editBorrower(\''+b.id+'\')">✎</button><button class="icon-btn icon-btn-delete" onclick="deleteBorrower(\''+b.id+'\')">✕</button></div></td></tr>';
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

// ── Co-Maker Logic ─────────────────────────────────────────
function getRequiredComakers(amount) {
  if (amount >= 20000 && amount <= 100000) return 2;
  if (amount >= 15000 && amount < 20000) return 1;
  return 0;
}

function updateComakerFields() {
  var p = parseFloat((document.getElementById('nlAmt') || {}).value) || 0;
  var required = getRequiredComakers(p);
  var container = document.getElementById('comakerSection');
  if (!container) return;

  if (required === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'block';
  var html = '<div class="form-section-title" style="margin-top:10px">Co-Maker Information <span style="font-size:11px;color:var(--text-muted);font-weight:normal">(' + required + ' required for this amount)</span></div><div class="form-grid">';
  for (var i = 1; i <= required; i++) {
    html += '<div class="form-group"><label>Co-Maker ' + i + ' Full Name *</label><input id="cmName' + i + '" class="form-control" placeholder="Full name"></div>' +
      '<div class="form-group"><label>Co-Maker ' + i + ' Phone</label><input id="cmPhone' + i + '" class="form-control" placeholder="09xx..."></div>' +
      '<div class="form-group"><label>Co-Maker ' + i + ' Address</label><input id="cmAddr' + i + '" class="form-control" placeholder="Address"></div>' +
      '<div class="form-group"><label>Co-Maker ' + i + ' Relationship</label><input id="cmRel' + i + '" class="form-control" placeholder="e.g. Spouse, Friend"></div>' +
      '<div class="form-group"><label>ID Front <span style="font-size:10px">(Optional)</span></label><input type="file" id="cmIdFront' + i + '" accept="image/*" class="form-control"></div>' +
      '<div class="form-group"><label>ID Back <span style="font-size:10px">(Optional)</span></label><input type="file" id="cmIdBack' + i + '" accept="image/*" class="form-control"></div>';
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── New Loan ───────────────────────────────────────────────
register('new-loan',function(_,area){
  var opts=borrowers.map(function(b){ return '<option value="'+b.id+'">'+b.name+'</option>'; }).join('');
  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">New Loan</h1><p class="page-subtitle">Create a new loan application.</p></div></div>'+
    '<div class="grid-split sidebar-right">'+
    '<div class="form-card" style="max-width:100%"><div class="form-section-title">Loan Details</div><div class="form-grid">'+
    '<div class="form-group"><label>Borrower *</label><select id="nlBor" class="form-control" onchange="updatePreview()"><option value="">— Select —</option>'+opts+'</select></div>'+
    '<div class="form-group"><label>Principal (PHP) *</label><input id="nlAmt" class="form-control" type="number" min="1" placeholder="50000" oninput="updatePreview(); updateComakerFields()"></div>'+
    '<div class="form-group"><label>Interest Rate (%) *</label><input id="nlRate" class="form-control" type="number" min="0" step="0.1" placeholder="20" oninput="updatePreview()"></div>'+
    '<div class="form-group"><label>Term (months) *</label><input id="nlTerm" class="form-control" type="number" min="1" placeholder="12" oninput="updatePreview()"></div>'+
    '<div class="form-group"><label>Interest Type</label><select id="nlType" class="form-control" onchange="updatePreview()"><option value="simple">Simple Interest</option><option value="compound">Reducing Balance</option></select></div>'+
    '<div class="form-group"><label>Start Date</label><input id="nlStart" class="form-control" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label>Purpose</label><select id="nlPurp" class="form-control"><option>Business Capital</option><option>Education</option><option>Medical</option><option>Home Improvement</option><option>Personal</option><option>Other</option></select></div>'+
    '<div class="form-group"><label>Status</label><select id="nlStat" class="form-control"><option value="active">Active</option><option value="pending">Pending</option></select></div>'+
    '<div class="form-group full-width"><label>Notes</label><textarea id="nlNotes" class="form-control" rows="2" placeholder="Collateral, conditions..."></textarea></div>'+
    '</div>'+
    '<div class="form-section-title" style="margin-top:20px">Borrower ID Attachments <span style="font-size:11px;color:var(--text-muted);font-weight:normal">(Optional)</span></div><div class="form-grid">'+
    '<div class="form-group"><label>ID Front</label><input type="file" id="nlIdFront" class="form-control" accept="image/*"></div>'+
    '<div class="form-group"><label>ID Back</label><input type="file" id="nlIdBack" class="form-control" accept="image/*"></div>'+
    '</div>'+
    '<div id="comakerSection" style="display:none"></div>'+
    '<hr class="form-divider"><div class="form-actions"><button class="btn btn-primary btn-lg" onclick="submitNewLoan()">Create Loan</button><button class="btn btn-secondary" onclick="location.hash=\'#loans\'">Cancel</button></div></div>'+
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
function processImagesCompressed(filesObj, callback) {
  var results = {};
  var keys = Object.keys(filesObj);
  var pending = keys.length;
  if (pending === 0) return callback(results);

  keys.forEach(function(key) {
    if (!filesObj[key]) {
      pending--;
      if (pending === 0) callback(results);
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var MAX_DIM = 800; // max width/height to keep local storage light
        var origW = img.width, origH = img.height;
        var w = origW, h = origH;
        var isPortrait = origH > origW;
        
        // If portrait, scale such that the new "landscape" will fit bounding box.
        if (isPortrait) {
          if (origH > MAX_DIM) { w = Math.round(origW * (MAX_DIM/origH)); h = MAX_DIM; }
        } else {
          if (origW > MAX_DIM) { h = Math.round(origH * (MAX_DIM/origW)); w = MAX_DIM; }
        }

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        if (isPortrait) {
          // Output image is landscape, swap target dimensions
          canvas.width = h; 
          canvas.height = w;
          ctx.translate(h / 2, w / 2);
          ctx.rotate(90 * Math.PI / 180);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
          // Keep landscape as is
          canvas.width = w; 
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
        }
        
        results[key] = canvas.toDataURL('image/jpeg', 0.6); // compress!
        pending--;
        if (pending === 0) callback(results);
      };
      img.onerror = function() { pending--; if (pending===0) callback(results); };
      img.src = e.target.result;
    };
    reader.onerror = function() { pending--; if (pending===0) callback(results); };
    reader.readAsDataURL(filesObj[key]);
  });
}

function submitNewLoan(){
  var bid=document.getElementById('nlBor').value, p=parseFloat(document.getElementById('nlAmt').value), r=parseFloat(document.getElementById('nlRate').value), t=parseInt(document.getElementById('nlTerm').value), tp=document.getElementById('nlType').value, sd=document.getElementById('nlStart').value;
  if(!bid){ toast('Select a borrower.','error'); return; }
  if(!p||p<=0){ toast('Enter a valid amount.','error'); return; }
  if(!r&&r!==0){ toast('Enter a valid rate.','error'); return; }
  if(!t||t<1){ toast('Enter a valid term.','error'); return; }

  // Validate co-makers
  var requiredCM = getRequiredComakers(p);
  var comakers = [];
  for (var ci = 1; ci <= requiredCM; ci++) {
    var cmName = (document.getElementById('cmName' + ci) || {}).value || '';
    if (!cmName.trim()) { toast('Co-Maker ' + ci + ' name is required.', 'error'); return; }
    comakers.push({
      id: ci, // reference for attachments
      name: cmName.trim(),
      phone: ((document.getElementById('cmPhone' + ci) || {}).value || '').trim(),
      address: ((document.getElementById('cmAddr' + ci) || {}).value || '').trim(),
      relationship: ((document.getElementById('cmRel' + ci) || {}).value || '').trim()
    });
  }

  var filesToProcess = {};
  var bF = document.getElementById('nlIdFront'); if(bF && bF.files[0]) filesToProcess['borF'] = bF.files[0];
  var bB = document.getElementById('nlIdBack'); if(bB && bB.files[0]) filesToProcess['borB'] = bB.files[0];
  
  for (var cj = 1; cj <= requiredCM; cj++) {
    var f = document.getElementById('cmIdFront'+cj); if(f && f.files[0]) filesToProcess['cmF'+cj] = f.files[0];
    var b = document.getElementById('cmIdBack'+cj); if(b && b.files[0]) filesToProcess['cmB'+cj] = b.files[0];
  }

  // Calculate schedule
  var c=calcLoan(p,r,t,tp);
  var due=new Date(sd); due.setMonth(due.getMonth()+t);
  
  // Show saving state (reading images can take a second)
  var btn = document.querySelector('button[onclick="submitNewLoan()"]');
  if(btn) { btn.disabled = true; btn.innerText = 'Creating...'; }

  processImagesCompressed(filesToProcess, function(compressedImages) {
    // Re-pack comakers with images
    for (var k = 0; k < comakers.length; k++) {
      var n = comakers[k].id;
      if (compressedImages['cmF'+n]) comakers[k].idFront = compressedImages['cmF'+n];
      if (compressedImages['cmB'+n]) comakers[k].idBack = compressedImages['cmB'+n];
    }
    
    var attachments = {};
    if(compressedImages['borF']) attachments.idFront = compressedImages['borF'];
    if(compressedImages['borB']) attachments.idBack = compressedImages['borB'];

    var loan={id:uid(),borrowerId:bid,principal:p,rate:r,term:t,type:tp,startDate:sd,dueDate:due.toISOString().split('T')[0],
      purpose:document.getElementById('nlPurp').value,notes:document.getElementById('nlNotes').value.trim(),
      status:document.getElementById('nlStat').value,totalInterest:c.totalInterest,monthlyPayment:c.monthlyPayment,
      totalAmount:c.totalAmount,schedule:c.schedule,comakers:comakers,attachments:attachments,createdAt:new Date().toISOString()};
    
    loans.push(loan);
    var bw=borrowers.find(function(x){ return x.id===bid; });
    logActivity('loan','Loan of '+fmt(p)+' created for '+(bw?bw.name:'borrower'));
    save(); toast('Loan created!'); 
    
    setTimeout(function(){ 
      if(settings.auto_send && bw && bw.email) { sendLoanEmail(loan.id); }
    }, 500);
    location.hash='#loan-detail/'+loan.id;
  });
}


// ── Loans List ─────────────────────────────────────────────
register('loans',function(_,area){
  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">Active Loans</h1><p class="page-subtitle">Active, pending and overdue loans. Completed loans are in Archive.</p></div>'+
    '<div class="page-actions"><button class="btn btn-secondary" onclick="location.hash=\'#archive\'">🗄 Archive</button><button class="btn btn-primary" onclick="location.hash=\'#new-loan\'">+ New Loan</button></div></div>'+
    '<div class="table-container"><div class="table-header"><span class="table-title">Loans</span><div style="display:flex;gap:10px;flex-wrap:wrap">'+
    '<select class="filter-select" id="lStF" onchange="renderLT()"><option value="">All Active</option><option value="active">Active</option><option value="pending">Pending</option><option value="overdue">Overdue</option></select>'+
    '<div class="search-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input id="lSrch" type="text" placeholder="Search..." oninput="renderLT()"></div></div></div>'+
    '<table><thead><tr><th>ID</th><th>Borrower</th><th>Principal</th><th>Monthly</th><th>Outstanding</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="lTbody"></tbody></table></div></div>';
  renderLT();
});
function renderLT(){
  var tb=document.getElementById('lTbody'); if(!tb) return;
  var sf=(document.getElementById('lStF')||{}).value||'';
  var q=((document.getElementById('lSrch')||{}).value||'').toLowerCase();
  var fl=loans.filter(function(l){
    var st=loanStatus(l);
    if(st==='paid'||st==='closed') return false; // archived
    var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
    return (!sf||st===sf)&&(!q||(b&&b.name.toLowerCase().includes(q)));
  }).sort(function(a,b){ return b.createdAt.localeCompare(a.createdAt); });
  if(!fl.length){ tb.innerHTML='<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No loans found</div></div></td></tr>'; return; }
  tb.innerHTML='';
  fl.forEach(function(l){
    var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
    var out=loanOutstanding(l), st=loanStatus(l);
    tb.innerHTML+='<tr>'+
      '<td data-label="ID" style="font-family:monospace;font-size:11px;color:var(--text-muted)">'+l.id.slice(-6).toUpperCase()+'</td>'+
      '<td class="td-primary" data-label="Borrower">'+(b?b.name:'—')+'</td>'+
      '<td class="td-amount" data-label="Principal">'+fmt(l.principal)+'</td>'+
      '<td data-label="Monthly">'+fmt(l.monthlyPayment)+'</td>'+
      '<td data-label="Outstanding" style="color:'+(out>0?'var(--danger)':'var(--success)')+';font-weight:700">'+fmt(out)+'</td>'+
      '<td data-label="Due Date">'+fmtDate(l.dueDate)+'</td>'+
      '<td data-label="Status">'+badgeHTML(st)+'</td>'+
      '<td data-label="Actions"><div class="td-actions">'+
        '<button class="icon-btn icon-btn-view" title="View" onclick="location.hash=\'#loan-detail/'+l.id+'\'">👁</button>'+
        '<button class="icon-btn icon-btn-edit" title="Edit" onclick="editLoan(\''+l.id+'\')">✎</button>'+
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

function editLoan(id){
  var l=loans.find(function(x){ return x.id===id; }); if(!l) return;
  var opts=borrowers.map(function(b){ return '<option value="'+b.id+'"'+(b.id===l.borrowerId?' selected':'')+'>'+b.name+'</option>'; }).join('');
  var purposes=['Business Capital','Education','Medical','Home Improvement','Personal','Other'];
  var purpOpts=purposes.map(function(p){ return '<option'+(l.purpose===p?' selected':'')+'>'+p+'</option>'; }).join('');
  openModal('Edit Loan',
    '<div class="form-grid">'+
    '<div class="form-group"><label>Borrower</label><select class="form-control" id="elBor">'+opts+'</select></div>'+
    '<div class="form-group"><label>Principal (PHP)</label><input class="form-control" id="elAmt" type="number" value="'+l.principal+'"></div>'+
    '<div class="form-group"><label>Interest Rate (%)</label><input class="form-control" id="elRate" type="number" step="0.1" value="'+l.rate+'"></div>'+
    '<div class="form-group"><label>Term (months)</label><input class="form-control" id="elTerm" type="number" value="'+l.term+'"></div>'+
    '<div class="form-group"><label>Interest Type</label><select class="form-control" id="elType"><option value="simple"'+(l.type==='simple'?' selected':'')+'>Simple Interest</option><option value="compound"'+(l.type==='compound'?' selected':'')+'>Reducing Balance</option></select></div>'+
    '<div class="form-group"><label>Start Date</label><input class="form-control" id="elStart" type="date" value="'+l.startDate+'"></div>'+
    '<div class="form-group"><label>Purpose</label><select class="form-control" id="elPurp">'+purpOpts+'</select></div>'+
    '<div class="form-group"><label>Status</label><select class="form-control" id="elStat"><option value="active"'+(l.status==='active'?' selected':'')+'>Active</option><option value="pending"'+(l.status==='pending'?' selected':'')+'>Pending</option><option value="closed"'+(l.status==='closed'?' selected':'')+'>Closed</option></select></div>'+
    '<div class="form-group full-width"><label>Notes</label><textarea class="form-control" id="elNotes" rows="2">'+(l.notes||'')+'</textarea></div>'+
    '</div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEditLoan(\''+id+'\')">Save Changes</button>'
  );
}
function saveEditLoan(id){
  var l=loans.find(function(x){ return x.id===id; }); if(!l) return;
  var p=parseFloat(document.getElementById('elAmt').value);
  var r=parseFloat(document.getElementById('elRate').value);
  var t=parseInt(document.getElementById('elTerm').value);
  if(!p||p<=0){ toast('Enter a valid amount.','error'); return; }
  if(isNaN(r)){ toast('Enter a valid rate.','error'); return; }
  if(!t||t<1){ toast('Enter a valid term.','error'); return; }
  var tp=document.getElementById('elType').value;
  var sd=document.getElementById('elStart').value;
  var c=calcLoan(p,r,t,tp);
  var due=new Date(sd); due.setMonth(due.getMonth()+t);
  l.borrowerId=document.getElementById('elBor').value;
  l.principal=p; l.rate=r; l.term=t; l.type=tp; l.startDate=sd;
  l.dueDate=due.toISOString().split('T')[0];
  l.purpose=document.getElementById('elPurp').value;
  l.status=document.getElementById('elStat').value;
  l.notes=document.getElementById('elNotes').value.trim();
  l.totalInterest=c.totalInterest; l.monthlyPayment=c.monthlyPayment;
  l.totalAmount=c.totalAmount; l.schedule=c.schedule;
  save(); closeModal(); toast('Loan updated!');
  navigate(location.hash);
}

// ── Loan Detail ────────────────────────────────────────────
register('loan-detail',function(page,area){
  var id=page.split('/')[1];
  var loan=loans.find(function(x){ return x.id===id; });
  if(!loan){ area.innerHTML='<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Loan not found</div><button class="btn btn-secondary" onclick="location.hash=\'#loans\'">Back</button></div>'; return; }
  var b=borrowers.find(function(x){ return x.id===loan.borrowerId; });
  var out=loanOutstanding(loan), paid=loanPaid(loan), pct=Math.min(100,(paid/loan.totalAmount)*100), st=loanStatus(loan);
  var lPay=payments.filter(function(p){ return p.loanId===id; }).sort(function(a,b){ return b.date.localeCompare(a.date); });

  var srows=''; (loan.schedule||[]).forEach(function(r){ srows+='<tr><td data-label="#">'+r.period+'</td><td data-label="Payment">'+fmt(r.payment)+'</td><td data-label="Principal">'+fmt(r.principal)+'</td><td data-label="Interest">'+fmt(r.interest)+'</td><td data-label="Balance" style="color:var(--primary)">'+fmt(r.balance)+'</td></tr>'; });
  var prows=''; if(!lPay.length){ prows='<tr><td colspan="4"><div class="empty-state" style="padding:30px"><div class="empty-icon">💳</div><div class="empty-title">No payments yet</div></div></td></tr>'; }
  else { lPay.forEach(function(p){ prows+='<tr><td data-label="Date">'+fmtDate(p.date)+'</td><td class="td-amount" data-label="Amount">'+fmt(p.amount)+'</td><td data-label="Note" style="color:var(--text-muted);font-size:12px">'+(p.note||'—')+'</td><td data-label="Actions"><div class="td-actions"><button class="icon-btn icon-btn-receipt" title="Download Receipt" onclick="downloadReceipt(\''+p.id+'\')">🧾</button><button class="icon-btn icon-btn-delete" onclick="delPayment(\''+p.id+'\',\''+loan.id+'\')">✕</button></div></td></tr>'; }); }

  // Co-maker detail rows
  var cmHTML = '';
  if (loan.comakers && loan.comakers.length > 0) {
    cmHTML = '<div class="card"><div class="form-section-title">Co-Maker(s)</div>';
    loan.comakers.forEach(function(cm, idx) {
      cmHTML += '<div class="detail-row"><span class="detail-key">Co-Maker ' + (idx+1) + '</span><span class="detail-val">' + cm.name + '</span></div>';
      if (cm.phone) cmHTML += '<div class="detail-row"><span class="detail-key" style="padding-left:12px">Phone</span><span class="detail-val" style="font-size:12px">' + cm.phone + '</span></div>';
      if (cm.address) cmHTML += '<div class="detail-row"><span class="detail-key" style="padding-left:12px">Address</span><span class="detail-val" style="font-size:12px">' + cm.address + '</span></div>';
      if (cm.relationship) cmHTML += '<div class="detail-row"><span class="detail-key" style="padding-left:12px">Relationship</span><span class="detail-val" style="font-size:12px">' + cm.relationship + '</span></div>';
    });
    cmHTML += '</div>';
  }

  area.innerHTML='<div class="page">'+
    '<div class="page-header"><div class="page-header-info"><h1 class="page-title">Loan Detail</h1><p class="page-subtitle">'+(b?b.name:'?')+' · #'+loan.id.slice(-6).toUpperCase()+'</p></div>'+
    '<div class="page-actions"><button class="btn btn-secondary" onclick="location.hash=\'#loans\'">← Back</button>'+
    '<button class="btn btn-secondary" onclick="editLoan(\''+loan.id+'\')">✎ Edit Loan</button>'+
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
      cmHTML +
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

function closeLoan(id){
  var l=loans.find(function(x){ return x.id===id; }); if(!l) return;
  var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
  openModal('Close Loan',
    '<p style="color:var(--text-secondary)">Are you sure you want to close the loan for <strong>'+(b?b.name:'borrower')+'</strong>? This will mark it as completed and prevent further payments.</p>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="confirmCloseLoan(\''+id+'\')">Close Loan</button>'
  );
}
function confirmCloseLoan(id){
  var l=loans.find(function(x){ return x.id===id; }); if(!l) return;
  l.status='closed';
  save(); closeModal();
  toast('Loan closed.','info');
  navigate('#loan-detail/'+id);
}
function delPayment(pid,lid){ payments=payments.filter(function(x){ return x.id!==pid; }); save(); toast('Payment removed.','info'); navigate('#loan-detail/'+lid); }
function downloadReceipt(pid){ generateImageReceipt(pid); }

// ── Payments ───────────────────────────────────────────────
register('payments',function(_,area){
  var al=loans.filter(function(l){ var s=loanStatus(l); return s==='active'||s==='overdue'||s==='pending'; });
  var opts=al.map(function(l){ var b=borrowers.find(function(x){ return x.id===l.borrowerId; }); return '<option value="'+l.id+'">'+(b?b.name:'?')+' — '+fmt(l.principal)+' ('+l.id.slice(-6).toUpperCase()+')</option>'; }).join('');
  var rp=[].concat(payments).sort(function(a,b){ return b.date.localeCompare(a.date); }).slice(0,15);
  var rrows='';
  if(!rp.length){ rrows='<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">💳</div><div class="empty-title">No payments yet</div></div></td></tr>'; }
  else { rp.forEach(function(p){ var l=loans.find(function(x){ return x.id===p.loanId; }); var b=l?borrowers.find(function(x){ return x.id===l.borrowerId; }):null; rrows+='<tr><td data-label="Date">'+fmtDate(p.date)+'</td><td class="td-primary" data-label="Borrower">'+(b?b.name:'—')+'</td><td data-label="Loan ID" style="font-family:monospace;font-size:11px;color:var(--text-muted)">'+(l?l.id.slice(-6).toUpperCase():'—')+'</td><td class="td-amount" data-label="Amount">'+fmt(p.amount)+'</td><td data-label="Note" style="color:var(--text-muted);font-size:12px">'+(p.note||'—')+'</td><td data-label="Action"><button class="icon-btn icon-btn-receipt" title="Download Receipt" onclick="downloadReceipt(\''+p.id+'\')">🧾</button></td></tr>'; }); }

  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">Record Payment</h1><p class="page-subtitle">Log a repayment against an active loan.</p></div></div>'+
    '<div class="grid-split equal">'+
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
  closeModal();
  navigate(location.hash||'#dashboard');
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

// ── Archive ────────────────────────────────────────────────────
register('archive',function(_,area){
  area.innerHTML='<div class="page"><div class="page-header"><div class="page-header-info"><h1 class="page-title">Archive</h1><p class="page-subtitle">Completed and closed loans.</p></div>'+
    '<div class="page-actions"><button class="btn btn-secondary" onclick="location.hash=\'#loans\'">← Active Loans</button></div></div>'+
    '<div class="table-container"><div class="table-header"><span class="table-title">Archived Loans</span>'+
    '<div class="search-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input id="archSrch" type="text" placeholder="Search..." oninput="renderArchive()"></div></div>'+
    '<table><thead><tr><th>ID</th><th>Borrower</th><th>Principal</th><th>Total Paid</th><th>Status</th><th>Closed Date</th><th>Actions</th></tr></thead><tbody id="archTbody"></tbody></table></div></div>';
  renderArchive();
});
function renderArchive(){
  var tb=document.getElementById('archTbody'); if(!tb) return;
  var q=((document.getElementById('archSrch')||{}).value||'').toLowerCase();
  var fl=loans.filter(function(l){
    var st=loanStatus(l);
    if(st!=='paid'&&st!=='closed') return false;
    var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
    return !q||(b&&b.name.toLowerCase().includes(q));
  }).sort(function(a,b){ return b.createdAt.localeCompare(a.createdAt); });
  if(!fl.length){
    tb.innerHTML='<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🗄</div><div class="empty-title">No archived loans</div><div class="empty-sub">Paid and closed loans will appear here.</div></div></td></tr>';
    return;
  }
  tb.innerHTML='';
  fl.forEach(function(l){
    var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
    var paid=loanPaid(l), st=loanStatus(l);
    var closedDate=payments.filter(function(p){ return p.loanId===l.id; }).sort(function(a,b){ return b.createdAt.localeCompare(a.createdAt); })[0];
    tb.innerHTML+='<tr>'+
      '<td data-label="ID" style="font-family:monospace;font-size:11px;color:var(--text-muted)">'+l.id.slice(-6).toUpperCase()+'</td>'+
      '<td class="td-primary" data-label="Borrower">'+(b?b.name:'—')+'</td>'+
      '<td class="td-amount" data-label="Principal">'+fmt(l.principal)+'</td>'+
      '<td data-label="Total Paid" style="color:var(--success);font-weight:700">'+fmt(paid)+'</td>'+
      '<td data-label="Status">'+badgeHTML(st)+'</td>'+
      '<td data-label="Closed Date">'+(closedDate?fmtDate(closedDate.date):fmtDate(l.dueDate))+'</td>'+
      '<td data-label="Actions"><div class="td-actions">'+
        '<button class="icon-btn icon-btn-view" title="View" onclick="location.hash=\'#loan-detail/'+l.id+'\'">👁</button>'+
        '<button class="icon-btn icon-btn-delete" title="Delete" onclick="delLoan(\''+l.id+'\')">✕</button>'+
      '</div></td></tr>';
  });
}

// ── Due Payments / Notifications ──────────────────────────────
register('notifications', function(_, area) {
  var todayDate=new Date(today());
  var dueLoans=getDueLoans();

  var rows='';
  if(!dueLoans.length){
    rows='<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">All clear — no due payments</div><div class="empty-sub">Loans that are overdue, due today, or due within 7 days will appear here.</div></div>';
  } else {
    dueLoans.forEach(function(l){
      var b=borrowers.find(function(x){ return x.id===l.borrowerId; });
      var out=loanOutstanding(l);
      var dd=new Date(l.dueDate);
      var diffDays=Math.ceil((dd-todayDate)/(1000*60*60*24));
      var label, color;
      if(diffDays<0){ label='Overdue by '+Math.abs(diffDays)+' day'+(Math.abs(diffDays)!==1?'s':''); color='var(--danger)'; }
      else { label='Unpaid this month'; color='var(--warning)'; }
      rows+='<tr>'+
        '<td class="td-primary" data-label="Borrower">'+(b?b.name:'—')+'</td>'+
        '<td data-label="Due Date">'+fmtDate(l.dueDate)+'</td>'+
        '<td data-label="Urgency"><span style="color:'+color+';font-weight:700;font-size:12px">'+label+'</span></td>'+
        '<td class="td-amount" data-label="Outstanding" style="color:var(--danger)">'+fmt(out)+'</td>'+
        '<td data-label="Monthly Payment">'+fmt(l.monthlyPayment)+'</td>'+
        '<td data-label="Actions"><div class="td-actions">'+
          '<button class="icon-btn icon-btn-view" title="View Loan" onclick="location.hash=\'#loan-detail/'+l.id+'\'">👁</button>'+
          '<button class="icon-btn icon-btn-pay" title="Record Payment" onclick="openPayModal(\''+l.id+'\')">$</button>'+
        '</div></td></tr>';
    });
  }

  var overdueCount=dueLoans.filter(function(l){ return new Date(l.dueDate)<todayDate; }).length;
  var activeCount=dueLoans.length-overdueCount;
  var totalOut=dueLoans.reduce(function(s,l){ return s+loanOutstanding(l); },0);

  area.innerHTML='<div class="page">'+
    '<div class="page-header"><div class="page-header-info"><h1 class="page-title">Due Payments</h1>'+
    '<p class="page-subtitle">Active loans with no payment recorded this month.</p></div>'+
    '<div class="page-actions"><button class="btn btn-secondary" onclick="navigate(\'#notifications\')">↻ Refresh</button></div></div>'+
    '<div class="kpi-grid" style="margin-bottom:24px">'+
      '<div class="kpi-card rose"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="kpi-info"><span class="kpi-label">Overdue Loans</span><span class="kpi-value">'+overdueCount+'</span><span class="kpi-sub">Final due date passed</span></div></div>'+
      '<div class="kpi-card amber"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="kpi-info"><span class="kpi-label">Unpaid This Month</span><span class="kpi-value">'+activeCount+'</span><span class="kpi-sub">No payment yet</span></div></div>'+
      '<div class="kpi-card teal"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="kpi-info"><span class="kpi-label">Total Outstanding</span><span class="kpi-value" style="font-size:18px">'+fmt(totalOut)+'</span><span class="kpi-sub">Across all due loans</span></div></div>'+
    '</div>'+
    '<div class="table-container">'+
    '<div class="table-header"><span class="table-title">Due Loans ('+dueLoans.length+')</span></div>'+
    (dueLoans.length?'<table><thead><tr><th>Borrower</th><th>Due Date</th><th>Status</th><th>Outstanding</th><th>Monthly Payment</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table>':rows)+
    '</div></div>';
});

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
    '</div><hr class="form-divider"><div class="form-actions"><button class="btn btn-primary" onclick="saveSettings()">Save Settings</button></div></div>' +
    '<div class="form-card" style="margin-top:24px"><div class="form-section-title">Data Backup &amp; Restore</div>' +
    '<p style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">Export all your data to a JSON file and import it on any browser to restore your loans, borrowers, payments, and settings.</p>' +
    '<div class="form-actions" style="gap:12px;flex-wrap:wrap;">' +
    '<button class="btn btn-primary" onclick="exportData()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:middle"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export Data</button>' +
    '<label class="btn btn-secondary" style="cursor:pointer;display:inline-flex;align-items:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Import Data<input type="file" accept=".json" style="display:none" onchange="importData(event)"></label>' +
    '</div></div></div>';
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

function exportData() {
  var data = {
    version: 1,
    exported: new Date().toISOString(),
    lp_loans: loans,
    lp_borrowers: borrowers,
    lp_payments: payments,
    lp_activity: activity,
    lp_settings: settings
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'loanpro-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Data exported successfully!', 'success');
}

function importData(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.lp_loans || !data.lp_borrowers || !data.lp_payments) {
        toast('Invalid backup file.', 'error');
        return;
      }
      if (!confirm('This will overwrite all current data with the imported data. Continue?')) {
        event.target.value = '';
        return;
      }
      loans     = data.lp_loans     || [];
      borrowers = data.lp_borrowers || [];
      payments  = data.lp_payments  || [];
      activity  = data.lp_activity  || [];
      if (data.lp_settings && typeof data.lp_settings === 'object') {
        Object.assign(settings, data.lp_settings);
        settings.emailjs_service  = 'default_service';
        settings.emailjs_template = 'template_53kpkj7';
      }
      save();
      toast('Data imported successfully! Reloading…', 'success');
      setTimeout(function() { location.reload(); }, 1500);
    } catch(err) {
      toast('Failed to read file. Make sure it is a valid JSON backup.', 'error');
    }
  };
  reader.readAsText(file);
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
    date: fmtDate(today()),
    reference_no: loan.id.slice(-6).toUpperCase(),
    name: b.name,
    phone: b.phone || '—',
    email: b.email,
    address: b.address || '—',
    loan_amount: fmt(loan.principal),
    interest_rate: loan.rate + '% (' + loan.type + ')',
    loan_term: loan.term + ' Months',
    monthly_payment: fmt(loan.monthlyPayment),
    total_payment: fmt(loan.totalAmount),
    start_date: fmtDate(loan.startDate),
    due_date: fmtDate(loan.dueDate),
    purpose: loan.purpose || '—',
    title: 'Loan Agreement #' + loan.id.slice(-6).toUpperCase(),
    content: pdfBase64 
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


// PDF PAGE BACKGROUND - Professional watermark base64 JPEG (A4 portrait)
var PDF_PAGE_BG_B64 = "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UUUAJRRRTEFFFFABRRRQAUUUUAFFFFABRRRQAUUUUDCg0dqQ0gCiiigQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFGaAEooooAKKKKBBRRRQAUUUUAFFFFAgooooAKKKKACiiigYVXv7Y3mn3NsrBWljZAT2yMVYooE1dWZk+HNJk0TRo7KWVZHVmYso45Na1FFPfUmEVCKiugUhHJ5ooPU0FE9FFFSbBRRRQAGkoooAKKKKACiiigAooooAKKKKACiiigQUUUUAFJRRQAUUUUwCiiigQUUUUAFFFFABRRRQAUUUUgCiiigBKKKKAEpaSlpiCiiigAooooAKKKSgAooopiCiiigAooooAKKKKACiiigAooooAKKKDQAhooopAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAGkoooAKKKKACiiigQUlFLQAUUlLQIKKKKACiiigAooooAKKKKBhRRRQIKKKSgAoPU0UE8mgZPRRRSNQpKWkoAKKKKACiiigApaSigAooooAKKKKACiiigQUUUmaACiiimAUUUUCCiiigAooooAKKKKACiiigAooo70gCkozRQAUUUUxBRRRQAUUUUAFFFFABSUUUxBRRRQAUUUUAFFFFABRRS0AJRRRQAUUUtACGkoNFIAooooAKKKKACiiigAooooEFFFFAwooooAKKKKACiiigApKKKBBRRRQMKKKKCQooooGFFFFAgooooAKKKKACiiigAooooAKKKKACkpaSgAooooGFB6mig9TQBPRRSUjUKKKKACiiigAooooAKKKKACiiigAooooEFFFGaAEooooAKKKKYBRRRQIKKKKACiiigAooooAKKKKQBRRSUAFFFFMQUUUUAFFFFABRRRQAUlFFMQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUlIAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACg0UlABRRRQAUUUUCCiiigAooooAKKKKBBRRRQAUUUUAFFFFABRRRQAUUUlABRRRQAUUUlACmkPU0Up6mgZPSUUUjUKKKKACiiigAooooAKKKKACiiigQUUUUAFJQaKYBRSUtABRRRQIKKKKACiiigAooooAKKKKACiiikAlFFFACUdqKXtTEFFFFABRRRQAUUUlABRRRTEFFFFABRRRQMKKKKBBRRRQAUUUUDCiiigQlFFFIAooooAKKKKACiiigAooooAKKKKACiiigAooooAKMUUGgBKKKKACiiigQUUUUAFFFFABRRRQAUUUUCCiiigAopKWgAooooGFFFBoASiiigAooooEFJRRTAKCeTRQeppMZPRRRSNQooooAKKKKACiiigAooooEFFFFABRRSUAFJS0UwCiiigAooooEFFFFABRRRQAUUUUAFFFFIApKWkoAKSlopiEpaKKACiiigAoopKACiiimIKKKKACiiigYUUUUAFFFFAgooooAKKKM0DA0lFFIQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABSZoNFABRRRQIKKKKACiiigAooooAKKKKBBRRRQAUUUUAFFFFABRRRQMKKKSgQUUUlAC0lFFMAooooGFB6mig9TQBPRRRUmoUUUUAFFFFAgooooGFFFFAgoopKADNFFFMAooooAKKKKBBRRRQAUUUUAFFFFABRRRSAKKKSgAooopiCiiigAooooAKKKKACkoopiCiiigAooooAKKKKACiiigAooooAKKKKACg0UlIAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACig0lAgooooGFFFFAgooooAKKKKACiiigQUUUUAFFFFABRRRQAUUUUAFGaKSgAooooASiiimAUUUUAFFFFABQepooPU0DJ6KKKk1Ck70tFACUtFFAgooooAKKKKACkoooAKKKKYBRRRQIKKKKACiiigAooooAKKKKQBRRSUAFFFFMQUUUUAFFFFABRRRQAUUUUAJRRRTEFFFFABRRRQAUUUUAFFFFABRRRQAUUUUgEooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiikoEFFFFAwooooEFFFFAgooooGFFFFAgooooAKKKKACiiigAooooAKKKKAEooooAKKKKAEpaSimAUUUUAFFFFABQepopD1NIZYooopGoUUUUAFFFFAgooooAKQ0UUAFFFFMAooooAKKKKBBRRRQAUUUUAFFFFIAoopDQAtJRRTEFFFFABRRRQAUUUUAFFFFABSUUUxBRRRQAUUUUAFFFFABRRRQAUUUUAFLSUZoADSUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKSlNJQIKKKKACiiigQUUUUDCiiigQUUUUAFFFFABRRRQAUUUUAFFFFABSUUUAFFFFABRRRQAlFFFMAooooAKKKKACg9TRSnqeaQE3+FFFFI2CiiigQUUUUAFFFIaACiiimAUUUUAFFFFAgooooAKKKKACiiikAUUUUAJRRRTEFFFFABRRRQAUUUUAFFFFABSUUUxBRRRQAUUUUDCiiigAooooEFFFFABRRRQMKKKSkAUUUUCCiiigAooooAKKKKACiiigAooooAKKKKACiiigApKWkoAKKKKACiiigQUUUUAFFFFAhKWiigAooooAKKKKACikpaACiiigYUUGkoEFFFFACUtFFABRRRQAUUUlMAooooAKWiikAUh6mlpD1NAE9FFFI2CiiigQUUUlABRRRTAKKKKACiiigAooooEFFFFABRRRQAUUUUgCkoopiCiiigAooooAKKKKACiiigAoopKACiiimIKKKKACiiigYUUUUCCiiigAooooGFBNFJSEFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFJRRQIKKKKACiiigAooooAKKKKBBRRRQAUUUUAJS0UUAFFFFABRRSUDCiiigQUUUUAFFJRQAtFFFABSUtFACUtFFABRRRQAUh6mlpDnJoAno7UUUjUKKKKACkoooAKKKKYBRRRQAUUUUCCiiigAooooAKKKKQBSUtJTAKKKKBBRRRQAUUUUAFFFFABRRRQAUlFFMQUUUUAFFFFABRRRQAUUUUAFFFFABRS0lACUUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKSiigQUUUUAFFFFAgooooGFJS0UCCiiigAooooAKKKKACiiigAooooAKSiigAooooAKKKKAEpaSlpgFFFFIAooooAKKKKACiiigApD1NLSHqaAJ6KKKRsFFFITQIKKKKYBRRRQAUUUUCCiiigAooooAKKKKQBRRSUAFFFFMQUUUUAFFFFABRRRQAUUUUAFFFJQIWkoopgFFFFABRRRQAtFJRQAUUUUAFFFFABRRSUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKSgQUUUUAFFFFAgooooGFFFFAgooooAKKKKACiiigAooooAKKMUUAHakpaSgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKSiimIKD1NFB6mgZPS0UhqTUQ0UUUAFFFFMAooooEFFFFABRRRQAUUUUAHaiig0gEooopiCiiigAooooAKKKKACiiigAooooASiiimIKKKKACiiigAooooAKKKKACiiigAooopAJRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFACUUUUCCiiigAooooEFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFJQAUUUUAFFFFABRRRQAUUUUAJS0UUAFFFFABRRRQIKSiimAUUUUAFB6mikPU0DRYpDSmkqTUKKKKYBRRRQIKKKKACiiigAooooAKWkopAFJRRTAKKKKBBRRRQAUUUUAFFFFABRRRQAUlLSUCCiiimAUUUUDCiiigQUUUUAFFFFABRRRQMKSiikIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApKWkoEFFFFABRRRQAUUUUAFFFFAgooooAKKKKACiiigAooooAKKKSgAooooASloooAKKKKACiiigAooooAKKKKACiiigQUlLSU0AUUUUAFFFFABQTyaKQ9TQBYNJQaKk2CiiimAUUUUCCiiigAooooAKKKKACiikNIAooopiCiiigAooooAKKKKACiiigAooooASiiimIKKKKBhRRRQIKKKKACiiigAooooGFJS0UgEooooEFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAlFFFAgooooAKKKKACiiigBKWiigQUUUUAFFFFABRRRQMKKKKACkoooEFFFFABRRRQAUUUUAFJS0UAFFFFABRRRQAUlLSUCCiiimAUUUUAFFFFABSHqaWkPU0AT0UUVJsFFFFMQUUUUAFFFFABRRRQAUd6KKQBSUUUwCiiigQUUUUAFFFFAB7UUUUAFFFFABSUtJTEFFFFABRRRQMKKKKBBRRRQAUUUUAFFFFIApKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKSiigQUUUUAFFFFAgooooGFFFFAgooooAKKKKACiiigAooooAKKKSgAooooAKKKKACiiigAooxRQAUUUUAFFFFABRRRQIKSl70lMAooooAKKKKACiiigAoPU0Uh6mgCeiiikbBRRRQIKKKKACiiigAooopAFFFJQAUUUUxBRRRQAUUUUAFFFFABRRRQAUUUUCCkopaYCUUUUAFFFFABRRRQAUUUUAFFFFABSUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKDRRQISiiigQUUUUDCiiigAooooEFFFFABRRRQAUUUUAFFFFABRRRQAlFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAgo70UUAFFFFAgo70UlMApe1JRQMO1FLRQISkPU0uKCOaQE1FFFBsFFFFABRRRQAUUUUAFFFJSAKKKKYgooooAKKKKACiiigAooooAKKKSgQtJRRTAKWkopDCiiimIKKKKACiiigAooooAKKDSUgCiiigAooooAKKKKACiiigAooooAKKKKACqEup7ZSqJuUHBOetXzyDjriudYFSQeoPNJmc21sdBG4kjV16MM06qun5Fmme+SKtUy07oKKKKBhRRSUCCiiigQUUUUDCiiigQUUUUAFFFFABRRRQAUUUUAFFFFABSUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUCCiikoAXtRSUUxC0UUUgCkpaSmAUUUooGFFFFIQUhPJpaQ9TQBNRRRQbBRRRQAUUUUAFFFFIApKKKYBRRRQIKKKKACiiigAooooAKKKKAEooopiCiiigAooooGFFFFAgooooAKKKKADFFFFIBKKKKACiiigAooooAKKKKACiiigCCe7ityA5OT2AqZGDoGU5BGQax9RBF4xPQgYrQ0//jzTJ7mghSvKxZooooLEdxGhdjgAZNc/NL50jORjcc4rS1OX5RCO/LVlY5pMxqPWxt2E3nWy/wB5eCKs1jWM/kTjJ+VuDWzTRpB3QUUUdqBlb7bAJ/K3fNnGe2as1z20tJtHLFsDFdB0HNBEZXCiiigsKKKKACiiigQUUUUAFFFFABRRRQMKKKKBBSUuaQ0AFFJS0AFFFFABRRRQAUUUUAJS0UUAFFFFABRRSUxC0lFLQAlFFFAC96KKKBBRSUUALRRRSAKKKTtQAUHqaKQ9TxQMnoopaDUSiiigAooopAFJmlpKACiiimIKKKKACiiigAooooAKKKSgAooopiCiiigAooooAKKKKACiiigAooooGFFFHSgQUnelpKQwooooEFFFFABRRRQAUUUUAFFFFAEc0SyxsGUE4OM9qxbe6kt3yvKnqtb1c/KmyeRfRjSZlU01Ruwy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";

function createPDFObject(loanId) {
  if (!window.jspdf) { toast('PDF library loading...', 'warning'); return null; }
  var doc = new jspdf.jsPDF({ compress: true });
  var loan = loans.find(function(x) { return x.id === loanId; });
  if (!loan) return null;
  var b = borrowers.find(function(x) { return x.id === loan.borrowerId; });
  if (!b) return null;

  var out = loanOutstanding(loan);
  var paid = loanPaid(loan);
  var M = { left: 12, right: 12 };
  var pageW = 210;
  var pageH = 297; // A4 height
  var contentW = pageW - M.left - M.right;

  // Draw page background first (page 1)
  try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}

  // ═══════════════════════════════════════════════════════
  // HEADER — Professional slate banner with teal accent line
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(15, 23, 42); // slate grey background
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(20, 184, 166); // teal accent line
  doc.rect(0, 22, pageW, 1.5, 'F');
  
  // Left-aligned brand and title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('LoanPro', M.left, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('Official Loan Agreement & Financial Statement', M.left, 16);

  // Right-aligned branding details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(45, 212, 191); // bright teal
  doc.text('SECURE CONTRACT', pageW - M.right, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text('E-SIGNED & BINDING', pageW - M.right, 16, { align: 'right' });

  // Reference line
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Date Generated: ' + fmtDate(new Date().toISOString()), M.left, 28);
  doc.text('Reference No: ' + loan.id.slice(-8).toUpperCase(), pageW - M.right, 28, { align: 'right' });

  // Thin divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(M.left, 31, pageW - M.right, 31);

  // ═══════════════════════════════════════════════════════
  // TABLE STYLES & UNIFIED DATA TABLE
  // ═══════════════════════════════════════════════════════
  var sectionHead = { fontSize: 10, fontStyle: 'bold', textColor: [255, 255, 255], fillColor: [51, 65, 85], cellPadding: 3.5 };
  var bodyStyle = { fontSize: 9.5, cellPadding: 3 };

  var tableBody = [
    // Section Header row
    [{ content: 'BORROWER INFORMATION', colSpan: 4, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' } }],
    ['Full Name:', b.name, 'Phone:', b.phone || 'N/A'],
    ['Email:', b.email || 'N/A', 'Address:', b.address || 'N/A'],
    ['Gov ID:', b.govId || 'N/A', '', ''],
    
    // Section Header row
    [{ content: 'LOAN CONTRACT DETAILS', colSpan: 4, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' } }],
    ['Principal:', fmt(loan.principal), 'Interest Rate:', loan.rate + '% (' + loan.type.toUpperCase() + ')'],
    ['Loan Term:', loan.term + ' Months', 'Monthly Payment:', fmt(loan.monthlyPayment)],
    ['Total Repayable:', fmt(loan.totalAmount), 'Start Date:', fmtDate(loan.startDate)],
    ['Maturity Date:', fmtDate(loan.dueDate), 'Purpose:', loan.purpose || 'General Purpose']
  ];

  doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
    startY: 34,
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 3.5, textColor: [30, 41, 59], valign: 'middle' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 38 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 38 },
      3: { cellWidth: 55 }
    },
    margin: M
  });
  var rightEndY = doc.lastAutoTable.finalY;


  var curY = rightEndY + 4;

  // ═══════════════════════════════════════════════════════
  // CO-MAKER SECTION
  // ═══════════════════════════════════════════════════════
  if (loan.comakers && loan.comakers.length > 0) {
    var cmBody = [];
    loan.comakers.forEach(function(cm, i) {
      cmBody.push([
        'Co-Maker ' + (i + 1),
        cm.name + (cm.relationship ? ' (' + cm.relationship + ')' : ''),
        cm.phone || 'N/A',
        cm.address || 'N/A'
      ]);
    });
    doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
      startY: curY,
      head: [[{ content: 'CO-MAKERS', colSpan: 4, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' } }]],
      body: cmBody,
      theme: 'grid',
      headStyles: sectionHead,
      bodyStyles: bodyStyle,
      styles: { fontSize: 9.5, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28, textColor: [71, 85, 105] }, 1: { cellWidth: 55 }, 2: { cellWidth: 35 }, 3: { cellWidth: 68 } },
      margin: M
    });
    curY = doc.lastAutoTable.finalY + 4;
  }

  // ═══════════════════════════════════════════════════════
  // LOAN AGREEMENT
  // ═══════════════════════════════════════════════════════
  doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
  
  // Centered Bold Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('LOAN AGREEMENT', 105, 22, { align: 'center' });
  
  curY = 32;

  var lenderName = 'Loan System Inc.';
  var sourceText = isBankCreditLoan(loan)
    ? ' This loan is recorded as a ' + loanSourceLabel(loan) + ', funded through the Lender\'s bank credit facility and not from the Lender\'s personal cash funds.'
    : '';

  var agreementRows = [
    [{ content: 'This Loan Agreement (the "Agreement") is entered into on ' + fmtLongDate(loan.startDate) + ',', styles: { cellPadding: { bottom: 4 } } }],
    [{ content: 'by and between:', styles: { cellPadding: { bottom: 4 } } }],
    [{ content: 'Borrower: ' + b.name + ', residing at ' + (b.address || 'N/A'), styles: { cellPadding: { bottom: 4 } } }],
    [{ content: 'AND', styles: { fontStyle: 'bold', halign: 'center', cellPadding: { bottom: 4 } } }],
    [{ content: 'Lender: ' + lenderName, styles: { cellPadding: { bottom: 8 } } }],
    [{ content: 'TERMS AND CONDITIONS', styles: { fontStyle: 'bold', halign: 'center', cellPadding: { bottom: 6 } } }]
  ];

  var terms = [
    '1. Loan Amount. The Lender agrees to provide the Borrower with a loan in the principal amount of ' + fmtNoSymbol(loan.principal) + '. PESOS' + sourceText,
    '2. Term. The loan shall be payable over a period of ' + loan.term + ' months, commencing on ' + fmtLongDate(loan.startDate) + ' and maturing on ' + fmtLongDate(loan.dueDate) + '.',
    '3. Interest. The Borrower agrees to pay interest on the loan at the rate of ' + numberToWords(loan.rate) + ' percent (' + loan.rate + '%) of the monthly principal due.',
    '4. Repayment. Payments shall be made on or before each due date as set forth in the Amortization Schedule attached to this Agreement.',
    '5. Late Payment. Any late payments may incur additional penalties, fees, or interest as determined by the Lender.'
  ];
  if (loan.source === 'credit') {
    terms.push('6. Collateral (Purchased Items). Any item (including but not limited to mobile phones, gadgets, or devices) purchased using this credit card facility shall serve as collateral. If the loan remains unpaid for two (2) months, the purchased item will be retrieved or collected by the Lender, and shall only be returned once the outstanding loan or payment has been fully settled and paid.');
  }
  var nextNum = terms.length + 1;
  terms.push(nextNum + '. Joint Liability. If a Co-Maker is listed in this Agreement, both Borrower and Co-Maker shall be jointly and severally liable for repayment.');
  nextNum++;
  terms.push(nextNum + '. Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the Republic of the Philippines.');

  terms.forEach(function(term, idx) {
    var isLast = idx === terms.length - 1;
    agreementRows.push([{
      content: term,
      styles: { cellPadding: { bottom: isLast ? 6 : 3 } }
    }]);
  });

  agreementRows.push([{ content: 'IN WITNESS WHEREOF, the parties hereto have executed this Loan Agreement on the day and year first above written.', styles: { cellPadding: { bottom: 4 } } }]);

  doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
    startY: curY,
    body: agreementRows,
    theme: 'plain',
    styles: { 
      fontSize: 12, 
      cellPadding: { top: 1, right: 0, bottom: 1, left: 0 }, 
      overflow: 'linebreak', 
      valign: 'top', 
      textColor: [30, 41, 59] 
    },
    margin: M,
    didDrawCell: function(data) {
      if (data.cell.text && data.cell.text.join(' ').indexOf('TERMS AND CONDITIONS') !== -1) {
        var d = data.doc;
        var textWidth = d.getTextWidth('TERMS AND CONDITIONS');
        var x = data.cell.x + (data.cell.width - textWidth) / 2;
        var y = data.cell.y + data.cell.height - 1.5;
        d.setDrawColor(30, 41, 59);
        d.setLineWidth(0.4);
        d.line(x, y, x + textWidth, y);
      }
    }
  });
  curY = doc.lastAutoTable.finalY + 4;

  var agreementSigY = Math.max(curY + 18, pageH - 38);
  if (agreementSigY > pageH - 24) {
    doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
    agreementSigY = 60;
  }
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.5);
  doc.line(M.left + 8, agreementSigY, M.left + 78, agreementSigY);
  doc.line(pageW - M.right - 78, agreementSigY, pageW - M.right - 8, agreementSigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Borrower Signature', M.left + 43, agreementSigY + 5.5, { align: 'center' });
  doc.text('Lender / Administrator', pageW - M.right - 43, agreementSigY + 5.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(b.name, M.left + 43, agreementSigY + 11, { align: 'center' });
  doc.text(lenderName, pageW - M.right - 43, agreementSigY + 11, { align: 'center' });

  // ═══════════════════════════════════════════════════════
  // ACCOUNT STATEMENT (only when payments exist)
  // ═══════════════════════════════════════════════════════
  doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
  curY = 18;
  var lPay = payments.filter(function(p) { return p.loanId === loanId; }).sort(function(a, b) { return a.date.localeCompare(b.date); });
  if (lPay.length > 0) {
    doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
      startY: curY,
      head: [
        [{ content: 'ACCOUNT STATEMENT', colSpan: 3, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } }],
        ['TOTAL PAID', 'OUTSTANDING BALANCE', 'CURRENT STATUS']
      ],
      body: [[fmt(paid), fmt(out), loanStatus(loan).toUpperCase()]],
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 8.5, cellPadding: 3, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { textColor: [16, 185, 129] },
        1: { textColor: [244, 63, 94] },
        2: { textColor: [30, 41, 59] }
      },
      margin: M
    });
    curY = doc.lastAutoTable.finalY + 4;
  }

  // ═══════════════════════════════════════════════════════
  // AMORTIZATION SCHEDULE
  // ═══════════════════════════════════════════════════════
  var tableBody = (loan.schedule || []).map(function(r) {
    return [r.period, fmt(r.payment), fmt(r.principal), fmt(r.interest), fmt(r.balance)];
  });

  doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
    startY: curY,
    head: [['#', 'Payment', 'Principal', 'Interest', 'Balance']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [20, 184, 166], fontSize: 10, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 9.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: M
  });
  curY = doc.lastAutoTable.finalY + 4;

  // ═══════════════════════════════════════════════════════
  // PAYMENT HISTORY (if exists)
  // ═══════════════════════════════════════════════════════
  if (lPay.length > 0) {
    if (curY > 250) { doc.addPage(); curY = 15; }
    var payBody = lPay.map(function(p) { return [fmtDate(p.date), fmt(p.amount), p.note || '—']; });
    doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
      startY: curY,
      head: [['DATE', 'AMOUNT PAID', 'REMARKS']],
      body: payBody,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], fontSize: 10, fontStyle: 'bold', halign: 'left', cellPadding: 3 },
      styles: { fontSize: 9.5, cellPadding: 2.5 },
      margin: M
    });
    curY = doc.lastAutoTable.finalY + 4;
  }

  // ═══════════════════════════════════════════════════════
  // AGREEMENT & SIGNATURES
  // ═══════════════════════════════════════════════════════
  // Calculate how much space signatures + agreement need
  var sigWidth = 55;
  var sigGap = 10;
  var sigCount = 2 + ((loan.comakers && loan.comakers.length) || 0);
  var sigRows = sigCount <= 3 ? 1 : 2;
  var sigBlockHeight = sigRows * 18;
  var agreementText = "Agreement: The Borrower hereby acknowledges receipt of the full principal amount and agrees to the terms and repayment schedule outlined above. In case of default, the Lender reserves the right to take necessary legal action to recover the outstanding balance plus applicable penalties.";
  doc.setFontSize(7);
  var agreementLines = doc.splitTextToSize(agreementText, contentW);
  var agreementHeight = agreementLines.length * 3.5 + 6;
  var footerTotalHeight = agreementHeight + sigBlockHeight + 8;

  // Determine the page where content ended
  var lastPage = doc.internal.getNumberOfPages();
  doc.setPage(lastPage);

  var footerStartY;

  if (lastPage === 1) {
    // For single-page loans, push signatures to the absolute bottom of the page
    // to give it a full-page formal contract look.
    var bottomY = pageH - 10;
    footerStartY = bottomY - footerTotalHeight;
    // Just in case it's tight
    if (curY > footerStartY) {
      if (curY + footerTotalHeight > pageH - 10) {
        doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
        footerStartY = 20;
      } else {
        footerStartY = curY + 4;
      }
    }
  } else {
    // For 24/36 month loans that spill over to multiple pages,
    // flow naturally after the table to avoid massive blank spaces in the middle of page 2.
    if (curY + footerTotalHeight > pageH - 15) {
      doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
      footerStartY = 20;
    } else {
      footerStartY = curY + 10;
    }
  }

  // Draw a thin separator line before footer
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(M.left, footerStartY - 3, pageW - M.right, footerStartY - 3);

  // Agreement text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(agreementLines, M.left, footerStartY);
  var sigY = footerStartY + agreementHeight;

  // Signature lines
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);

  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.5);

  if (sigCount <= 3) {
    var totalSigW = sigCount * sigWidth + (sigCount - 1) * sigGap;
    var sx = (pageW - totalSigW) / 2;
    if (sx < M.left) sx = M.left;

    doc.line(sx, sigY, sx + sigWidth, sigY);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Borrower Signature', sx + sigWidth / 2, sigY + 5.5, { align: 'center' });
    sx += sigWidth + sigGap;

    if (loan.comakers && loan.comakers.length > 0) {
      loan.comakers.forEach(function(cm, i) {
        doc.line(sx, sigY, sx + sigWidth, sigY);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Co-Maker ' + (i + 1) + ': ' + cm.name, sx + sigWidth / 2, sigY + 5.5, { align: 'center' });
        sx += sigWidth + sigGap;
      });
    }

    doc.line(sx, sigY, sx + sigWidth, sigY);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Lender / Administrator', sx + sigWidth / 2, sigY + 5.5, { align: 'center' });
  } else {
    // Row 1: Borrower + Lender
    doc.line(M.left, sigY, M.left + sigWidth, sigY);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Borrower Signature', M.left + sigWidth / 2, sigY + 5.5, { align: 'center' });
    doc.line(pageW - M.right - sigWidth, sigY, pageW - M.right, sigY);
    doc.text('Lender / Administrator', pageW - M.right - sigWidth / 2, sigY + 5.5, { align: 'center' });

    // Row 2: Co-makers
    sigY += 18;
    if (loan.comakers && loan.comakers.length > 0) {
      var cmTotalW = loan.comakers.length * sigWidth + (loan.comakers.length - 1) * sigGap;
      var cmx = (pageW - cmTotalW) / 2;
      if (cmx < M.left) cmx = M.left;
      loan.comakers.forEach(function(cm, i) {
        doc.line(cmx, sigY, cmx + sigWidth, sigY);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Co-Maker ' + (i + 1) + ': ' + cm.name, cmx + sigWidth / 2, sigY + 5.5, { align: 'center' });
        cmx += sigWidth + sigGap;
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  // FOOTER BAR + SIGNATURE STRIP ON EVERY PAGE
  // ═══════════════════════════════════════════════════════
  var totalPages = doc.internal.getNumberOfPages();
  // Build signer list once
  var pageSigners = [{ label: b.name, role: 'Borrower' }];
  if (loan.comakers && loan.comakers.length > 0) {
    loan.comakers.forEach(function(cm, i) {
      pageSigners.push({ label: cm.name, role: 'Co-Maker ' + (i + 1) });
    });
  }
  pageSigners.push({ label: lenderName, role: 'Lender' });

  for (var pi = 1; pi <= totalPages; pi++) {
    doc.setPage(pi);
    // Signature strip (compact, 20mm above footer)
    var sigStripTop = pageH - 26;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(M.left, sigStripTop, pageW - M.right, sigStripTop);

    var slotW = contentW / pageSigners.length;
    pageSigners.forEach(function(signer, idx) {
      var sx = M.left + idx * slotW;
      var mx = sx + slotW / 2;
      var lineY = sigStripTop + 7;
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.5);
      doc.line(sx + 3, lineY, sx + slotW - 3, lineY);
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(signer.role, mx, lineY + 5.5, { align: 'center' });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      var signerLabel = signer.label.length > 22 ? signer.label.slice(0, 20) + '..' : signer.label;
      doc.text(signerLabel, mx, lineY + 11, { align: 'center' });
    });

    // Footer bar
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageH - 6, pageW, 6, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a system-generated document. LoanPro Loan Management System. Page ' + pi + ' of ' + totalPages, 105, pageH - 2.5, { align: 'center' });
  }

  // ═══════════════════════════════════════════════════════
  // ATTACHMENTS APPENDIX
  // ═══════════════════════════════════════════════════════
  var hasAttachments = false;
  if (loan.attachments && (loan.attachments.idFront || loan.attachments.idBack)) hasAttachments = true;
  if (loan.comakers && loan.comakers.some(function(cm) { return cm.idFront || cm.idBack; })) hasAttachments = true;

  if (hasAttachments) {
    doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
    var atY = 20;
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, pageW, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('APPENDIX: ID ATTACHMENTS', M.left, 8);

    function addImageBlock(title, front, back) {
      if (!front && !back) return;
      if (atY > pageH - 60) { doc.addPage(); atY = 20; }
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, M.left, atY);
      atY += 6;
      
      var imgW = 80;
      var imgH = 50;
      var startX = M.left;
      
      if (front) {
        doc.setFontSize(8); doc.setTextColor(100, 116, 139);
        doc.text('Front ID', startX, atY);
        try { doc.addImage(front, 'JPEG', startX, atY + 2, imgW, imgH); } catch(e){}
      }
      if (back) {
        var bx = front ? startX + imgW + 10 : startX;
        doc.setFontSize(8); doc.setTextColor(100, 116, 139);
        doc.text('Back ID', bx, atY);
        try { doc.addImage(back, 'JPEG', bx, atY + 2, imgW, imgH); } catch(e){}
      }
      atY += imgH + 15;
    }

    addImageBlock('Borrower: ' + b.name, loan.attachments && loan.attachments.idFront, loan.attachments && loan.attachments.idBack);
    
    if (loan.comakers && loan.comakers.length > 0) {
      loan.comakers.forEach(function(cm, i) {
        addImageBlock('Co-Maker ' + (i+1) + ': ' + cm.name, cm.idFront, cm.idBack);
      });
    }

    // Apply footer to appendix pages
    var appendPages = doc.internal.getNumberOfPages();
    for (var pi = totalPages + 1; pi <= appendPages; pi++) {
      doc.setPage(pi);
      doc.setFillColor(248, 250, 252); doc.rect(0, pageH - 6, pageW, 6, 'F');
      doc.setFontSize(5.5); doc.setTextColor(148, 163, 184);
      doc.text('This is a system-generated document. Appendix Page', 105, pageH - 2.5, { align: 'center' });
    }
  }

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
  
  var W = 420, H = 750;
  var dpr = window.devicePixelRatio || 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#f0f2f5';
  ctx.fillRect(0, 0, W, H);

  // Header Gradient
  var headerH = 220;
  var hGrad = ctx.createLinearGradient(0, 0, W, headerH);
  hGrad.addColorStop(0, '#007bff');
  hGrad.addColorStop(0.5, '#0056d2');
  hGrad.addColorStop(1, '#003ea1');
  ctx.fillStyle = hGrad;
  
  // Rounded bottom corners
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, headerH - 25);
  ctx.quadraticCurveTo(W, headerH, W - 25, headerH); ctx.lineTo(25, headerH);
  ctx.quadraticCurveTo(0, headerH, 0, headerH - 25); ctx.closePath(); ctx.fill();

  // Pattern overlay circles
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(60, 40, 80, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(360, 180, 100, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1.0;

  // Checkmark circle
  var cx = W / 2, cy = 65;
  ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = '#0056d2'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 10, cy + 1); ctx.lineTo(cx - 3, cy + 9); ctx.lineTo(cx + 12, cy - 8); ctx.stroke();

  ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = '600 18px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('Payment Successful', cx, cy + 55);

  ctx.font = 'bold 42px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(fmt(p.amount), cx, cy + 105);

  ctx.font = '300 13px "Inter", "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
  var dateStr = new Date(p.date).toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillText(dateStr, cx, cy + 128);

  // WHITE CARD
  var cardX = 20, cardY = headerH + 15, cardW = W - 40, cardH = H - cardY - 70, radius = 16;
  ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 15; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cardX + radius, cardY); ctx.lineTo(cardX + cardW - radius, cardY);
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius); ctx.lineTo(cardX + cardW, cardY + cardH - radius);
  ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH); ctx.lineTo(cardX + radius, cardY + cardH);
  ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius); ctx.lineTo(cardX, cardY + radius);
  ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  var dx = cardX + 24, dy = cardY + 30;
  ctx.textAlign = 'left'; ctx.fillStyle = '#0056d2'; ctx.font = '700 11px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('TRANSACTION DETAILS', dx, dy);

  dy += 12; ctx.strokeStyle = '#e8ecf1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(cardX + cardW - 24, dy); ctx.stroke();

  var rh = 36; dy += 8; var rightX = cardX + cardW - 24;
  function drawRow(label, value, isHighlight, isBold) {
    dy += rh; ctx.textAlign = 'left'; ctx.fillStyle = '#6b7280'; ctx.font = '400 12px "Inter", "Segoe UI", sans-serif'; ctx.fillText(label, dx, dy);
    ctx.textAlign = 'right'; ctx.fillStyle = isHighlight ? '#0056d2' : '#1f2937'; ctx.font = (isBold ? 'bold ' : '500 ') + '13px "Inter", "Segoe UI", sans-serif'; ctx.fillText(value, rightX, dy);
  }

  drawRow('Recipient', b.name, false, true);
  drawRow('Transaction Type', 'Loan Repayment', false, false);
  drawRow('Reference No.', p.id.slice(-8).toUpperCase(), true, true);
  drawRow('Loan Reference', loan.id.slice(-6).toUpperCase(), false, false);

  dy += 18; ctx.setLineDash([3, 3]); ctx.strokeStyle = '#d1d5db';
  ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(rightX, dy); ctx.stroke(); ctx.setLineDash([]);

  drawRow('Amount Paid', fmt(p.amount), false, true);
  drawRow('Payment Date', fmtDate(p.date), false, false);
  if (p.note) drawRow('Remarks', p.note, false, false);

  dy += 18; ctx.setLineDash([3, 3]); ctx.strokeStyle = '#d1d5db';
  ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(rightX, dy); ctx.stroke(); ctx.setLineDash([]);

  dy += rh; ctx.textAlign = 'left'; ctx.fillStyle = '#6b7280'; ctx.font = '400 12px "Inter", "Segoe UI", sans-serif'; ctx.fillText('Remaining Balance', dx, dy);
  ctx.textAlign = 'right'; var outstanding = loanOutstanding(loan);
  ctx.fillStyle = outstanding > 0 ? '#ef4444' : '#16a34a'; ctx.font = 'bold 15px "Inter", "Segoe UI", sans-serif'; ctx.fillText(fmt(outstanding), rightX, dy);

  dy += rh; ctx.textAlign = 'left'; ctx.fillStyle = '#6b7280'; ctx.font = '400 12px "Inter", "Segoe UI", sans-serif'; ctx.fillText('Loan Status', dx, dy);
  ctx.textAlign = 'right'; var st = loanStatus(loan); var stColors = { active: '#0056d2', paid: '#16a34a', overdue: '#ef4444', closed: '#6b7280', pending: '#f59e0b' };
  ctx.fillStyle = stColors[st] || '#1f2937'; ctx.font = 'bold 13px "Inter", "Segoe UI", sans-serif'; ctx.fillText(st.toUpperCase(), rightX, dy);

  // FOOTER
  ctx.textAlign = 'center'; ctx.fillStyle = '#9ca3af'; ctx.font = '400 10px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('Powered by LoanPro \u00b7 Loan Management System', W / 2, H - 38);
  ctx.font = '400 9px "Inter", "Segoe UI", sans-serif'; ctx.fillStyle = '#b0b8c4';
  ctx.fillText('This is a system-generated receipt. No signature required.', W / 2, H - 22);

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

// ── Bank / Credit Loans ────────────────────────────────────
// Helpers for existing createPDFObject loan agreement text
function isBankCreditLoan(loan){ return !!(loan.source && (loan.source==='bank'||loan.source==='credit')); }
function loanSourceLabel(loan){ return loan.source==='credit'?'Credit Card Loan':'Bank Loan'; }
function blPaid(bl){ return bankPayments.filter(function(p){ return p.blId===bl.id; }).reduce(function(s,p){ return s+p.amount; },0); }
function blOutstanding(bl){ return Math.max(0,bl.totalAmount-blPaid(bl)); }
function blStatus(bl){
  if(bl.status==='closed') return 'closed';
  if(blOutstanding(bl)<=0) return 'paid';
  if(bl.dueDate && new Date(bl.dueDate)<new Date()) return 'overdue';
  return bl.status||'active';
}

register('bank-loans',function(_,area){
  var html='<div class="page">';
  html+='<div class="page-header"><div class="page-header-info"><h1 class="page-title">Bank / Credit Loans</h1><p class="page-subtitle">Track loans you obtained from banks or credit cards. Monitor and record payments.</p></div>';
  html+='<div class="page-actions"><button class="btn btn-primary" onclick="openAddBankLoanModal()">+ New Bank/Credit Loan</button></div></div>';

  // KPI row
  var totBL=bankLoans.reduce(function(s,b){ return s+b.principal; },0);
  var totBLOut=bankLoans.reduce(function(s,b){ return s+blOutstanding(b); },0);
  var totBLPaid=bankLoans.reduce(function(s,b){ return s+blPaid(b); },0);
  var actBL=bankLoans.filter(function(b){ var st=blStatus(b); return st==='active'||st==='overdue'; }).length;
  html+='<div class="kpi-grid" style="margin-bottom:24px">';
  html+='<div class="kpi-card indigo"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div><div class="kpi-info"><span class="kpi-label">Total Borrowed</span><span class="kpi-value">'+fmt(totBL)+'</span><span class="kpi-sub">'+bankLoans.length+' accounts</span></div></div>';
  html+='<div class="kpi-card rose"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="kpi-info"><span class="kpi-label">Outstanding</span><span class="kpi-value">'+fmt(totBLOut)+'</span><span class="kpi-sub">'+actBL+' active</span></div></div>';
  html+='<div class="kpi-card emerald"><div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="kpi-info"><span class="kpi-label">Total Paid</span><span class="kpi-value">'+fmt(totBLPaid)+'</span><span class="kpi-sub">'+bankPayments.length+' payments</span></div></div>';
  html+='</div>';

  // Table
  html+='<div class="table-container">';
  html+='<div class="table-header"><span class="table-title">All Bank / Credit Accounts</span>';
  html+='<div class="search-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input id="blSrch" type="text" placeholder="Search..." oninput="renderBankLoans()"></div></div>';
  html+='<table><thead><tr><th>ID</th><th>Borrower</th><th>Account Name</th><th>Type</th><th>Principal</th><th>Monthly</th><th>Outstanding</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="blTbody"></tbody></table>';
  html+='</div>';
  html+='</div>';
  area.innerHTML=html;
  renderBankLoans();
});

function renderBankLoans(){
  var tb=document.getElementById('blTbody'); if(!tb) return;
  var q=((document.getElementById('blSrch')||{}).value||'').toLowerCase();
  var fl=bankLoans.filter(function(bl){
    var bw=borrowers.find(function(x){ return x.id===bl.borrowerId; });
    var bname=(bw?bw.name:'').toLowerCase();
    return !q||(bl.lender||'').toLowerCase().includes(q)||(bl.accountName||'').toLowerCase().includes(q)||(bl.type||'').toLowerCase().includes(q)||bname.includes(q);
  }).sort(function(a,b){ return b.createdAt.localeCompare(a.createdAt); });
  if(!fl.length){ tb.innerHTML='<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">🏦</div><div class="empty-title">No bank/credit loans yet</div><div class="empty-sub">Click "+ New Bank/Credit Loan" to add one.</div></div></td></tr>'; return; }
  tb.innerHTML='';
  fl.forEach(function(bl){
    var out=blOutstanding(bl), st=blStatus(bl);
    var bw=borrowers.find(function(x){ return x.id===bl.borrowerId; });
    var bname=bw?bw.name:'—';
    tb.innerHTML+='<tr>'+
      '<td data-label="ID" style="font-family:monospace;font-size:11px;color:var(--text-muted)">'+bl.id.slice(-6).toUpperCase()+'</td>'+
      '<td class="td-primary" data-label="Borrower" style="cursor:pointer" onclick="location.hash=\'#bank-loan-detail/'+bl.id+'\'" title="'+bname+'">'+bname+'</td>'+
      '<td data-label="Account">'+(bl.accountName||bl.lender||'—')+'</td>'+
      '<td data-label="Type"><span style="font-size:11px;padding:3px 8px;border-radius:12px;background:var(--surface-3);color:var(--text-secondary)">'+(bl.type||'Bank Loan')+'</span></td>'+
      '<td class="td-amount" data-label="Principal">'+fmt(bl.principal)+'</td>'+
      '<td data-label="Monthly">'+fmt(bl.monthlyPayment)+'</td>'+
      '<td data-label="Outstanding" style="color:'+(out>0?'var(--danger)':'var(--success)')+';font-weight:700">'+fmt(out)+'</td>'+
      '<td data-label="Due Date">'+fmtDate(bl.dueDate)+'</td>'+
      '<td data-label="Status">'+badgeHTML(st)+'</td>'+
      '<td data-label="Actions"><div class="td-actions">'+
        '<button class="icon-btn icon-btn-view" title="View" onclick="location.hash=\'#bank-loan-detail/'+bl.id+'\'">👁</button>'+
        '<button class="icon-btn icon-btn-pay" title="Record Payment" onclick="openBankPayModal(\''+bl.id+'\')" '+(st==='closed'||st==='paid'?'disabled':'')+'>$</button>'+
        '<button class="icon-btn icon-btn-delete" title="Delete" onclick="delBankLoan(\''+bl.id+'\')" >✕</button>'+
      '</div></td></tr>';
  });
}

function openAddBankLoanModal(){
  var borrowerOpts=borrowers.map(function(b){ return '<option value="'+b.id+'">'+b.name+'</option>'; }).join('');
  openModal('New Bank / Credit Loan',
    '<div class="form-grid">'+
    '<div class="form-group full-width"><label>Borrower *</label><select class="form-control" id="blBorrower" onchange="blShowBorrowerInfo()"><option value="">— Select Borrower —</option>'+borrowerOpts+'</select></div>'+
    '<div id="blBorrowerInfo" style="display:none;background:var(--surface-2);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--text-secondary);margin-bottom:4px;grid-column:1/-1"></div>'+
    '<div class="form-group"><label>Account / Lender Name *</label><input class="form-control" id="blName" placeholder="e.g. BDO Personal Loan"></div>'+
    '<div class="form-group"><label>Type</label><select class="form-control" id="blType"><option value="Bank Loan">Bank Loan</option><option value="Credit Card">Credit Card</option><option value="SSS Loan">SSS Loan</option><option value="Pag-IBIG Loan">Pag-IBIG Loan</option><option value="Other">Other</option></select></div>'+
    '<div class="form-group"><label>Principal Amount (PHP) *</label><input class="form-control" id="blAmt" type="number" min="1" placeholder="50000" oninput="blUpdatePreview(); blUpdateComakers()"></div>'+
    '<div class="form-group"><label>Interest Rate (%)</label><input class="form-control" id="blRate" type="number" min="0" step="0.01" placeholder="1.5" oninput="blUpdatePreview()"></div>'+
    '<div class="form-group"><label>Term (months) *</label><input class="form-control" id="blTerm" type="number" min="1" placeholder="12" oninput="blUpdatePreview()"></div>'+
    '<div class="form-group"><label>Interest Type</label><select class="form-control" id="blIntType" onchange="blUpdatePreview()"><option value="simple">Simple (Flat)</option><option value="compound">Reducing Balance</option></select></div>'+
    '<div class="form-group"><label>Start Date</label><input class="form-control" id="blStart" type="date" value="'+today()+'"></div>'+
    '<div class="form-group full-width"><label>Account / Reference No.</label><input class="form-control" id="blRef" placeholder="e.g. Account #123456"></div>'+
    '<div class="form-group full-width"><label>Notes</label><textarea class="form-control" id="blNotes" rows="2" placeholder="Purpose, collateral, conditions..."></textarea></div>'+
    '</div>'+
    '<div class="form-section-title" style="margin-top:14px">Borrower ID Attachments <span style="font-size:11px;color:var(--text-muted);font-weight:normal">(Optional)</span></div>'+
    '<div class="form-grid">'+
    '<div class="form-group"><label>Borrower ID Front</label><input type="file" id="blIdFront" class="form-control" accept="image/*"></div>'+
    '<div class="form-group"><label>Borrower ID Back</label><input type="file" id="blIdBack" class="form-control" accept="image/*"></div>'+
    '</div>'+
    '<div id="blPrevBox" style="margin-top:12px;padding:12px;background:var(--surface-2);border-radius:8px;font-size:12px;color:var(--text-secondary);display:none"></div>'+
    '<div id="blComakerSection" style="margin-top:4px"></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitBankLoan()">Create Loan</button>'
  );
}

function blShowBorrowerInfo(){
  var sel=document.getElementById('blBorrower'); if(!sel) return;
  var bid=sel.value;
  var infoBox=document.getElementById('blBorrowerInfo'); if(!infoBox) return;
  if(!bid){ infoBox.style.display='none'; return; }
  var b=borrowers.find(function(x){ return x.id===bid; });
  if(!b){ infoBox.style.display='none'; return; }
  infoBox.style.display='block';
  infoBox.innerHTML=
    '<div style="display:flex;gap:24px;flex-wrap:wrap">'+
    '<span><strong style="color:var(--primary)">'+b.name+'</strong></span>'+
    (b.phone?'<span>📞 '+b.phone+'</span>':'')+
    (b.email?'<span>✉ '+b.email+'</span>':'')+
    (b.address?'<span>📍 '+b.address+'</span>':'')+
    (b.govId?'<span>🪪 '+b.govId+'</span>':'')+
    '</div>';
}

function blUpdatePreview(){
  var p=parseFloat((document.getElementById('blAmt')||{}).value)||0;
  var r=parseFloat((document.getElementById('blRate')||{}).value)||0;
  var t=parseInt((document.getElementById('blTerm')||{}).value)||0;
  var tp=(document.getElementById('blIntType')||{}).value||'simple';
  var box=document.getElementById('blPrevBox'); if(!box) return;
  if(!p||!t){ box.style.display='none'; return; }
  var c=calcLoan(p,r,t,tp);
  box.style.display='block';
  box.innerHTML='<strong style="color:var(--primary)">Preview:</strong> Monthly = <strong>'+fmt(c.monthlyPayment)+'</strong> | Total Interest = <strong>'+fmt(c.totalInterest)+'</strong> | Total Repayable = <strong style="color:var(--primary)">'+fmt(c.totalAmount)+'</strong>';
}

function blGetRequiredComakers(amount){
  if(amount>=10000&&amount<30000) return 1;
  if(amount>=30000) return 2;
  return 0;
}

function blUpdateComakers(){
  var p=parseFloat((document.getElementById('blAmt')||{}).value)||0;
  var required=blGetRequiredComakers(p);
  var sec=document.getElementById('blComakerSection'); if(!sec) return;
  if(required===0){ sec.innerHTML=''; return; }
  var html='<div class="form-section-title" style="margin-top:14px">Co-Maker Information <span style="font-size:11px;color:var(--text-muted);font-weight:normal">('+required+' required for this amount)</span></div><div class="form-grid">';
  for(var i=1;i<=required;i++){
    html+='<div class="form-group"><label>Co-Maker '+i+' Full Name *</label><input id="blCmName'+i+'" class="form-control" placeholder="Full name"></div>'+
      '<div class="form-group"><label>Co-Maker '+i+' Phone</label><input id="blCmPhone'+i+'" class="form-control" placeholder="09xx..."></div>'+
      '<div class="form-group"><label>Co-Maker '+i+' Address</label><input id="blCmAddr'+i+'" class="form-control" placeholder="Address"></div>'+
      '<div class="form-group"><label>Co-Maker '+i+' Relationship</label><input id="blCmRel'+i+'" class="form-control" placeholder="e.g. Spouse, Sibling"></div>'+
      '<div class="form-group"><label>Co-Maker '+i+' ID Front <span style="font-size:10px">(Optional)</span></label><input type="file" id="blCmIdFront'+i+'" accept="image/*" class="form-control"></div>'+
      '<div class="form-group"><label>Co-Maker '+i+' ID Back <span style="font-size:10px">(Optional)</span></label><input type="file" id="blCmIdBack'+i+'" accept="image/*" class="form-control"></div>';
  }
  html+='</div>';
  sec.innerHTML=html;
}

function submitBankLoan(){
  var bid=((document.getElementById('blBorrower')||{}).value||'').trim();
  if(!bid){ toast('Please select a borrower.','error'); return; }
  var selectedBorrower=borrowers.find(function(x){ return x.id===bid; });
  var name=(document.getElementById('blName')||{}).value.trim();
  var p=parseFloat((document.getElementById('blAmt')||{}).value||0);
  var r=parseFloat((document.getElementById('blRate')||{}).value||0);
  var t=parseInt((document.getElementById('blTerm')||{}).value||0);
  var tp=(document.getElementById('blIntType')||{}).value||'simple';
  var sd=(document.getElementById('blStart')||{}).value||today();
  if(!name){ toast('Enter an account/lender name.','error'); return; }
  if(!p||p<=0){ toast('Enter a valid amount.','error'); return; }
  if(!t||t<1){ toast('Enter a valid term.','error'); return; }
  // Collect co-makers
  var requiredCM=blGetRequiredComakers(p);
  var comakers=[];
  for(var ci=1;ci<=requiredCM;ci++){
    var cmN=((document.getElementById('blCmName'+ci)||{}).value||'').trim();
    if(!cmN){ toast('Co-Maker '+ci+' name is required.','error'); return; }
    comakers.push({
      id:ci, name:cmN,
      phone:((document.getElementById('blCmPhone'+ci)||{}).value||'').trim(),
      address:((document.getElementById('blCmAddr'+ci)||{}).value||'').trim(),
      relationship:((document.getElementById('blCmRel'+ci)||{}).value||'').trim()
    });
  }

  // Collect files for compression
  var filesToProcess={};
  var bF=document.getElementById('blIdFront'); if(bF&&bF.files[0]) filesToProcess['borF']=bF.files[0];
  var bB=document.getElementById('blIdBack');  if(bB&&bB.files[0]) filesToProcess['borB']=bB.files[0];
  for(var cj=1;cj<=requiredCM;cj++){
    var cf=document.getElementById('blCmIdFront'+cj); if(cf&&cf.files[0]) filesToProcess['cmF'+cj]=cf.files[0];
    var cb=document.getElementById('blCmIdBack'+cj);  if(cb&&cb.files[0]) filesToProcess['cmB'+cj]=cb.files[0];
  }

  var c=calcLoan(p,r,t,tp);
  var due=new Date(sd); due.setMonth(due.getMonth()+t);

  var btn=document.querySelector('button[onclick="submitBankLoan()"]');
  if(btn){ btn.disabled=true; btn.innerText='Creating...'; }

  processImagesCompressed(filesToProcess,function(imgs){
    // Attach images to co-makers
    for(var k=0;k<comakers.length;k++){
      var n=comakers[k].id;
      if(imgs['cmF'+n]) comakers[k].idFront=imgs['cmF'+n];
      if(imgs['cmB'+n]) comakers[k].idBack=imgs['cmB'+n];
    }
    var attachments={};
    if(imgs['borF']) attachments.idFront=imgs['borF'];
    if(imgs['borB']) attachments.idBack=imgs['borB'];

    var bl={
      id:uid(),
      accountName:(document.getElementById('blName')||{}).value.trim(),
      type:(document.getElementById('blType')||{}).value||'Bank Loan',
      lender:(document.getElementById('blName')||{}).value.trim(),
      borrowerId:bid,
      contact:selectedBorrower?selectedBorrower.name:'',
      refNo:((document.getElementById('blRef')||{}).value||'').trim(),
      notes:((document.getElementById('blNotes')||{}).value||'').trim(),
      principal:p, rate:r, term:t, type2:tp,
      startDate:sd, dueDate:due.toISOString().split('T')[0],
      monthlyPayment:c.monthlyPayment,
      totalInterest:c.totalInterest,
      totalAmount:c.totalAmount,
      schedule:c.schedule,
      comakers:comakers,
      attachments:attachments,
      status:'active',
      createdAt:new Date().toISOString()
    };
    bankLoans.push(bl);
    logActivity('loan','Bank/Credit loan of '+fmt(p)+' added: '+bl.accountName);
    save(); closeModal();
    toast('Bank/Credit loan created!');
    navigate('#bank-loans');
  });
}

function delBankLoan(id){
  var bl=bankLoans.find(function(x){ return x.id===id; }); if(!bl) return;
  openModal('Delete Bank Loan','<p style="color:var(--text-secondary)">Delete <strong>'+(bl.accountName||bl.lender)+'</strong>? All payments will also be removed.</p>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmDelBankLoan(\''+id+'\')" >Delete</button>');
}
function confirmDelBankLoan(id){
  bankLoans=bankLoans.filter(function(x){ return x.id!==id; });
  bankPayments=bankPayments.filter(function(x){ return x.blId!==id; });
  save(); closeModal(); toast('Bank loan deleted.','info');
  navigate('#bank-loans');
}

// Bank Loan Detail
register('bank-loan-detail',function(page,area){
  var id=page.split('/')[1];
  var bl=bankLoans.find(function(x){ return x.id===id; });
  if(!bl){ area.innerHTML='<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Loan not found</div><button class="btn btn-secondary" onclick="location.hash=\'#bank-loans\'">Back</button></div>'; return; }
  var out=blOutstanding(bl), paid=blPaid(bl), pct=Math.min(100,(paid/bl.totalAmount)*100), st=blStatus(bl);
  var lPay=bankPayments.filter(function(p){ return p.blId===id; }).sort(function(a,b){ return b.date.localeCompare(a.date); });

  var srows=''; (bl.schedule||[]).forEach(function(r){ srows+='<tr><td data-label="#">'+r.period+'</td><td data-label="Payment">'+fmt(r.payment)+'</td><td data-label="Principal">'+fmt(r.principal)+'</td><td data-label="Interest">'+fmt(r.interest)+'</td><td data-label="Balance" style="color:var(--primary)">'+fmt(r.balance)+'</td></tr>'; });
  var prows='';
  if(!lPay.length){ prows='<tr><td colspan="4"><div class="empty-state" style="padding:30px"><div class="empty-icon">💳</div><div class="empty-title">No payments yet</div></div></td></tr>'; }
  else { lPay.forEach(function(p){ prows+='<tr><td data-label="Date">'+fmtDate(p.date)+'</td><td class="td-amount" data-label="Amount">'+fmt(p.amount)+'</td><td data-label="Note" style="color:var(--text-muted);font-size:12px">'+(p.note||'—')+'</td><td data-label="Actions"><div class="td-actions"><button class="icon-btn icon-btn-receipt" title="Download Receipt" onclick="downloadBankReceipt(\''+p.id+'\')" >🧾</button><button class="icon-btn icon-btn-delete" onclick="delBankPayment(\''+p.id+'\',\''+bl.id+'\')" >✕</button></div></td></tr>'; }); }

  // Co-maker detail rows
  var cmHTML = '';
  if (bl.comakers && bl.comakers.length > 0) {
    cmHTML = '<div class="card"><div class="form-section-title">Co-Maker(s)</div>';
    bl.comakers.forEach(function(cm, idx) {
      cmHTML += '<div class="detail-row"><span class="detail-key">Co-Maker ' + (idx+1) + '</span><span class="detail-val">' + cm.name + '</span></div>';
      if (cm.phone) cmHTML += '<div class="detail-row"><span class="detail-key" style="padding-left:12px">Phone</span><span class="detail-val" style="font-size:12px">' + cm.phone + '</span></div>';
      if (cm.address) cmHTML += '<div class="detail-row"><span class="detail-key" style="padding-left:12px">Address</span><span class="detail-val" style="font-size:12px">' + cm.address + '</span></div>';
      if (cm.relationship) cmHTML += '<div class="detail-row"><span class="detail-key" style="padding-left:12px">Relationship</span><span class="detail-val" style="font-size:12px">' + cm.relationship + '</span></div>';
    });
    cmHTML += '</div>';
  }

  // Build complete page header + action buttons as a single HTML string
  // to avoid the innerHTML+= re-parse bug where unclosed tags get auto-closed
  // on each reassignment, which breaks the flex gap on .page-actions buttons.
  var headerHTML = '<div class="page">';
  headerHTML += '<div class="page-header">';
  headerHTML += '<div class="page-header-info"><h1 class="page-title">Bank Loan Detail</h1><p class="page-subtitle">'+(bl.accountName||bl.lender)+' · #'+bl.id.slice(-6).toUpperCase()+'</p></div>';
  headerHTML += '<div class="page-actions">';
  headerHTML += '<button class="btn btn-secondary" onclick="location.hash=\'#bank-loans\'">← Back</button>';
  headerHTML += '<button class="btn btn-secondary" onclick="editBankLoan(\''+bl.id+'\')">✎ Edit</button>';
  headerHTML += downloadBankLoanPDFBtn(bl.id);
  if(st!=='paid'&&st!=='closed') headerHTML += '<button class="btn btn-primary" onclick="openBankPayModal(\''+bl.id+'\')">Record Payment</button>';
  if(st!=='closed') headerHTML += '<button class="btn btn-secondary" onclick="closeBankLoan(\''+bl.id+'\')">Close Loan</button>';
  headerHTML += '</div></div>';
  area.innerHTML = headerHTML;

  area.innerHTML+='<div class="loan-detail-grid">';
  area.innerHTML+='<div style="display:flex;flex-direction:column;gap:20px">';
  area.innerHTML+='<div class="card"><div class="form-section-title">Account Summary</div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Account/Lender</span><span class="detail-val">'+(bl.accountName||bl.lender||'—')+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Type</span><span class="detail-val">'+(bl.type||'Bank Loan')+'</span></div>';
  if(bl.refNo) area.innerHTML+='<div class="detail-row"><span class="detail-key">Ref/Account No.</span><span class="detail-val">'+bl.refNo+'</span></div>';
  if(bl.contact) area.innerHTML+='<div class="detail-row"><span class="detail-key">Contact Person</span><span class="detail-val">'+bl.contact+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Principal</span><span class="detail-val">'+fmt(bl.principal)+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Interest Rate</span><span class="detail-val">'+bl.rate+'% ('+(bl.type2||bl.intType||'simple')+')</span></div>';

  area.innerHTML+='<div class="detail-row"><span class="detail-key">Term</span><span class="detail-val">'+bl.term+' months</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Monthly Payment</span><span class="detail-val">'+fmt(bl.monthlyPayment)+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Total Interest</span><span class="detail-val">'+fmt(bl.totalInterest)+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Total Repayable</span><span class="detail-val">'+fmt(bl.totalAmount)+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Start Date</span><span class="detail-val">'+fmtDate(bl.startDate)+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Due Date</span><span class="detail-val">'+fmtDate(bl.dueDate)+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Status</span><span class="detail-val">'+badgeHTML(st)+'</span></div>';
  if(bl.notes) area.innerHTML+='<div class="detail-row"><span class="detail-key">Notes</span><span class="detail-val" style="font-size:12px;max-width:55%;text-align:right">'+bl.notes+'</span></div>';
  area.innerHTML+='</div>';

  // Inject co-maker section if present
  if(cmHTML) area.innerHTML+=cmHTML;

  area.innerHTML+='<div class="table-container"><div class="table-header"><span class="table-title">Amortization Schedule</span></div>';
  area.innerHTML+='<div style="max-height:320px;overflow-y:auto"><table><thead><tr><th>#</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>'+srows+'</tbody></table></div></div>';
  area.innerHTML+='</div>';

  area.innerHTML+='<div style="display:flex;flex-direction:column;gap:20px">';
  area.innerHTML+='<div class="card"><div class="form-section-title">Repayment Progress</div>';
  area.innerHTML+='<div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px">'+fmt(paid)+' paid of '+fmt(bl.totalAmount)+'</div>';
  area.innerHTML+='<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:'+pct.toFixed(1)+'%"></div></div>';
  area.innerHTML+='<div style="font-size:12px;color:var(--text-muted);margin-top:4px">'+pct.toFixed(1)+'% repaid</div>';
  area.innerHTML+='<hr class="form-divider">';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Amount Paid</span><span class="detail-val" style="color:var(--success)">'+fmt(paid)+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Outstanding</span><span class="detail-val" style="color:'+(out>0?'var(--danger)':'var(--success)')+'">'+fmt(out)+'</span></div>';
  area.innerHTML+='<div class="detail-row"><span class="detail-key">Payments Made</span><span class="detail-val">'+lPay.length+'</span></div>';
  area.innerHTML+='</div>';

  area.innerHTML+='<div class="table-container"><div class="table-header"><span class="table-title">Payment History</span></div>';
  area.innerHTML+='<div style="max-height:300px;overflow-y:auto"><table><thead><tr><th>Date</th><th>Amount</th><th>Note</th><th></th></tr></thead><tbody>'+prows+'</tbody></table></div></div>';
  area.innerHTML+='</div></div></div>';
});

function downloadBankLoanPDFBtn(id){
  return '<button class="btn btn-secondary" onclick="generateBankLoanPDF(\''+id+'\')" >⬇️ Download PDF</button>';
}

function openBankPayModal(blId){
  var bl=bankLoans.find(function(x){ return x.id===blId; }); if(!bl) return;
  var out=blOutstanding(bl);
  openModal('Record Bank Loan Payment',
    '<div class="form-grid col-1" style="gap:14px">'+
    '<div class="detail-row"><span class="detail-key">Account</span><span class="detail-val">'+(bl.accountName||bl.lender)+'</span></div>'+
    '<div class="detail-row"><span class="detail-key">Outstanding</span><span class="detail-val" style="color:var(--danger)">'+fmt(out)+'</span></div>'+
    '<div class="form-group"><label>Amount (PHP) *</label><input class="form-control" id="bpAmt" type="number" min="1" value="'+bl.monthlyPayment.toFixed(2)+'"></div>'+
    '<div class="form-group"><label>Date</label><input class="form-control" id="bpDate" type="date" value="'+today()+'"></div>'+
    '<div class="form-group"><label>Note / Reference</label><input class="form-control" id="bpNote" placeholder="e.g. Online transfer ref #123"></div></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitBankPay(\''+blId+'\')" >Record</button>'
  );
}

function submitBankPay(blId){
  var amt=parseFloat((document.getElementById('bpAmt')||{}).value||0);
  if(!amt||amt<=0){ toast('Enter a valid amount.','error'); return; }
  var pid=uid();
  var date=(document.getElementById('bpDate')||{}).value||today();
  var note=((document.getElementById('bpNote')||{}).value||'').trim();
  bankPayments.push({id:pid,blId:blId,amount:amt,date:date,note:note,createdAt:new Date().toISOString()});
  var bl=bankLoans.find(function(x){ return x.id===blId; });
  logActivity('payment','Bank loan payment of '+fmt(amt)+' recorded for '+(bl?bl.accountName:'account'));
  save(); closeModal();
  toast(fmt(amt)+' payment recorded!');
  setTimeout(function(){ downloadBankReceipt(pid); },700);
  navigate('#bank-loan-detail/'+blId);
}

function delBankPayment(pid,blId){
  bankPayments=bankPayments.filter(function(x){ return x.id!==pid; });
  save(); toast('Payment removed.','info');
  navigate('#bank-loan-detail/'+blId);
}

function closeBankLoan(id){
  var bl=bankLoans.find(function(x){ return x.id===id; }); if(!bl) return;
  openModal('Close Bank Loan','<p style="color:var(--text-secondary)">Close <strong>'+(bl.accountName||bl.lender)+'</strong>? No further payments will be recorded.</p>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="confirmCloseBankLoan(\''+id+'\')" >Close</button>');
}
function confirmCloseBankLoan(id){
  var bl=bankLoans.find(function(x){ return x.id===id; }); if(!bl) return;
  bl.status='closed';
  save(); closeModal(); toast('Bank loan closed.','info');
  navigate('#bank-loan-detail/'+id);
}

function editBankLoan(id){
  var bl=bankLoans.find(function(x){ return x.id===id; }); if(!bl) return;
  var typeOpts=['Bank Loan','Credit Card','SSS Loan','Pag-IBIG Loan','Other'];
  var tOpts=typeOpts.map(function(o){ return '<option'+(o===bl.type?' selected':'')+'>'+o+'</option>'; }).join('');
  var intOpts='<option value="simple"'+(( bl.type2||bl.intType)==='simple'?' selected':'')+'>Simple (Flat)</option><option value="compound"'+((bl.type2||bl.intType)==='compound'?' selected':'')+'>Reducing Balance</option>';
  openModal('Edit Bank Loan',
    '<div class="form-grid">'+
    '<div class="form-group"><label>Account / Lender Name *</label><input class="form-control" id="eblName" value="'+(bl.accountName||bl.lender||'')+'"></div>'+
    '<div class="form-group"><label>Type</label><select class="form-control" id="eblType">'+tOpts+'</select></div>'+
    '<div class="form-group"><label>Principal (PHP)</label><input class="form-control" id="eblAmt" type="number" value="'+bl.principal+'"></div>'+
    '<div class="form-group"><label>Interest Rate (%)</label><input class="form-control" id="eblRate" type="number" step="0.01" value="'+bl.rate+'"></div>'+
    '<div class="form-group"><label>Term (months)</label><input class="form-control" id="eblTerm" type="number" value="'+bl.term+'"></div>'+
    '<div class="form-group"><label>Interest Type</label><select class="form-control" id="eblIntType">'+intOpts+'</select></div>'+
    '<div class="form-group"><label>Start Date</label><input class="form-control" id="eblStart" type="date" value="'+bl.startDate+'"></div>'+
    '<div class="form-group"><label>Contact Person</label><input class="form-control" id="eblContact" value="'+(bl.contact||'')+'"></div>'+
    '<div class="form-group full-width"><label>Ref/Account No.</label><input class="form-control" id="eblRef" value="'+(bl.refNo||'')+'"></div>'+
    '<div class="form-group full-width"><label>Notes</label><textarea class="form-control" id="eblNotes" rows="2">'+(bl.notes||'')+'</textarea></div>'+
    '</div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEditBankLoan(\''+id+'\')" >Save</button>'
  );
}
function saveEditBankLoan(id){
  var bl=bankLoans.find(function(x){ return x.id===id; }); if(!bl) return;
  var p=parseFloat((document.getElementById('eblAmt')||{}).value||0);
  var r=parseFloat((document.getElementById('eblRate')||{}).value||0);
  var t=parseInt((document.getElementById('eblTerm')||{}).value||0);
  var tp=(document.getElementById('eblIntType')||{}).value||'simple';
  var sd=(document.getElementById('eblStart')||{}).value||bl.startDate;
  if(!p||p<=0){ toast('Enter a valid amount.','error'); return; }
  if(!t||t<1){ toast('Enter a valid term.','error'); return; }
  var c=calcLoan(p,r,t,tp);
  var due=new Date(sd); due.setMonth(due.getMonth()+t);
  bl.accountName=((document.getElementById('eblName')||{}).value||'').trim();
  bl.lender=bl.accountName;
  bl.type=(document.getElementById('eblType')||{}).value||'Bank Loan';
  bl.contact=((document.getElementById('eblContact')||{}).value||'').trim();
  bl.refNo=((document.getElementById('eblRef')||{}).value||'').trim();
  bl.notes=((document.getElementById('eblNotes')||{}).value||'').trim();
  bl.principal=p; bl.rate=r; bl.term=t; bl.type2=tp;
  bl.startDate=sd; bl.dueDate=due.toISOString().split('T')[0];
  bl.monthlyPayment=c.monthlyPayment; bl.totalInterest=c.totalInterest;
  bl.totalAmount=c.totalAmount; bl.schedule=c.schedule;
  save(); closeModal(); toast('Bank loan updated!');
  navigate('#bank-loan-detail/'+id);
}

// ── Bank Loan Receipt (Image) ──────────────────────────────
function downloadBankReceipt(pid){
  var p=bankPayments.find(function(x){ return x.id===pid; }); if(!p) return;
  var bl=bankLoans.find(function(x){ return x.id===p.blId; }); if(!bl) return;

  var canvas=document.createElement('canvas');
  var ctx=canvas.getContext('2d');
  
  var W=420, H=750;
  var dpr=window.devicePixelRatio||2;
  canvas.width=W*dpr;
  canvas.height=H*dpr;
  ctx.scale(dpr,dpr);

  // Background
  ctx.fillStyle='#f0f2f5';
  ctx.fillRect(0,0,W,H);

  // Header Gradient (Teal/Emerald theme for Bank Loans)
  var headerH=220;
  var hGrad=ctx.createLinearGradient(0,0,W,headerH);
  hGrad.addColorStop(0,'#14b8a6');
  hGrad.addColorStop(0.5,'#0d9488');
  hGrad.addColorStop(1,'#0f766e');
  ctx.fillStyle=hGrad;
  
  // Rounded bottom corners
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.lineTo(W,headerH-25);
  ctx.quadraticCurveTo(W,headerH,W-25,headerH); ctx.lineTo(25,headerH);
  ctx.quadraticCurveTo(0,headerH,0,headerH-25); ctx.closePath(); ctx.fill();

  // Pattern overlay circles
  ctx.globalAlpha=0.06;
  ctx.fillStyle='#ffffff';
  ctx.beginPath(); ctx.arc(60,40,80,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(360,180,100,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1.0;

  // Checkmark circle
  var cx=W/2, cy=65;
  ctx.beginPath(); ctx.arc(cx,cy,30,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,24,0,Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();
  ctx.strokeStyle='#0d9488'; ctx.lineWidth=4; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(cx-10,cy+1); ctx.lineTo(cx-3,cy+9); ctx.lineTo(cx+12,cy-8); ctx.stroke();

  ctx.textAlign='center'; ctx.fillStyle='#ffffff'; ctx.font='600 18px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('Payment Successful',cx,cy+55);

  ctx.font='bold 42px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(fmt(p.amount),cx,cy+105);

  ctx.font='300 13px "Inter", "Segoe UI", sans-serif'; ctx.fillStyle='rgba(255,255,255,0.75)';
  var dateStr=new Date(p.date).toLocaleDateString('en-PH',{weekday:'short',year:'numeric',month:'long',day:'numeric'});
  ctx.fillText(dateStr,cx,cy+128);

  // WHITE CARD
  var cardX=20, cardY=headerH+15, cardW=W-40, cardH=H-cardY-70, radius=16;
  ctx.shadowColor='rgba(0,0,0,0.08)'; ctx.shadowBlur=15; ctx.shadowOffsetY=4;
  ctx.fillStyle='#ffffff';
  ctx.beginPath();
  ctx.moveTo(cardX+radius,cardY); ctx.lineTo(cardX+cardW-radius,cardY);
  ctx.quadraticCurveTo(cardX+cardW,cardY,cardX+cardW,cardY+radius); ctx.lineTo(cardX+cardW,cardY+cardH-radius);
  ctx.quadraticCurveTo(cardX+cardW,cardY+cardH,cardX+cardW-radius,cardY+cardH); ctx.lineTo(cardX+radius,cardY+cardH);
  ctx.quadraticCurveTo(cardX,cardY+cardH,cardX,cardY+cardH-radius); ctx.lineTo(cardX,cardY+radius);
  ctx.quadraticCurveTo(cardX,cardY,cardX+radius,cardY); ctx.closePath(); ctx.fill();
  ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0;

  var dx=cardX+24, dy=cardY+30;
  ctx.textAlign='left'; ctx.fillStyle='#0d9488'; ctx.font='700 11px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('TRANSACTION DETAILS',dx,dy);

  dy+=12; ctx.strokeStyle='#e8ecf1'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(dx,dy); ctx.lineTo(cardX+cardW-24,dy); ctx.stroke();

  var rh=36; dy+=8; var rightX=cardX+cardW-24;
  function drawRow(label,value,isHighlight,isBold){
    dy+=rh; ctx.textAlign='left'; ctx.fillStyle='#6b7280'; ctx.font='400 12px "Inter", "Segoe UI", sans-serif'; ctx.fillText(label,dx,dy);
    ctx.textAlign='right'; ctx.fillStyle=isHighlight?'#0d9488':'#1f2937'; ctx.font=(isBold?'bold ':'500 ')+'13px "Inter", "Segoe UI", sans-serif'; ctx.fillText(value,rightX,dy);
  }

  drawRow('Account/Lender',bl.accountName||bl.lender,false,true);
  drawRow('Transaction Type',(bl.type||'Bank Loan')+' Repayment',false,false);
  drawRow('Reference No.',p.id.slice(-8).toUpperCase(),true,true);
  drawRow('Loan Reference',bl.id.slice(-6).toUpperCase(),false,false);

  dy+=18; ctx.setLineDash([3,3]); ctx.strokeStyle='#d1d5db';
  ctx.beginPath(); ctx.moveTo(dx,dy); ctx.lineTo(rightX,dy); ctx.stroke(); ctx.setLineDash([]);

  drawRow('Amount Paid',fmt(p.amount),false,true);
  drawRow('Payment Date',fmtDate(p.date),false,false);
  if(p.note) drawRow('Remarks',p.note,false,false);

  dy+=18; ctx.setLineDash([3,3]); ctx.strokeStyle='#d1d5db';
  ctx.beginPath(); ctx.moveTo(dx,dy); ctx.lineTo(rightX,dy); ctx.stroke(); ctx.setLineDash([]);

  dy+=rh; ctx.textAlign='left'; ctx.fillStyle='#6b7280'; ctx.font='400 12px "Inter", "Segoe UI", sans-serif'; ctx.fillText('Remaining Balance',dx,dy);
  ctx.textAlign='right'; var outstanding=blOutstanding(bl);
  ctx.fillStyle=outstanding>0?'#ef4444':'#16a34a'; ctx.font='bold 15px "Inter", "Segoe UI", sans-serif'; ctx.fillText(fmt(outstanding),rightX,dy);

  dy+=rh; ctx.textAlign='left'; ctx.fillStyle='#6b7280'; ctx.font='400 12px "Inter", "Segoe UI", sans-serif'; ctx.fillText('Loan Status',dx,dy);
  ctx.textAlign='right'; var st=blStatus(bl); var stColors={active:'#0d9488',paid:'#16a34a',overdue:'#ef4444',closed:'#6b7280',pending:'#f59e0b'};
  ctx.fillStyle=stColors[st]||'#1f2937'; ctx.font='bold 13px "Inter", "Segoe UI", sans-serif'; ctx.fillText(st.toUpperCase(),rightX,dy);

  // FOOTER
  ctx.textAlign='center'; ctx.fillStyle='#9ca3af'; ctx.font='400 10px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('Powered by LoanPro \u00b7 Loan Management System',W/2,H-38);
  ctx.font='400 9px "Inter", "Segoe UI", sans-serif'; ctx.fillStyle='#b0b8c4';
  ctx.fillText('This is a system-generated receipt. No signature required.',W/2,H-22);

  // Download Action
  var link=document.createElement('a');
  link.download='BankLoan_Receipt_'+(bl.accountName||'Loan').replace(/ /g,'_')+'_'+p.id.slice(-6).toUpperCase()+'.png';
  link.href=canvas.toDataURL('image/png',1.0);
  link.click();
}

// ── Bank Loan PDF ───────────────────────────────────────────
function createBankPDFObject(blId){
  if(!window.jspdf){ toast('PDF library loading...','warning'); return null; }
  var doc=new jspdf.jsPDF({compress:true});
  var bl=bankLoans.find(function(x){ return x.id===blId; }); if(!bl) return null;

  var paid=blPaid(bl), out=blOutstanding(bl), st=blStatus(bl);
  var M={left:12,right:12};
  var pageW=210;
  var pageH=297;
  var contentW=pageW-M.left-M.right;

  // Draw page background first (page 1)
  try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}

  // ═══════════════════════════════════════════════════════
  // HEADER — Professional slate banner with teal accent line
  // ═══════════════════════════════════════════════════════
  doc.setFillColor(15, 23, 42); // slate grey background
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(20, 184, 166); // teal accent line
  doc.rect(0, 22, pageW, 1.5, 'F');
  
  // Left-aligned brand and title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('LoanPro', M.left, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('Official Bank / Credit Loan Agreement & Financial Statement', M.left, 16);

  // Right-aligned branding details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(45, 212, 191); // bright teal
  doc.text('SECURE CONTRACT', pageW - M.right, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text('E-SIGNED & BINDING', pageW - M.right, 16, { align: 'right' });

  // Reference line
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Date Generated: ' + fmtDate(new Date().toISOString()), M.left, 28);
  doc.text('Reference No: ' + bl.id.slice(-8).toUpperCase(), pageW - M.right, 28, { align: 'right' });

  // Thin divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(M.left, 31, pageW - M.right, 31);

  var sectionHead={fontSize:10,fontStyle:'bold',textColor:[255,255,255],fillColor:[51,65,85],cellPadding:3.5};
  var bodyStyle={fontSize:9.5,cellPadding:3};

  var tableBody = [
    // Section Header row
    [{ content: 'ACCOUNT INFORMATION', colSpan: 4, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' } }],
    ['Account/Lender:', bl.accountName||bl.lender||'N/A', 'Type:', bl.type||'Bank Loan'],
    ['Ref/Account No:', bl.refNo||'N/A', 'Contact Person:', bl.contact||'N/A'],
    
    // Section Header row
    [{ content: 'LOAN CONTRACT DETAILS', colSpan: 4, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' } }],
    ['Principal:', fmt(bl.principal), 'Interest Rate:', bl.rate+'% ('+(bl.type2||'simple').toUpperCase()+')'],
    ['Loan Term:', bl.term+' Months', 'Monthly Payment:', fmt(bl.monthlyPayment)],
    ['Total Repayable:', fmt(bl.totalAmount), 'Start Date:', fmtDate(bl.startDate)],
    ['Maturity/Due Date:', fmtDate(bl.dueDate), 'Notes:', bl.notes||'—']
  ];

  doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
    startY: 34,
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 3.5, textColor: [30, 41, 59], valign: 'middle' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 38 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 38 },
      3: { cellWidth: 55 }
    },
    margin: M
  });
  var rightEndY = doc.lastAutoTable.finalY;

  var curY = rightEndY + 4;

  // CO-MAKER SECTION
  if(bl.comakers && bl.comakers.length>0){
    var cmBody=[];
    bl.comakers.forEach(function(cm,i){
      cmBody.push([
        'Co-Maker '+(i+1),
        cm.name+(cm.relationship?' ('+cm.relationship+')':''),
        cm.phone||'N/A',
        cm.address||'N/A'
      ]);
    });
    doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
      startY:curY,
      head:[[{content:'CO-MAKERS',colSpan:4,styles:{fillColor:[51,65,85],textColor:[255,255,255],fontStyle:'bold'}}]],
      body:cmBody,
      theme:'grid',
      headStyles:sectionHead,
      bodyStyles:bodyStyle,
      styles:{fontSize:9.5,cellPadding:3,textColor:[30,41,59]},
      columnStyles:{0:{fontStyle:'bold',cellWidth:28,textColor:[71,85,105]},1:{cellWidth:55},2:{cellWidth:35},3:{cellWidth:68}},
      margin:M
    });
    curY=doc.lastAutoTable.finalY+4;
  }

  // LOAN AGREEMENT (Page 2)
  doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  doc.setTextColor(15,23,42);
  doc.text('LOAN AGREEMENT',105,22,{align:'center'});
  
  curY=32;
  var lenderName=bl.accountName||bl.lender||'Bank/Institution';
  var borrowerName=bl.contact||'Loan Administrator';

  var agreementRows=[
    [{content:'This Loan Agreement (the "Agreement") is entered into on '+fmtLongDate(bl.startDate)+',',styles:{cellPadding:{bottom:4}}}],
    [{content:'by and between:',styles:{cellPadding:{bottom:4}}}],
    [{content:'Borrower: '+borrowerName+', Ref Account No: '+(bl.refNo||'N/A'),styles:{cellPadding:{bottom:4}}}],
    [{content:'AND',styles:{fontStyle:'bold',halign:'center',cellPadding:{bottom:4}}}],
    [{content:'Lender: '+lenderName,styles:{cellPadding:{bottom:8}}}],
    [{content:'TERMS AND CONDITIONS',styles:{fontStyle:'bold',halign:'center',cellPadding:{bottom:6}}}]
  ];

  var terms = [
    '1. Loan Amount. The Lender agrees to provide the Borrower with a loan in the principal amount of '+fmtNoSymbol(bl.principal)+' PESOS, funded through the Lender\'s bank credit facility/credit card account.',
    '2. Term. The loan shall be payable over a period of '+bl.term+' months, commencing on '+fmtLongDate(bl.startDate)+' and maturing on '+fmtLongDate(bl.dueDate)+'.',
    '3. Interest. The Borrower agrees to pay interest on the loan at the rate of '+numberToWords(bl.rate)+' percent ('+bl.rate+'%) of the monthly principal due.',
    '4. Repayment. Payments shall be made on or before each due date as set forth in the Amortization Schedule attached to this Agreement.',
    '5. Late Payment. Any late payments may incur additional penalties, fees, or interest as determined by the Lender.'
  ];
  if (bl.type === 'Credit Card') {
    terms.push('6. Collateral (Purchased Items). Any item (including but not limited to mobile phones, gadgets, or devices) purchased using this credit card facility shall serve as collateral. If the loan remains unpaid for two (2) months, the purchased item will be retrieved or collected by the Lender, and shall only be returned once the outstanding loan or payment has been fully settled and paid.');
  }
  var nextNum = terms.length + 1;
  terms.push(nextNum + '. Joint Liability. If a Co-Maker is listed in this Agreement, both Borrower and Co-Maker shall be jointly and severally liable for repayment.');
  nextNum++;
  terms.push(nextNum + '. Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the Republic of the Philippines.');

  terms.forEach(function(term, idx) {
    var isLast = idx === terms.length - 1;
    agreementRows.push([{
      content: term,
      styles: { cellPadding: { bottom: isLast ? 6 : 3 } }
    }]);
  });

  agreementRows.push([{content:'IN WITNESS WHEREOF, the parties hereto have executed this Loan Agreement on the day and year first above written.',styles:{cellPadding:{bottom:4}}}]);

  doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
    startY:curY,
    body:agreementRows,
    theme:'plain',
    styles:{
      fontSize:12,
      cellPadding:{top:1,right:0,bottom:1,left:0},
      overflow:'linebreak',
      valign:'top',
      textColor:[30,41,59]
    },
    margin:M,
    didDrawCell:function(data){
      if(data.cell.text && data.cell.text.join(' ').indexOf('TERMS AND CONDITIONS')!==-1){
        var d=data.doc;
        var textWidth=d.getTextWidth('TERMS AND CONDITIONS');
        var x=data.cell.x+(data.cell.width-textWidth)/2;
        var y=data.cell.y+data.cell.height-1.5;
        d.setDrawColor(30,41,59);
        d.setLineWidth(0.4);
        d.line(x,y,x+textWidth,y);
      }
    }
  });
  curY=doc.lastAutoTable.finalY+4;

  var agreementSigY=Math.max(curY+18,pageH-38);
  if(agreementSigY>pageH-24){
    doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
    agreementSigY=60;
  }
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.5);
  doc.line(M.left+8,agreementSigY,M.left+78,agreementSigY);
  doc.line(pageW-M.right-78,agreementSigY,pageW-M.right-8,agreementSigY);
  doc.setFont('helvetica','bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Borrower Signature',M.left+43,agreementSigY+5.5,{align:'center'});
  doc.text('Lender / Institution Signature',pageW-M.right-43,agreementSigY+5.5,{align:'center'});
  doc.setFont('helvetica','bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(borrowerName,M.left+43,agreementSigY+11,{align:'center'});
  doc.text(lenderName,pageW-M.right-43,agreementSigY+11,{align:'center'});

  // Page 3: Statement + Amortization Schedule
  doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
  curY=18;
  var lPay=bankPayments.filter(function(p){ return p.blId===blId; }).sort(function(a,b){ return a.date.localeCompare(b.date); });
  if(lPay.length>0){
    doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
      startY:curY,
      head:[
        [{ content: 'ACCOUNT STATEMENT', colSpan: 3, styles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } }],
        ['TOTAL PAID', 'OUTSTANDING BALANCE', 'CURRENT STATUS']
      ],
      body:[[fmt(paid),fmt(out),blStatus(bl).toUpperCase()]],
      theme:'grid',
      headStyles:{ fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles:{fontSize:8.5,cellPadding:3,fontStyle:'bold',halign:'center'},
      columnStyles:{
        0:{textColor:[16,185,129]},
        1:{textColor:[244,63,94]},
        2:{textColor:[30,41,59]}
      },
      margin:M
    });
    curY=doc.lastAutoTable.finalY+4;
  }

  var tableBody=(bl.schedule||[]).map(function(r){
    return [r.period,fmt(r.payment),fmt(r.principal),fmt(r.interest),fmt(r.balance)];
  });

  doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
    startY:curY,
    head:[['#','Payment','Principal','Interest','Balance']],
    body:tableBody,
    theme:'striped',
    headStyles:{fillColor:[20,184,166],fontSize:10,fontStyle:'bold',cellPadding:3},
    styles:{fontSize:9.5,cellPadding:2.5},
    alternateRowStyles:{fillColor:[248,250,252]},
    margin:M
  });
  curY=doc.lastAutoTable.finalY+4;

  if(lPay.length>0){
    if(curY>250){ doc.addPage(); curY=15; }
    var payBody=lPay.map(function(p){ return [fmtDate(p.date),fmt(p.amount),p.note||'—']; });
    doc.autoTable({
    didAddPage: function(data) { try { data.doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {} },
      startY:curY,
      head:[['DATE','AMOUNT PAID','REMARKS']],
      body:payBody,
      theme:'grid',
      headStyles:{fillColor:[71,85,105],fontSize:10,fontStyle:'bold',halign:'left',cellPadding:3},
      styles:{fontSize:9.5,cellPadding:2.5},
      margin:M
    });
    curY=doc.lastAutoTable.finalY+4;
  }

  // Signatures on Page 3
  var sigWidth=55;
  var sigGap=10;
  var sigCount=2+((bl.comakers && bl.comakers.length)||0);
  var sigRows=sigCount<=3?1:2;
  var sigBlockHeight=sigRows*18;
  var agreementText="Agreement: The Borrower hereby acknowledges receipt of the full principal amount and agrees to the terms and repayment schedule outlined above. In case of default, the Lender reserves the right to take necessary legal action to recover the outstanding balance plus applicable penalties.";
  doc.setFontSize(7);
  var agreementLines=doc.splitTextToSize(agreementText,contentW);
  var agreementHeight=agreementLines.length*3.5+6;
  var footerTotalHeight=agreementHeight+sigBlockHeight+8;

  var lastPage=doc.internal.getNumberOfPages();
  doc.setPage(lastPage);
  var footerStartY;

  if(lastPage===1){
    var bottomY=pageH-10;
    footerStartY=bottomY-footerTotalHeight;
    if(curY>footerStartY){
      if(curY+footerTotalHeight>pageH-10){
        doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
        footerStartY=20;
      } else {
        footerStartY=curY+4;
      }
    }
  } else {
    if(curY+footerTotalHeight>pageH-15){
      doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
      footerStartY=20;
    } else {
      footerStartY=curY+10;
    }
  }

  doc.setDrawColor(203,213,225);
  doc.setLineWidth(0.3);
  doc.line(M.left,footerStartY-3,pageW-M.right,footerStartY-3);

  doc.setFontSize(7);
  doc.setFont('helvetica','normal');
  doc.setTextColor(100,116,139);
  doc.text(agreementLines,M.left,footerStartY);
  var sigY=footerStartY+agreementHeight;

  doc.setDrawColor(100,116,139);
  doc.setLineWidth(0.4);

  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.5);

  if(sigCount<=3){
    var totalSigW=sigCount*sigWidth+(sigCount-1)*sigGap;
    var sx=(pageW-totalSigW)/2;
    if(sx<M.left) sx=M.left;

    doc.line(sx,sigY,sx+sigWidth,sigY);
    doc.setFontSize(9.5);
    doc.setFont('helvetica','bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Borrower Signature',sx+sigWidth/2,sigY+5.5,{align:'center'});
    sx+=sigWidth+sigGap;

    if(bl.comakers && bl.comakers.length>0){
      bl.comakers.forEach(function(cm,i){
        doc.line(sx,sigY,sx+sigWidth,sigY);
        doc.setFontSize(9.5);
        doc.setFont('helvetica','bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Co-Maker '+(i+1)+': '+cm.name,sx+sigWidth/2,sigY+5.5,{align:'center'});
        sx+=sigWidth+sigGap;
      });
    }

    doc.line(sx,sigY,sx+sigWidth,sigY);
    doc.setFontSize(9.5);
    doc.setFont('helvetica','bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Lender / Institution',sx+sigWidth/2,sigY+5.5,{align:'center'});
  } else {
    doc.line(M.left,sigY,M.left+sigWidth,sigY);
    doc.setFontSize(9.5);
    doc.setFont('helvetica','bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Borrower Signature',M.left+sigWidth/2,sigY+5.5,{align:'center'});
    doc.line(pageW-M.right-sigWidth,sigY,pageW-M.right,sigY);
    doc.text('Lender / Institution',pageW-M.right-sigWidth/2,sigY+5.5,{align:'center'});

    sigY+=18;
    if(bl.comakers && bl.comakers.length>0){
      var cmTotalW=bl.comakers.length*sigWidth+(bl.comakers.length-1)*sigGap;
      var cmx=(pageW-cmTotalW)/2;
      if(cmx<M.left) cmx=M.left;
      bl.comakers.forEach(function(cm,i){
        doc.line(cmx,sigY,cmx+sigWidth,sigY);
        doc.setFontSize(9.5);
        doc.setFont('helvetica','bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Co-Maker '+(i+1)+': '+cm.name,cmx+sigWidth/2,sigY+5.5,{align:'center'});
        cmx+=sigWidth+sigGap;
      });
    }
  }

  // ─── FOOTER BAR + SIGNATURE STRIP ON EVERY PAGE ───────────
  var totalPages=doc.internal.getNumberOfPages();
  // Build signer list once
  var pageSigners=[{label:borrowerName,role:borrowerName}];
  if(bl.comakers && bl.comakers.length>0){
    bl.comakers.forEach(function(cm,i){
      pageSigners.push({label:cm.name,role:'Co-Maker '+(i+1)});
    });
  }
  pageSigners.push({label:lenderName,role:'Lender'});

  for(var pi=1;pi<=totalPages;pi++){
    doc.setPage(pi);

    // Signature strip (compact, 20mm above footer)
    var sigStripTop=pageH-26;
    doc.setDrawColor(203,213,225);
    doc.setLineWidth(0.25);
    doc.line(M.left,sigStripTop,pageW-M.right,sigStripTop);

    var slotW=contentW/pageSigners.length;
    pageSigners.forEach(function(signer,idx){
      var sx=M.left+idx*slotW;
      var mx=sx+slotW/2;
      var lineY=sigStripTop+7;
      doc.setDrawColor(51,65,85);
      doc.setLineWidth(0.5);
      doc.line(sx+3,lineY,sx+slotW-3,lineY);
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica','bold');
      doc.setTextColor(15, 23, 42);
      doc.text(signer.role,mx,lineY+5.5,{align:'center'});
      
      doc.setFont('helvetica','bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      var signerLabel=signer.label.length>22?signer.label.slice(0,20)+'..':signer.label;
      doc.text(signerLabel,mx,lineY+11,{align:'center'});
    });

    // Footer bar
    doc.setFillColor(248,250,252);
    doc.rect(0,pageH-6,pageW,6,'F');
    doc.setFontSize(5.5);
    doc.setTextColor(148,163,184);
    doc.text('This is a system-generated document. LoanPro Loan Management System. Page '+pi+' of '+totalPages,105,pageH-2.5,{align:'center'});
  }

  // ═══════════════════════════════════════════════════════
  // ATTACHMENTS APPENDIX
  // ═══════════════════════════════════════════════════════
  var hasAttachments=false;
  if(bl.attachments&&(bl.attachments.idFront||bl.attachments.idBack)) hasAttachments=true;
  if(bl.comakers&&bl.comakers.some(function(cm){ return cm.idFront||cm.idBack; })) hasAttachments=true;

  if(hasAttachments){
    doc.addPage();
    try { doc.addImage(PDF_PAGE_BG_B64, "JPEG", -5, -5, pageW+10, pageH+10); } catch(e) {}
    var atY=20;
    doc.setFillColor(13,148,136);
    doc.rect(0,0,pageW,12,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(10);
    doc.setFont('helvetica','bold');
    doc.text('APPENDIX: ID ATTACHMENTS',M.left,8);

    function addImageBlock(title,front,back){
      if(!front&&!back) return;
      if(atY>pageH-65){ doc.addPage(); atY=20; }
      doc.setTextColor(15,23,42);
      doc.setFontSize(11);
      doc.setFont('helvetica','bold');
      doc.text(title,M.left,atY);
      atY+=6;
      var imgW=80, imgH=50, startX=M.left;
      if(front){
        doc.setFontSize(8); doc.setTextColor(100,116,139);
        doc.text('Front ID',startX,atY);
        try{ doc.addImage(front,'JPEG',startX,atY+2,imgW,imgH); }catch(e){}
      }
      if(back){
        var bx=front?startX+imgW+10:startX;
        doc.setFontSize(8); doc.setTextColor(100,116,139);
        doc.text('Back ID',bx,atY);
        try{ doc.addImage(back,'JPEG',bx,atY+2,imgW,imgH); }catch(e){}
      }
      atY+=imgH+18;
    }

    // Borrower ID
    var borrowerLabel='Borrower: '+borrowerName;
    addImageBlock(borrowerLabel,bl.attachments&&bl.attachments.idFront,bl.attachments&&bl.attachments.idBack);

    // Co-maker IDs
    if(bl.comakers&&bl.comakers.length>0){
      bl.comakers.forEach(function(cm,i){
        addImageBlock('Co-Maker '+(i+1)+': '+cm.name,cm.idFront,cm.idBack);
      });
    }

    // Re-apply footer/signature to appendix pages
    var appendPages=doc.internal.getNumberOfPages();
    for(var ap=totalPages+1;ap<=appendPages;ap++){
      doc.setPage(ap);
      // Signature strip
      var asSigTop=pageH-26;
      doc.setDrawColor(203,213,225); doc.setLineWidth(0.25);
      doc.line(M.left,asSigTop,pageW-M.right,asSigTop);
      var asSlotW=contentW/pageSigners.length;
      pageSigners.forEach(function(signer,idx){
        var sx=M.left+idx*asSlotW, mx=sx+asSlotW/2, lineY=asSigTop+9;
        doc.setDrawColor(100,116,139); doc.setLineWidth(0.35);
        doc.line(sx+3,lineY,sx+asSlotW-3,lineY);
        doc.setFontSize(5.5); doc.setFont('helvetica','bold'); doc.setTextColor(71,85,105);
        doc.text(signer.role,mx,lineY+4,{align:'center'});
        doc.setFont('helvetica','normal'); doc.setFontSize(5); doc.setTextColor(100,116,139);
        var sl=signer.label.length>22?signer.label.slice(0,20)+'..':signer.label;
        doc.text(sl,mx,lineY+8,{align:'center'});
      });
      doc.setFillColor(248,250,252); doc.rect(0,pageH-6,pageW,6,'F');
      doc.setFontSize(5.5); doc.setTextColor(148,163,184);
      doc.text('This is a system-generated document. Appendix — ID Attachments. Page '+ap+' of '+appendPages,105,pageH-2.5,{align:'center'});
    }
  }

  return doc;
}

function generateBankLoanPDF(blId){
  var doc=createBankPDFObject(blId);
  if(!doc) return;
  var bl=bankLoans.find(function(x){ return x.id===blId; });
  var fileName='BankLoan_'+(bl.accountName||'Loan').replace(/ /g,'_')+'_'+bl.id.slice(-6).toUpperCase()+'.pdf';
  if(/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)){
    window.open(doc.output('bloburl'),'_blank');
  } else {
    doc.save(fileName);
  }
  toast('PDF downloaded!','success');
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

document.getElementById('notifBtn').addEventListener('click', function(){
  location.hash='#notifications';
});

// ── Bootstrap ──────────────────────────────────────────────
seedDemo();
navigate(location.hash||'#dashboard');
