import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {API_BASE} from './deployment';
export interface User {id:string;username:string;name:string;phone:string;role:'customer'|'staff'|'admin'}
export interface Branch {id:string;n:string;loc:string;t:string;ph:string;avg:number}
export interface Token {id:string;b:string;name?:string;ph?:string;svc:string;type:string;prio:number;st:string;ts:number;c:string|null;eta:number;position?:number}
export interface Counter {id:string;b:string;no:number;name:string;staff:string;open:boolean;serving:string|null}
export interface Callback {id:string;b:string;name:string;ph:string;why:string;ts:number;done:boolean}
export interface Snapshot {revision:number;tokens:Token[];myTokens:Token[];counters:Counter[];callbacks:Callback[];activity:{b:string;m:string;ts:number}[];summaries:{id:string;waiting:number;eta:number;open:number}[]}
export interface Report {date:string;tokens:Token[];issued:number;completed:number;skipped:number}
@Injectable({providedIn:'root'})
export class ApiService {
 private http=inject(HttpClient);
 private token=API_BASE?sessionStorage.getItem('qflow_session_token'):null;
 private options(){return this.token?{headers:{Authorization:'Bearer '+this.token}}:{};}
 get<T>(path:string){return firstValueFrom(this.http.get<T>(API_BASE+'/api'+path,this.options()));}
 async post<T>(path:string,body:unknown={}){
  const result=await firstValueFrom(this.http.post<T>(API_BASE+'/api'+path,body,this.options()));
  if(API_BASE){const token=(result as {sessionToken?:string})?.sessionToken;if(token){this.token=token;sessionStorage.setItem('qflow_session_token',token);}if(path==='/auth/logout'){this.token=null;sessionStorage.removeItem('qflow_session_token');}}
  return result;
 }
 patch<T>(path:string,body:unknown={}){return firstValueFrom(this.http.patch<T>(API_BASE+'/api'+path,body,this.options()));}
 async exportReport(branch:string){
  const response=await firstValueFrom(this.http.get(API_BASE+'/api/reports/export?branch='+encodeURIComponent(branch),{...this.options(),responseType:'blob'}));
  const url=URL.createObjectURL(response);const a=document.createElement('a');a.href=url;a.download='qflow-'+branch+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
