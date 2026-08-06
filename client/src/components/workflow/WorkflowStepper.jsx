import {Check} from 'lucide-react';
const stages=[
  ['Sales creates ITF',['DRAFT','ITF_CREATED']],
  ['Estimation creates JIF',['SENT_TO_ESTIMATION','UNDER_ESTIMATION_REVIEW','CLARIFICATION_REQUIRED','CLARIFICATION_RECEIVED','JIF_IN_PROGRESS','JIF_COMPLETED']],
  ['Design prepares DWS',['SENT_TO_DESIGN','UNDER_DESIGN_REVIEW','DESIGN_QUERY_RAISED','WAITING_FOR_DESIGN_CLARIFICATION','DESIGN_IN_PROGRESS','DWS_COMPLETED']],
  ['Costing & Proposals',['RETURNED_TO_ESTIMATION','COSTING_IN_PROGRESS','COSTING_COMPLETED','COMMERCIAL_PROPOSAL_PREPARED','TECHNICAL_PROPOSAL_PREPARED','PROPOSAL_PACKAGE_COMPLETED']],
  ['GM Review & Approval',['SUBMITTED_TO_GM','UNDER_GM_REVIEW','GM_REVISION_REQUIRED','GM_APPROVED']],
  ['Forwarded to Sales',['FORWARDED_TO_SALES','READY_FOR_CLIENT_SUBMISSION']],
  ['Sales Submits to Client',['SUBMITTED_TO_CLIENT','CLIENT_REVIEWING']],
  ['Follow-up & Negotiation',['FOLLOW_UP_REQUIRED','UNDER_NEGOTIATION','REVISED_PROPOSAL_REQUIRED','ON_HOLD']],
  ['Won / Lost',['WON','LOST','CANCELLED','ARCHIVED']]
];
export default function WorkflowStepper({status}){
  const current=Math.max(0,stages.findIndex(x=>x[1].includes(status)));
  return <div className="card overflow-x-auto p-4"><div className="flex min-w-[900px] items-center">{stages.map((s,i)=><div key={s[0]} className="flex flex-1 items-center last:flex-none"><div className="flex flex-col items-center"><div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${i<current?'bg-emerald-600 text-white':i===current?'bg-brand-600 text-white':'bg-slate-200 text-slate-500'}`}>{i<current?<Check size={16}/>:i+1}</div><span className={`mt-2 whitespace-nowrap text-xs font-medium ${i===current?'text-brand-700':'text-slate-500'}`}>{s[0]}</span></div>{i<stages.length-1&&<div className={`mx-2 h-0.5 flex-1 ${i<current?'bg-emerald-500':'bg-slate-200'}`}/>}</div>)}</div></div>;
}

