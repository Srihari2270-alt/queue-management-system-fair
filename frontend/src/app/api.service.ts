import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
 get<T>(path:string){return firstValueFrom(this.http.get<T>('/api'+path));}
 post<T>(path:string,body:unknown={}){return firstValueFrom(this.http.post<T>('/api'+path,body));}
 patch<T>(path:string,body:unknown={}){return firstValueFrom(this.http.patch<T>('/api'+path,body));}
}
