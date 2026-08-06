import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, messageOf } from '../api/client';
import { Empty, Field, PageHeader, Spinner } from '../components/common/UI';
import StatusBadge from '../components/common/StatusBadge';
import { Download, Eye, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function DocumentRegisterPage() {
  const [type, setType] = useState(''), queryClient = useQueryClient(), toast = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['document-register', type],
    queryFn: () => api.get('/documents', { params: { documentType: type } }).then(r => r.data.data)
  });
  const openFile = async (item, preview) => {
    const response = await api.get(`/documents/${item._id}/${preview ? 'preview' : 'download'}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    if (preview) window.open(url, '_blank', 'noopener,noreferrer');
    else {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.fileName;
      anchor.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const replaceFile = async (item, file) => {
    if (!file) return;
    try {
      const body = new FormData(); body.append('file', file);
      await api.post(`/documents/${item._id}/replace`, body);
      toast('New document version uploaded');
      queryClient.invalidateQueries({ queryKey: ['document-register'] });
    } catch (error) { toast(messageOf(error), 'error'); }
  };
  if (isLoading) return <Spinner />;
  return <>
    <PageHeader title="Document Register" description="Central document numbering, categories, revisions, versions and approval status." />
    <div className="card mb-5 max-w-sm p-3">
      <select className="field" value={type} onChange={event => setType(event.target.value)}>
        <option value="">All document categories</option>
        {documentTypes.map(item => <option key={item}>{item}</option>)}
      </select>
    </div>
    {data?.length ? <div className="table-wrap"><table className="data-table">
      <thead><tr><th>Number</th><th>Document</th><th>Category</th><th>Revision</th><th>Version</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{data.map(item => <tr key={item._id}>
        <td>{item.documentNumber || '—'}</td>
        <td><b>{item.title}</b><div className="text-xs text-slate-500">{item.fileName}</div></td>
        <td>{item.documentType}</td><td>R{item.revision ?? 0}</td><td>V{item.versionNumber || 1}</td>
        <td><StatusBadge status={item.isLocked ? 'LOCKED' : item.status} /></td>
        <td><div className="flex gap-3"><button onClick={() => openFile(item, true)} title="Preview"><Eye size={17} /></button><button onClick={() => openFile(item, false)} title="Download"><Download size={17} /></button>{!item.isLocked&&item.status==='ACTIVE'&&<label className="cursor-pointer" title="Replace with a new version"><RefreshCw size={17}/><input className="hidden" type="file" onChange={event=>replaceFile(item,event.target.files?.[0])}/></label>}</div></td>
      </tr>)}</tbody>
    </table></div> : <Empty title="No documents found" />}
  </>;
}

export function QueryRegisterPage() {
  const [status, setStatus] = useState(''), toast = useToast(), queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['query-register', status], queryFn: () => api.get('/queries', { params: { status } }).then(r => r.data.data) });
  const act = async (item, action) => {
    try {
      if (action === 'respond') { const response = window.prompt(`Response for ${item.queryNumber}`); if (!response) return; await api.post(`/design-queries/${item._id}/respond`, { response }); }
      if (action === 'resolve') await api.post(`/design-queries/${item._id}/resolve`);
      if (action === 'reopen') { const comments = window.prompt(`Why is ${item.queryNumber} being reopened?`); if (comments === null) return; await api.post(`/design-queries/${item._id}/reopen`, { comments }); }
      toast(`Query ${action} action completed`); queryClient.invalidateQueries({ queryKey: ['query-register'] });
    } catch (error) { toast(messageOf(error), 'error'); }
  };
  if (isLoading) return <Spinner />;
  return <>
    <PageHeader title="Query Management" description="Assign, respond, resolve, reopen and monitor the age of estimation and design queries." />
    <div className="card mb-5 max-w-sm p-3"><select className="field" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['OPEN','IN_PROGRESS','RESPONDED','RESOLVED','REOPENED','CLOSED'].map(x => <option key={x}>{x}</option>)}</select></div>
    {data?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Query</th><th>Title</th><th>Inquiry</th><th>Raised by</th><th>Age</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.map(item => <tr key={item._id}><td>{item.queryNumber}</td><td><b>{item.title}</b><div className="text-xs text-slate-500">{item.description}</div></td><td>{item.inquiry?.inquiryNumber || '—'}</td><td>{item.raisedBy?.name || '—'}</td><td>{ageInDays(item.createdAt || item.raisedAt)} days</td><td><StatusBadge status={item.status || 'OPEN'} /></td><td><div className="flex gap-2">{['OPEN','IN_PROGRESS','REOPENED'].includes(item.status || 'OPEN') && <button className="text-sm font-semibold text-brand-700" onClick={() => act(item, 'respond')}>Respond</button>}{item.status === 'RESPONDED' && <button className="text-sm font-semibold text-emerald-700" onClick={() => act(item, 'resolve')}>Resolve</button>}{item.status === 'RESOLVED' && <button className="text-sm font-semibold text-amber-700" onClick={() => act(item, 'reopen')}>Reopen</button>}</div></td></tr>)}</tbody></table></div> : <Empty title="No queries found" />}
  </>;
}

export function AuditLogsPage() {
  const [filters, setFilters] = useState({ action: '', entityType: '', from: '', to: '' });
  const { data, isLoading } = useQuery({ queryKey: ['audit-logs', filters], queryFn: () => api.get('/admin/audit-logs', { params: filters }).then(r => r.data) });
  if (isLoading) return <Spinner />;
  return <>
    <PageHeader title="Audit Logs" description="Who changed what, when, from which department, including approvals and status changes." />
    <div className="card mb-5 grid gap-3 p-4 md:grid-cols-4">
      <input className="field" placeholder="Action" value={filters.action} onChange={e => setFilters(v => ({ ...v, action: e.target.value }))} />
      <input className="field" placeholder="Entity type" value={filters.entityType} onChange={e => setFilters(v => ({ ...v, entityType: e.target.value }))} />
      <input className="field" type="date" value={filters.from} onChange={e => setFilters(v => ({ ...v, from: e.target.value }))} />
      <input className="field" type="date" value={filters.to} onChange={e => setFilters(v => ({ ...v, to: e.target.value }))} />
    </div>
    {data?.data?.length ? <div className="table-wrap"><table className="data-table">
      <thead><tr><th>Date</th><th>User</th><th>Department</th><th>Action</th><th>Entity</th><th>Description</th></tr></thead>
      <tbody>{data.data.map(item => <tr key={item._id}><td>{new Date(item.createdAt || item.timestamp).toLocaleString()}</td><td>{item.user?.name || 'System'}</td><td>{item.department?.name || '—'}</td><td>{item.action}</td><td>{item.entityType}</td><td>{item.description || '—'}</td></tr>)}</tbody>
    </table></div> : <Empty title="No audit events found" />}
  </>;
}

export function AdminConfigurationPage() {
  const toast = useToast(), queryClient = useQueryClient();
  const setting = useForm({ defaultValues: { category: 'GENERAL' } });
  const rule = useForm({ defaultValues: { isActive: true } });
  const { data, isLoading } = useQuery({ queryKey: ['admin-configuration'], queryFn: () => api.get('/admin/configuration').then(r => r.data.data) });
  const save = async (path, values, form) => { try { await api.post(path, values); toast('Configuration saved'); form.reset(); queryClient.invalidateQueries({ queryKey: ['admin-configuration'] }); } catch (error) { toast(messageOf(error), 'error'); } };
  if (isLoading) return <Spinner />;
  return <>
    <PageHeader title="Administration" description="Standard values, company/email configuration, document templates and approval rules." />
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="card p-5"><h2 className="flex items-center gap-2 font-bold"><Plus size={18} />System setting</h2>
        <form className="mt-4 grid gap-3" onSubmit={setting.handleSubmit(v => save('/admin/system-settings', { ...v, value: parseValue(v.value) }, setting))}>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Key"><input className="field" {...setting.register('key', { required: true })} placeholder="company.name" /></Field><Field label="Category"><select className="field" {...setting.register('category')}>{['GENERAL','COMPANY','EMAIL','DROPDOWN','DOCUMENT_TEMPLATE','NOTIFICATION'].map(x => <option key={x}>{x}</option>)}</select></Field></div>
          <Field label="Value"><textarea className="field min-h-24" {...setting.register('value', { required: true })} placeholder="Text, number, or JSON" /></Field><Field label="Description"><input className="field" {...setting.register('description')} /></Field><button className="btn-primary">Save setting</button>
        </form>
        <div className="mt-5 divide-y">{data.settings.map(item => <div key={item._id} className="py-3 text-sm"><b>{item.key}</b><span className="ml-2 rounded bg-slate-100 px-2 py-1 text-xs">{item.category || 'GENERAL'}</span><p className="mt-1 text-slate-500">{typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value ?? '')}</p></div>)}</div>
      </section>
      <section className="card p-5"><h2 className="flex items-center gap-2 font-bold"><ShieldCheck size={18} />Approval rule</h2>
        <form className="mt-4 grid gap-3" onSubmit={rule.handleSubmit(v => save('/admin/approval-rules', v, rule))}>
          <Field label="Rule name"><input className="field" {...rule.register('name', { required: true })} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Minimum value"><input className="field" type="number" {...rule.register('minimumValue')} /></Field><Field label="Maximum value"><input className="field" type="number" {...rule.register('maximumValue')} /></Field></div><Field label="Required role"><input className="field" {...rule.register('requiredRole')} placeholder="GM" /></Field><button className="btn-primary">Add approval rule</button>
        </form>
        <div className="mt-5 divide-y">{data.approvalRules.map(item => <div key={item._id} className="flex items-center justify-between py-3 text-sm"><div><b>{item.name}</b><p className="text-xs text-slate-500">{item.requiredRole || 'Any role'} · {item.minimumValue || 0}–{item.maximumValue || '∞'}</p></div><StatusBadge status={item.isActive === false ? 'INACTIVE' : 'ACTIVE'} /></div>)}</div>
      </section>
    </div>
  </>;
}

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['management-analytics'], queryFn: () => api.get('/reports/analytics').then(r => r.data.data) });
  if (isLoading) return <Spinner />;
  return <>
    <PageHeader title="Management Analytics" description="Inquiry ageing, department workload, query ageing, quotation value, margins, industry and location reports." />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Summary label="Quotation value" value={new Intl.NumberFormat('en-US',{notation:'compact'}).format(data.quotationValue||0)} />
      <Summary label="Average profit margin" value={`${Number(data.averageProfitMargin||0).toFixed(1)}%`} />
      <Summary label="Open queries" value={data.openQueryAgeing.length} />
      <Summary label="Completed design jobs" value={data.designTurnaround.length} />
    </div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      <Breakdown title="Inquiry status" values={data.byStatus} />
      <Breakdown title="Department workload" values={data.byDepartment} />
      <Breakdown title="Inquiry ageing" values={data.ageing} />
      <Breakdown title="Industry" values={data.byIndustry} />
      <Breakdown title="Project location" values={data.byLocation} />
      <section className="card p-5"><h2 className="font-bold">Query ageing</h2><div className="mt-3 divide-y">{data.openQueryAgeing.length?data.openQueryAgeing.map(item=><div className="flex justify-between py-2 text-sm" key={item.queryNumber}><span>{item.queryNumber}<small className="ml-2 text-slate-400">{item.status}</small></span><b>{item.days} days</b></div>):<p className="text-sm text-slate-500">No open queries</p>}</div></section>
    </div>
  </>;
}

function Summary({label,value}) { return <div className="card p-5"><p className="text-3xl font-bold text-navy-900">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>; }
function Breakdown({title,values}) { return <section className="card p-5"><h2 className="font-bold">{title}</h2><div className="mt-3 divide-y">{Object.entries(values||{}).map(([key,value])=><div className="flex justify-between py-2 text-sm" key={key}><span>{key.replaceAll('_',' ')}</span><b>{value}</b></div>)}</div></section>; }

const documentTypes=['ITF attachment','Client drawing','Client specification','JIF','Design query attachment','DWS','Costing Sheet','Commercial Proposal','Technical Proposal','Proposal Drawing','GM Review','Submission proof','Purchase Order','Other'];
function parseValue(value) { try { return JSON.parse(value); } catch { return value; } }
function ageInDays(value) { return value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000)) : 0; }
