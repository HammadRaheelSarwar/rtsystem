import {useEffect,useState} from 'react';import {useParams,useNavigate} from 'react-router-dom';import {useForm} from 'react-hook-form';import {useQuery,useQueryClient} from '@tanstack/react-query';import {api,messageOf} from '../../api/client';import {PageHeader,Spinner,Field,Confirm} from '../../components/common/UI';import {ArrowLeft,Save,Send,Lock,CheckCircle2} from 'lucide-react';import {useToast} from '../../context/ToastContext';import {useAuth} from '../../context/AuthContext';import WorkflowStepper from '../../components/workflow/WorkflowStepper';

const reqFields=[['projectDescription','Project description','textarea'],['quantityOfBuildings','Quantity of buildings','number'],['buildingUsage','Building usage'],['approximateWidth','Approximate width','number'],['approximateLength','Approximate length','number'],['approximateHeight','Approximate height','number'],['area','Area','number'],['unitOfMeasurement','Unit of measurement'],['siteConditions','Site conditions','textarea'],['clientSpecifications','Client specifications','textarea'],['specialRequirements','Special requirements','textarea'],['remarks','Remarks','textarea']];

export default function ITFPage(){
  const {id}=useParams(),navigate=useNavigate(),toast=useToast(),qc=useQueryClient(),{hasRole}=useAuth(),[confirm,setConfirm]=useState(false);
  const canEdit = hasRole('ADMIN','SALES');
  const {register,handleSubmit,reset,getValues,formState:{isSubmitting}}=useForm();
  
  const {data,isLoading}=useQuery({
    queryKey:['itf-page',id],
    queryFn:async()=>{
      const [inq,itf]=await Promise.all([api.get(`/inquiries/${id}`),api.get(`/inquiries/${id}/itf`)]);
      return {inquiry:inq.data.data,itf:itf.data.data};
    }
  });

  useEffect(()=>{
    if(data){
      reset(data.itf||{
        clientInfo:{client:data.inquiry.client?._id,projectName:data.inquiry.projectName,projectLocation:data.inquiry.projectLocation,consultant:data.inquiry.consultant},
        inquiryInfo:{inquiryType:data.inquiry.inquiryType,urgency:data.inquiry.urgency,proposalSubmissionDate:data.inquiry.proposalSubmissionDate?.slice(0,10),quoteBasis:data.inquiry.quoteBasis},
        requirements:{projectDescription:data.inquiry.projectDescription}
      });
    }
  },[data,reset]);

  const save=async v=>{
    if(!canEdit) return;
    try{
      data.itf?await api.put(`/inquiries/${id}/itf`,v):await api.post(`/inquiries/${id}/itf`,v);
      toast('ITF draft saved');
      await qc.invalidateQueries({queryKey:['itf-page',id]});
    }catch(e){toast(messageOf(e),'error')}
  };

  const submit=async()=>{
    if(!canEdit) return;
    try{
      await save(getValues());
      await api.post(`/inquiries/${id}/itf/submit`);
      toast('ITF submitted to Estimation');
      navigate(`/inquiries/${id}`);
    }catch(e){toast(messageOf(e),'error')}
  };

  if(isLoading)return <Spinner/>;

  const isSubmitted = data.itf?.status==='SUBMITTED';

  return <>
    <PageHeader 
      title="Inquiry Taking Form" 
      description={`${data.inquiry.inquiryNumber} • Sales origin document`} 
      actions={<button className="btn-secondary" onClick={()=>navigate(`/inquiries/${id}`)}><ArrowLeft size={17}/>Overview</button>}
    />
    <WorkflowStepper status={data.inquiry.currentStatus}/>
    
    {!canEdit && (
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-4 text-sm font-medium text-amber-800 border border-amber-200">
        <Lock size={18}/> Read-only view for {data.inquiry.currentDepartment?.name||'this department'}. ITF creation and submission is managed by Sales.
      </div>
    )}

    {isSubmitted && (
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
        <CheckCircle2 size={18}/> ITF has been submitted to Estimation.
      </div>
    )}

    <form onSubmit={handleSubmit(save)} className="mt-5 space-y-5">
      <Section title="Client & project information">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Client"><input disabled className="field bg-slate-50" value={data.inquiry.client?.companyName||''}/></Field>
          {[
            ['consultant','Consultant'],['contactPerson','Contact person'],['phone','Phone'],
            ['email','Email'],['projectName','Project name'],['projectLocation','Project location']
          ].map(([n,l])=>(
            <Field key={n} label={l}>
              <input disabled={!canEdit || isSubmitted} className={`field ${!canEdit || isSubmitted ? 'bg-slate-50':''}`} {...register(`clientInfo.${n}`)}/>
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Inquiry information">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            ['inquiryType','Inquiry type'],['inquirySource','Inquiry source'],['urgency','Urgency'],
            ['proposalSubmissionDate','Proposal submission date','date'],['quoteBasis','Quote basis'],['requiredCompletionDate','Required completion date','date']
          ].map(([n,l,t])=>(
            <Field key={n} label={l}>
              <input disabled={!canEdit || isSubmitted} className={`field ${!canEdit || isSubmitted ? 'bg-slate-50':''}`} type={t||'text'} {...register(`inquiryInfo.${n}`)}/>
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Initial requirements">
        <div className="grid gap-4 md:grid-cols-2">
          {reqFields.map(([n,l,t])=>(
            <Field key={n} label={l}>
              {t==='textarea'? (
                <textarea disabled={!canEdit || isSubmitted} className={`field min-h-24 ${!canEdit || isSubmitted ? 'bg-slate-50':''}`} {...register(`requirements.${n}`)}/>
              ) : (
                <input disabled={!canEdit || isSubmitted} className={`field ${!canEdit || isSubmitted ? 'bg-slate-50':''}`} type={t||'text'} {...register(`requirements.${n}`)}/>
              )}
            </Field>
          ))}
        </div>
      </Section>

      {canEdit && !isSubmitted && (
        <div className="no-print flex justify-end gap-3">
          <button className="btn-secondary" disabled={isSubmitting}><Save size={17}/>Save draft</button>
          <button type="button" className="btn-primary" onClick={()=>setConfirm(true)}><Send size={17}/>Submit to Estimation</button>
        </div>
      )}
    </form>

    <Confirm 
      open={confirm} 
      title="Submit ITF to Estimation?" 
      message="Sales editing will be locked while Estimation reviews this inquiry." 
      onCancel={()=>setConfirm(false)} 
      onConfirm={submit}
    />
  </>;
}

function Section({title,children}){return <section className="card p-5 sm:p-6"><h2 className="mb-5 text-lg font-bold text-navy-900">{title}</h2>{children}</section>}

