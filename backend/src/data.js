export const branches = [
{id:"SBT",n:"State Bank of India",loc:"T. Nagar",t:"Bank",ph:"044 0000 0101",avg:7},
{id:"HAN",n:"HDFC Bank",loc:"Anna Nagar",t:"Bank",ph:"044 0000 0102",avg:6},
{id:"INM",n:"Indian Bank",loc:"Mylapore",t:"Bank",ph:"044 0000 0103",avg:7},
{id:"ICA",n:"ICICI Bank",loc:"Adyar",t:"Bank",ph:"044 0000 0104",avg:6},
{id:"CBV",n:"Canara Bank",loc:"Velachery",t:"Bank",ph:"044 0000 0105",avg:8},
{id:"APG",n:"Apollo Hospitals",loc:"Greams Road",t:"Hospital",ph:"044 0000 0201",avg:12},
{id:"MIM",n:"MIOT International",loc:"Manapakkam",t:"Hospital",ph:"044 0000 0202",avg:11},
{id:"FMA",n:"Fortis Malar Hospital",loc:"Adyar",t:"Hospital",ph:"044 0000 0203",avg:10},
{id:"RGP",n:"Rajiv Gandhi Govt. General Hospital",loc:"Park Town",t:"Hospital",ph:"044 0000 0204",avg:14},
{id:"KAV",n:"Kauvery Hospital",loc:"Alwarpet",t:"Hospital",ph:"044 0000 0205",avg:10}];
export const services = {Bank:["Cash deposit / withdrawal","Account services","Loans & enquiries"],Hospital:["OP registration","Doctor consultation","Billing & pharmacy"]};
export function initialState() {
 const t=[], c=[], seq={}; let k=0;
 for (const b of branches) {
  seq[b.id]=100;
  services[b.t].forEach((name,i)=>c.push({id:b.id+'-C'+(i+1),b:b.id,no:i+1,name,staff:['Ananya R.','Rahul M.','Sanjay K.'][i],open:i<2,serving:null}));
  for(const [st,prio,minutes] of [['Completed',0,40],['Serving',0,15],['Waiting',0,10],['Waiting',1,6],['Waiting',0,3]]) {
   const item={id:b.id+'-'+seq[b.id]++,b:b.id,name:['R. Kumar','Meena S.','Arun P.','Lakshmi R.'][k++%4],ph:'',svc:services[b.t][k%3],type:'Walk-in',prio,st,ts:Date.now()-minutes*60000,c:null};
   if(st==='Serving'){item.c=b.id+'-C1';c.find(x=>x.id===item.c).serving=item.id;} t.push(item);
  }
 }
 return {t,c,seq,calls:[],act:[]};
}
