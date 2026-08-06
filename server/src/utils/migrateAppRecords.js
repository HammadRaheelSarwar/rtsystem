import 'dotenv/config';
import { supabase } from '../config/db.js';
import { modelRegistry } from '../models/base.js';
import '../models/index.js';
import { toDatabaseRow } from '../models/base.js';

const order = [
  'departments', 'roles', 'users', 'clients', 'inquiries', 'inquiry_taking_forms',
  'job_inquiry_forms', 'design_tasks', 'design_queries', 'design_weight_summaries',
  'costing_sheets', 'commercial_proposals', 'technical_proposals', 'proposal_drawings',
  'gm_reviews', 'sales_submissions', 'follow_ups', 'documents', 'notifications',
  'activity_logs', 'material_rates', 'tax_settings', 'approval_rules', 'system_settings'
];

const byCollection = new Map(Object.values(modelRegistry).map(model => [model.sourceCollection, model]));
const naturalKeys = {
  Department: [['code'], ['name']],
  Role: [['name'], ['code']],
  User: [['email']],
  Client: [['client_code']],
  Inquiry: [['inquiry_number', 'revision_number']],
  ApprovalRule: [['code']],
  SystemSetting: [['key']]
};

const idMap = new Map();

function remap(value) {
  if (Array.isArray(value)) return value.map(remap);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remap(item)]));
  return typeof value === 'string' && idMap.has(value) ? idMap.get(value) : value;
}

async function existingId(model, row) {
  const candidates = naturalKeys[model.modelName] || [];
  for (const keys of candidates) {
    if (keys.some(key => row[key] === undefined || row[key] === null)) continue;
    let query = supabase.from(model.tableName).select('id').limit(1);
    for (const key of keys) query = query.eq(key, row[key]);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id;
  }
  return null;
}

async function run() {
  if (!supabase) throw new Error('Supabase service-role configuration is required');
  const { data: records, error } = await supabase.from('app_records').select('*');
  if (error) throw error;
  let migrated = 0;

  for (const collection of order) {
    const model = byCollection.get(collection);
    if (!model) continue;
    for (const record of (records || []).filter(item => item.collection === collection)) {
      const document = remap({
        ...record.data,
        _id: record.id,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      });
      let row = toDatabaseRow(model.modelName, model.tableName, document, record.id);
      const matchedId = await existingId(model, row);
      const targetId = matchedId || record.id;
      if (targetId !== record.id) {
        idMap.set(String(record.id), String(targetId));
        row = toDatabaseRow(model.modelName, model.tableName, document, targetId);
      }
      row.created_at = record.created_at;
      row.updated_at = record.updated_at;
      const { error: upsertError } = await supabase.from(model.tableName).upsert(row, { onConflict: 'id' });
      if (upsertError) throw new Error(`${collection} -> ${model.tableName}: ${upsertError.message}`);
      migrated += 1;
    }
  }
  console.log(JSON.stringify({ migrated, sourceRecords: records?.length || 0 }));
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
