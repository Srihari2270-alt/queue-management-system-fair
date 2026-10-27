import {Component,inject,OnDestroy,OnInit,signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ApiService,Branch,Snapshot,Token,User,Report} from './api.service';
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit,OnDestroy {
 api=inject(ApiService);user=signal<User|null>(null);page=signal('home');tab=signal('Overview');busy=signal(false);loading=signal(true);connected=signal(false);notice=signal('');error=signal('');branches=signal<Branch[]>([]);services:Record<string,string[]>={};data=signal<Snapshot|null>(null);report=signal<Report|null>(null);
 selected='SBT';service='';search='';login={username:'',password:''};register={name:'',phone:'',username:'',password:''};walkin={name:'',phone:'',priority:false,type:'Walk-in'};callback={name:'',phone:'',message:''};issued=signal<Token|null>(null);timer?:ReturnType<typeof setInterval>;toastTimer?:ReturnType<typeof setTimeout>;private refreshing=false;
 customerTabs=['Overview','Get token & track','Live board','Branches','Front desk'];staffTabs=['Dashboard','Issue token','Live queue','Counters','Callbacks','Reports'];
 get branch(){return this.branches().find(b=>b.id===this.selected);}
 get isStaff(){return this.user()?.role!=='customer';}
 get tabs(){return this.isStaff?this.staffTabs:this.customerTabs;}
 get active(){return this.data()?.tokens.filter(t=>t.st==='Serving')||[];}
 get waiting(){return (this.data()?.tokens.filter(t=>t.st==='Waiting')||[]).sort((a,b)=>b.prio-a.prio||a.ts-b.ts);}
 get summary(){return this.data()?.summaries.find(x=>x.id===this.selected);}
 get filtered(){return [...(this.data()?.tokens||[])].sort((a,b)=>{const rank:Record<string,number>={Serving:0,Waiting:1};return (rank[a.st]??2)-(rank[b.st]??2)||b.prio-a.prio||a.ts-b.ts;}).filter(t=>[t.id,t.name||'',t.svc,t.st].join(' ').toLowerCase().includes(this.search.toLowerCase()));}
 async ngOnInit(){window.addEventListener('hashchange',this.route);this.route();try{this.user.set((await this.api.get<{user:User}>('/auth/me')).user);await this.setup();}catch{}finally{this.loading.set(false);}this.timer=setInterval(()=>{if(this.user()&&document.visibilityState==='visible')void this.refresh();},5000);}
 ngOnDestroy(){window.removeEventListener('hashchange',this.route);clearInterval(this.timer);clearTimeout(this.toastTimer);}
 route=()=>{this.page.set(location.hash.startsWith('#/admin')?'admin':location.hash.startsWith('#/user')?'user':'home');this.error.set('');};
 async setup(){const result=await this.api.get<{branches:Branch[];services:Record<string,string[]>}>('/branches');this.branches.set(result.branches);this.services=result.services;this.service=this.services[this.branch?.t||'Bank'][0];this.tab.set(this.isStaff?'Dashboard':'Overview');this.callback.name=this.user()?.name||'';this.callback.phone=this.user()?.phone||'';await this.refresh();}
 async refresh(){if(this.refreshing||!this.user())return;this.refreshing=true;const branch=this.selected;try{const result=await this.api.get<Snapshot>('/queue?branch='+branch);if(branch===this.selected){this.data.set(result);this.connected.set(true);}if(this.tab()==='Reports'){const r=await this.api.get<Report>('/reports?branch='+branch);if(branch===this.selected)this.report.set(r);}}catch(e:any){this.connected.set(false);if(e.status===401){this.user.set(null);this.error.set('Session expired. Please sign in again.');}}finally{this.refreshing=false;}}
 async run(fn:()=>Promise<void>){if(this.busy())return;this.busy.set(true);this.error.set('');try{await fn();}catch(e:any){this.error.set(e.error?.message||'Cannot reach the server. Check the backend connection.');}finally{this.busy.set(false);}}
 async signIn(){await this.run(async()=>{const {user}=await this.api.post<{user:User}>('/auth/login',this.login);this.user.set(user);this.login={username:'',password:''};location.hash=user.role==='customer'?'#/user':'#/admin';await this.setup();this.toast('Welcome, '+user.name+'.');});}
 async signUp(){await this.run(async()=>{const {user}=await this.api.post<{user:User}>('/auth/register',this.register);this.user.set(user);this.register={name:'',phone:'',username:'',password:''};location.hash='#/user';await this.setup();this.toast('Account created. You are signed in.');});}
 async signOut(){await this.run(async()=>{await this.api.post('/auth/logout');this.user.set(null);this.data.set(null);this.report.set(null);this.toast('Signed out.');});}
 async chooseBranch(){this.data.set(null);this.report.set(null);this.service=this.services[this.branch?.t||'Bank'][0];this.issued.set(null);await this.refresh();}
 changeTab(t:string){this.tab.set(t);this.error.set('');if(t==='Reports')void this.refresh();}
 viewBranch(id:string){this.selected=id;this.tab.set('Overview');void this.chooseBranch();window.scrollTo({top:0,behavior:'smooth'});}
 toast(message:string){this.notice.set(message);clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.notice.set(''),4000);}
 async book(){await this.run(async()=>{const {token}=await this.api.post<{token:Token}>('/tokens',{branch:this.selected,service:this.service,...(this.isStaff?this.walkin:{})});this.issued.set(token);this.walkin={name:'',phone:'',priority:false,type:'Walk-in'};await this.refresh();this.toast('Token '+token.id+' generated.');});}
 async cancel(t:Token){if(!confirm('Cancel token '+t.id+'?'))return;await this.run(async()=>{await this.api.patch('/tokens/'+t.id+'/cancel');await this.refresh();this.toast('Token cancelled.');});}
 async callNext(counterId?:string,tokenId?:string){await this.run(async()=>{const {token}=await this.api.post<{token:Token}>('/queue/call-next',{branch:this.selected,counterId,tokenId});await this.refresh();this.toast(token.id+' called.');});}
 async status(id:string,status:string){await this.run(async()=>{await this.api.patch('/tokens/'+id+'/status',{status});await this.refresh();this.toast(id+' marked '+status.toLowerCase()+'.');});}
 async toggle(id:string,open:boolean){await this.run(async()=>{await this.api.patch('/counters/'+id,{open});await this.refresh();});}
 async sendCallback(){await this.run(async()=>{await this.api.post('/callbacks',{branch:this.selected,...this.callback});this.callback.message='';await this.refresh();this.toast('Callback request saved for the front desk.');});}
 async completeCallback(id:string){await this.run(async()=>{await this.api.patch('/callbacks/'+id);await this.refresh();this.toast('Callback marked complete.');});}
 async reset(){if(!confirm('Reset the demo queue for ALL branches? Customer accounts will be preserved.'))return;await this.run(async()=>{await this.api.post('/admin/reset',{confirm:'RESET DEMO'});await this.refresh();this.toast('Demo queues reset. Accounts preserved.');});}
 branchName(id:string){const b=this.branches().find(x=>x.id===id);return b?b.n+' - '+b.loc:id;}
 counterNo(id:string|null){return this.data()?.counters.find(c=>c.id===id)?.no||'-';}
 get completed(){return this.data()?.tokens.filter(t=>t.st==='Completed').length||0;}
 get pendingCallbacks(){return this.data()?.callbacks.filter(c=>!c.done).length||0;}
}
