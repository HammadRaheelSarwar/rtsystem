import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/db.js';

// In-memory fallback database for test environments or offline mode
const memoryStore = new Map();

function getMemoryTable(tableName) {
  if (!memoryStore.has(tableName)) {
    memoryStore.set(tableName, []);
  }
  return memoryStore.get(tableName);
}

function getNested(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr && typeof curr === 'object') {
      curr = curr[p];
    } else {
      return undefined;
    }
  }
  return curr;
}

function camelToSnakeKey(key) {
  const customMap = {
    _id: 'id',
    createdBy: 'created_by_id',
    currentDepartment: 'current_department_id',
    assignedTo: 'assigned_to_id',
    raisedBy: 'raised_by_id',
    assignedDepartment: 'assigned_department_id',
    preparedBy: 'prepared_by_id',
    checkedBy: 'checked_by_id',
    approvedBy: 'approved_by_id',
    uploadedBy: 'uploaded_by_id',
    reviewedBy: 'reviewed_by_id',
    submittedBy: 'submitted_by_id',
    assignedDesigner: 'assigned_designer_id',
    proofDocument: 'proof_document_id',
    authorizedSignatory: 'authorized_signatory_id',
    recipient: 'recipient_id',
    inquiryId: 'inquiry_id',
    role: 'role_id',
    department: 'department_id',
    client: 'client_id',
    inquiry: 'inquiry_id'
  };
  if (customMap[key]) return customMap[key];
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamelKey(key) {
  const customMap = {
    id: '_id',
    created_by_id: 'createdBy',
    current_department_id: 'currentDepartment',
    assigned_to_id: 'assignedTo',
    raised_by_id: 'raisedBy',
    assigned_department_id: 'assignedDepartment',
    prepared_by_id: 'preparedBy',
    checked_by_id: 'checkedBy',
    approved_by_id: 'approvedBy',
    uploaded_by_id: 'uploadedBy',
    reviewed_by_id: 'reviewedBy',
    submitted_by_id: 'submittedBy',
    assigned_designer_id: 'assignedDesigner',
    proof_document_id: 'proofDocument',
    authorized_signatory_id: 'authorizedSignatory',
    recipient_id: 'recipient',
    inquiry_id: 'inquiry',
    role_id: 'role',
    department_id: 'department',
    client_id: 'client'
  };
  if (customMap[key]) return customMap[key];
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toSnake(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_id' || k === 'id') continue;
    const snakeK = camelToSnakeKey(k);
    res[snakeK] = v;
  }
  return res;
}

export function toCamel(row, modelName) {
  if (!row || typeof row !== 'object') return row;
  const res = { _id: String(row.id || row._id || ''), id: String(row.id || row._id || '') };
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id') continue;
    const camelK = snakeToCamelKey(k);
    res[camelK] = v;
  }
  if (modelName === 'User') {
    res.comparePassword = async function (cand) {
      if (!this.password) return false;
      return bcrypt.compare(cand, this.password);
    };
    res.toSafeObject = function () {
      const copy = { ...this };
      delete copy.password;
      delete copy.refreshTokens;
      delete copy.passwordResetToken;
      delete copy.passwordResetExpires;
      delete copy.comparePassword;
      delete copy.toSafeObject;
      return copy;
    };
  }
  return res;
}

class QueryChain {
  constructor(model, filter = {}, single = false) {
    this.model = model;
    this.filter = filter;
    this.single = single;
    this._skip = 0;
    this._limit = null;
    this._sort = null;
    this._populateFields = [];
    this._selectFields = null;
    this._lean = false;
  }

  skip(n) {
    this._skip = n;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  populate(fields) {
    if (typeof fields === 'string') {
      const parts = fields.split(' ').filter(Boolean);
      this._populateFields.push(...parts);
    } else if (Array.isArray(fields)) {
      this._populateFields.push(...fields);
    }
    return this;
  }

  select(s) {
    this._selectFields = s;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async execute() {
    return this.model._executeQuery(this);
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }
}

export class SupabaseModel {
  constructor(modelName, tableName, relations = {}) {
    this.modelName = modelName;
    this.tableName = tableName;
    this.relations = relations;
  }

  find(filter = {}) {
    return new QueryChain(this, filter, false);
  }

  findOne(filter = {}) {
    return new QueryChain(this, filter, true);
  }

  findById(id) {
    if (!id) return new QueryChain(this, { _id: 'non-existent' }, true);
    return new QueryChain(this, { _id: id }, true);
  }

  async countDocuments(filter = {}) {
    const items = await this.find(filter);
    return items.length;
  }

  async exists(filter = {}) {
    const item = await this.findOne(filter);
    return Boolean(item);
  }

  async create(data) {
    const id = data._id || data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const docData = { ...data };

    if (this.modelName === 'User' && docData.password && !docData.password.startsWith('$2')) {
      docData.password = await bcrypt.hash(docData.password, 12);
    }

    const payload = {
      id,
      ...toSnake(docData),
      created_at: now,
      updated_at: now
    };

    if (supabase) {
      const { data: inserted, error } = await supabase
        .from(this.tableName)
        .insert([payload])
        .select()
        .single();

      if (error) {
        return this._memoryCreate(payload);
      }
      return toCamel(inserted, this.modelName);
    }

    return this._memoryCreate(payload);
  }

  _memoryCreate(payload) {
    const mem = getMemoryTable(this.tableName);
    mem.push(payload);
    return toCamel(payload, this.modelName);
  }

  async insertMany(arr) {
    const results = [];
    for (const item of arr) {
      results.push(await this.create(item));
    }
    return results;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    return this.findOneAndUpdate({ _id: id }, update, options);
  }

  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await this.findOne(filter);

    if (!existing) {
      if (options.upsert) {
        const createData = { ...filter };
        if (update.$set) Object.assign(createData, update.$set);
        if (update.$setOnInsert) Object.assign(createData, update.$setOnInsert);
        if (!update.$set && !update.$setOnInsert) Object.assign(createData, update);
        return this.create(createData);
      }
      return null;
    }

    let updatedFields = {};
    if (update.$set) {
      Object.assign(updatedFields, update.$set);
    } else if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        updatedFields[k] = (existing[k] || 0) + v;
      }
    } else {
      updatedFields = { ...update };
    }

    if (this.modelName === 'User' && updatedFields.password && !updatedFields.password.startsWith('$2')) {
      updatedFields.password = await bcrypt.hash(updatedFields.password, 12);
    }

    const payload = toSnake(updatedFields);
    payload.updated_at = new Date().toISOString();

    if (supabase) {
      const { data: updated, error } = await supabase
        .from(this.tableName)
        .update(payload)
        .eq('id', existing._id)
        .select()
        .single();

      if (!error && updated) {
        return toCamel(updated, this.modelName);
      }
    }

    const mem = getMemoryTable(this.tableName);
    const idx = mem.findIndex(r => r.id === existing._id);
    if (idx !== -1) {
      mem[idx] = { ...mem[idx], ...payload };
      return toCamel(mem[idx], this.modelName);
    }

    return { ...existing, ...updatedFields };
  }

  async updateMany(filter, update) {
    const items = await this.find(filter);
    for (const item of items) {
      await this.findByIdAndUpdate(item._id, update);
    }
    return { modifiedCount: items.length };
  }

  async aggregate(pipeline = []) {
    const allItems = await this.find({});
    let results = [...allItems];

    for (const stage of pipeline) {
      if (stage.$match) {
        results = results.filter(r => this._matchesFilter(r, stage.$match));
      } else if (stage.$group) {
        const groupField = stage.$group._id ? String(stage.$group._id).replace('$', '') : null;
        const groups = {};

        for (const item of results) {
          const key = groupField ? (item[groupField] ?? null) : null;
          const kStr = String(key);
          if (!groups[kStr]) groups[kStr] = [];
          groups[kStr].push(item);
        }

        const aggregated = [];
        for (const [key, items] of Object.entries(groups)) {
          const groupRes = { _id: key === 'null' ? null : key };
          for (const [outField, op] of Object.entries(stage.$group)) {
            if (outField === '_id') continue;
            if (op.$sum === 1) {
              groupRes[outField] = items.length;
            } else if (typeof op.$sum === 'string') {
              const fieldPath = op.$sum.replace('$', '');
              groupRes[outField] = items.reduce((sum, item) => sum + (Number(getNested(item, fieldPath)) || 0), 0);
            } else if (typeof op.$avg === 'string') {
              const fieldPath = op.$avg.replace('$', '');
              const sum = items.reduce((s, item) => s + (Number(getNested(item, fieldPath)) || 0), 0);
              groupRes[outField] = items.length ? sum / items.length : 0;
            }
          }
          aggregated.push(groupRes);
        }
        results = aggregated;
      } else if (stage.$lookup) {
        const { from, localField, foreignField, as } = stage.$lookup;
        const localKey = localField.replace('$', '').replace(/^_id$/, 'id');
        const targetModel = Object.values(modelRegistry).find(m => m.tableName === from || m.modelName.toLowerCase() === from.toLowerCase());
        if (targetModel) {
          const foreignItems = await targetModel.find({});
          for (const item of results) {
            const matching = foreignItems.filter(f => String(f[foreignField] || f.inquiry || '') === String(item[localKey] || item._id || ''));
            item[as] = matching;
          }
        } else {
          for (const item of results) {
            item[as] = [];
          }
        }
      } else if (stage.$unwind) {
        const path = typeof stage.$unwind === 'string' ? stage.$unwind.replace('$', '') : stage.$unwind.path.replace('$', '');
        const preserve = typeof stage.$unwind === 'object' && stage.$unwind.preserveNullAndEmptyArrays;
        const unwound = [];
        for (const item of results) {
          const arr = item[path];
          if (Array.isArray(arr) && arr.length > 0) {
            for (const elem of arr) {
              unwound.push({ ...item, [path]: elem });
            }
          } else if (preserve) {
            unwound.push({ ...item, [path]: null });
          }
        }
        results = unwound;
      }
    }
    return results;
  }

  async _executeQuery(chain) {
    let rows = [];

    if (supabase) {
      try {
        let q = supabase.from(this.tableName).select('*');
        rows = await this._fetchFromSupabase(q, chain.filter);
      } catch (err) {
        rows = this._fetchFromMemory(chain.filter);
      }
    } else {
      rows = this._fetchFromMemory(chain.filter);
    }

    let records = rows.map(r => toCamel(r, this.modelName));

    records = records.filter(r => this._matchesFilter(r, chain.filter));

    if (chain._sort) {
      const [[field, dir]] = Object.entries(chain._sort);
      records.sort((a, b) => {
        const valA = a[field] ?? '';
        const valB = b[field] ?? '';
        if (valA < valB) return dir === -1 || dir === 'desc' ? 1 : -1;
        if (valA > valB) return dir === -1 || dir === 'desc' ? -1 : 1;
        return 0;
      });
    }

    if (chain._skip) {
      records = records.slice(chain._skip);
    }
    if (chain._limit) {
      records = records.slice(0, chain._limit);
    }

    if (chain._populateFields.length > 0) {
      for (const record of records) {
        for (const pop of chain._populateFields) {
          await this._populateRecordField(record, pop);
        }
      }
    }

    if (chain.single) {
      return records[0] || null;
    }

    return records;
  }

  async _fetchFromSupabase(query, filter) {
    let q = query;
    for (const [k, v] of Object.entries(filter)) {
      if (k === '_id' || k === 'id') {
        q = q.eq('id', v);
      } else if (k === 'isDeleted') {
        q = q.eq('is_deleted', v);
      } else if (k === 'isActive') {
        q = q.eq('is_active', v);
      } else if (k === 'status') {
        q = q.eq('status', v);
      } else if (k === 'currentStatus') {
        if (typeof v === 'object' && v.$nin) {
          q = q.not('current_status', 'in', `(${v.$nin.map(x => `"${x}"`).join(',')})`);
        } else {
          q = q.eq('current_status', v);
        }
      }
    }

    const { data, error } = await q;
    if (error || !data) {
      return this._fetchFromMemory(filter);
    }
    return data;
  }

  _fetchFromMemory(filter) {
    const mem = getMemoryTable(this.tableName);
    return mem.filter(row => {
      const camel = toCamel(row, this.modelName);
      return this._matchesFilter(camel, filter);
    });
  }

  _matchesFilter(item, filter) {
    for (const [k, v] of Object.entries(filter)) {
      if (k === '$text') continue;
      const itemVal = item[k];

      if (v && typeof v === 'object') {
        if (v.$regex) {
          const reg = new RegExp(v.$regex, 'i');
          if (!reg.test(itemVal || '')) return false;
        }
        if (v.$nin) {
          if (v.$nin.includes(itemVal)) return false;
        }
        if (v.$in) {
          if (!v.$in.includes(itemVal)) return false;
        }
        if (v.$gte || v.$lte) {
          const d = new Date(itemVal);
          if (v.$gte && d < new Date(v.$gte)) return false;
          if (v.$lte && d > new Date(v.$lte)) return false;
        }
        if (v.$ne !== undefined) {
          if (itemVal === v.$ne) return false;
        }
      } else if (itemVal !== v) {
        if ((k === '_id' || k === 'id') && String(itemVal) === String(v)) {
          continue;
        }
        return false;
      }
    }
    return true;
  }

  async _populateRecordField(record, fieldDef) {
    let fieldName = typeof fieldDef === 'string' ? fieldDef : fieldDef.path;
    let selectFields = typeof fieldDef === 'object' ? fieldDef.select : null;

    const relModelName = this.relations[fieldName];
    if (!relModelName) return;

    const refId = record[fieldName];
    if (!refId || typeof refId === 'object') return;

    const targetModel = modelRegistry[relModelName];
    if (targetModel) {
      const refDoc = await targetModel.findById(refId);
      if (refDoc) {
        if (selectFields) {
          const selected = {};
          const keys = selectFields.split(' ').filter(Boolean);
          for (const k of keys) {
            selected[k] = refDoc[k];
          }
          record[fieldName] = selected;
        } else {
          record[fieldName] = refDoc;
        }
      }
    }
  }
}

export const modelRegistry = {};
