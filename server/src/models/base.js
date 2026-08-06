import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/db.js';
import { childSchemas, prepareDocument, schemaFor } from './schema.js';

const memoryStore = new Map();

function serializable(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'function' ? undefined : item));
}

function databaseError(error, table) {
  const err = new Error(error?.code === 'SUPABASE_NOT_CONFIGURED'
    ? 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for production persistence.'
    : error?.code === 'PGRST205'
      ? `Supabase table "${table}" is missing. Run docs/supabase_normalized_runtime.sql in the Supabase SQL Editor.`
      : `Supabase persistence failed for "${table}": ${error?.message || 'Unknown database error'}`);
  err.status = 503;
  err.code = 'DATABASE_UNAVAILABLE';
  err.details = error?.code;
  return err;
}

function getMemoryTable(tableName) {
  if (!memoryStore.has(tableName)) memoryStore.set(tableName, []);
  return memoryStore.get(tableName);
}

function getNested(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((curr, part) => curr && typeof curr === 'object' ? curr[part] : undefined, obj);
}

function snakeToCamel(key) {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function cleanDocument(value) {
  const copy = serializable(value || {});
  for (const key of ['_id', 'id', '__v', 'save', 'comparePassword', 'toSafeObject', 'createdAt', 'updatedAt']) delete copy[key];
  return copy;
}

function encodeChildItem(spec, item, index, parentId) {
  const source = item && typeof item === 'object' ? item : {};
  const row = { [spec.foreignKey]: parentId };
  const metadata = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || ['id', '_id', 'createdAt', 'updatedAt'].includes(key)) continue;
    const column = spec.columns[key];
    if (column) row[column] = serializable(value);
    else metadata[key] = serializable(value);
  }
  if ('sortOrder' in spec.columns && row.sort_order === undefined) row.sort_order = index;
  row.metadata = metadata;
  return row;
}

function decodeChildItem(spec, row) {
  const reverse = Object.fromEntries(Object.entries(spec.columns).map(([app, db]) => [db, app]));
  const item = { ...(row.metadata || {}) };
  for (const [key, value] of Object.entries(row)) {
    if (['id', spec.foreignKey, 'metadata', 'created_at', 'updated_at'].includes(key)) continue;
    item[reverse[key] || snakeToCamel(key)] = value;
  }
  if (row.id) { item._id = String(row.id); item.id = String(row.id); }
  return item;
}

export function toDatabaseRow(modelName, fallbackTable, value, id = value?._id || value?.id || crypto.randomUUID()) {
  const schema = schemaFor(modelName, fallbackTable);
  const doc = prepareDocument(modelName, cleanDocument(value));
  const row = { id: String(id) };
  const metadata = {};

  for (const [key, item] of Object.entries(doc)) {
    if (item === undefined || typeof item === 'function') continue;
    const column = schema.columns[key];
    if (column) {
      const normalized = column.endsWith('_id') && item && typeof item === 'object'
        ? (item._id || item.id || item.Id || null)
        : item;
      row[column] = serializable(normalized);
    }
    else metadata[key] = serializable(item);
  }

  row.metadata = metadata;
  if (value?.createdAt || value?.created_at) row.created_at = new Date(value.createdAt || value.created_at).toISOString();
  row.updated_at = new Date(value?.updatedAt || value?.updated_at || Date.now()).toISOString();
  return row;
}

export function fromDatabaseRow(modelName, fallbackTable, row) {
  if (!row) return null;
  const schema = schemaFor(modelName, fallbackTable);
  const reverse = Object.fromEntries(Object.entries(schema.columns).map(([app, db]) => [db, app]));
  const result = { ...(row.metadata || {}), _id: String(row.id), id: String(row.id) };

  for (const [key, value] of Object.entries(row)) {
    if (['id', 'metadata', 'created_at', 'updated_at'].includes(key) || value === undefined) continue;
    result[reverse[key] || snakeToCamel(key)] = value;
  }
  result.createdAt = row.created_at;
  result.updatedAt = row.updated_at || row.created_at;
  if (modelName === 'Client' || modelName === 'Inquiry') result.isDeleted = Boolean(result.isDeleted || row.deleted_at);
  return decorate(result, modelName);
}

export const toSnake = value => value;
export const toCamel = (row, modelName) => fromDatabaseRow(modelName, modelRegistry[modelName]?.tableName || '', row);

function decorate(result, modelName) {
  result.save = async function () {
    const model = modelRegistry[modelName];
    if (!model) return this;
    const updated = await model.findByIdAndUpdate(this._id, this);
    if (updated) Object.assign(this, updated);
    return this;
  };

  if (modelName === 'User' || modelName === 'Profile') {
    result.comparePassword = async function (candidate) {
      return Boolean(this.password) && bcrypt.compare(candidate, this.password);
    };
    result.toSafeObject = function () {
      const copy = { ...this };
      for (const key of ['password', 'refreshTokens', 'passwordResetToken', 'passwordResetExpires', 'comparePassword', 'toSafeObject', 'save']) delete copy[key];
      return copy;
    };
  }
  return result;
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
  skip(value) { this._skip = value; return this; }
  limit(value) { this._limit = value; return this; }
  sort(value) { this._sort = value; return this; }
  populate(fields) {
    if (typeof fields === 'string') this._populateFields.push(...fields.split(' ').filter(Boolean));
    else if (Array.isArray(fields)) this._populateFields.push(...fields);
    return this;
  }
  select(value) { this._selectFields = value; return this; }
  lean() { this._lean = true; return this; }
  execute() { return this.model._executeQuery(this); }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
  catch(reject) { return this.execute().catch(reject); }
}

export class SupabaseModel {
  constructor(modelName, tableName, relations = {}) {
    this.modelName = modelName;
    this.schema = schemaFor(modelName, tableName);
    this.tableName = this.schema.table;
    this.sourceCollection = this.schema.sourceCollection || tableName;
    this.relations = relations;
  }

  find(filter = {}) { return new QueryChain(this, filter, false); }
  findOne(filter = {}) { return new QueryChain(this, filter, true); }
  findById(id) { return new QueryChain(this, { _id: id || 'non-existent' }, true); }
  async countDocuments(filter = {}) { return (await this.find(filter)).length; }
  async exists(filter = {}) { return Boolean(await this.findOne(filter)); }

  async create(input) {
    const id = String(input?._id || input?.id || crypto.randomUUID());
    const now = new Date().toISOString();
    const doc = { ...input, _id: id, id, createdAt: input?.createdAt || now, updatedAt: now };
    if ((this.modelName === 'User' || this.modelName === 'Profile') && doc.password && !doc.password.startsWith('$2')) {
      doc.password = await bcrypt.hash(doc.password, 12);
    }

    if (!supabase) {
      if (process.env.NODE_ENV === 'production') throw databaseError({ code: 'SUPABASE_NOT_CONFIGURED' }, this.tableName);
      getMemoryTable(this.tableName).push(serializable(doc));
      return decorate(serializable(doc), this.modelName);
    }

    const row = toDatabaseRow(this.modelName, this.tableName, doc, id);
    row.created_at = doc.createdAt;
    const { data, error } = await supabase.from(this.tableName).insert([row]).select().single();
    if (error) throw databaseError(error, this.tableName);
    const created = fromDatabaseRow(this.modelName, this.tableName, data);
    await this._syncChildren(created);
    return this._loadChildren(created);
  }

  async insertMany(items) {
    const results = [];
    for (const item of items) results.push(await this.create(item));
    return results;
  }

  findByIdAndUpdate(id, update, options = {}) { return this.findOneAndUpdate({ _id: id }, update, options); }

  async findOneAndUpdate(filter, update, options = {}) {
    const existing = await this.findOne(filter);
    if (!existing) {
      if (!options.upsert) return null;
      const createData = { ...filter };
      if (update.$set) Object.assign(createData, update.$set);
      if (update.$setOnInsert) Object.assign(createData, update.$setOnInsert);
      if (!update.$set && !update.$setOnInsert) Object.assign(createData, update);
      delete createData._id;
      return this.create(createData);
    }

    const updatedFields = {};
    if (update.$set) Object.assign(updatedFields, update.$set);
    else if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) updatedFields[key] = (existing[key] || 0) + value;
    } else Object.assign(updatedFields, update);

    if ((this.modelName === 'User' || this.modelName === 'Profile') && updatedFields.password && !updatedFields.password.startsWith('$2')) {
      updatedFields.password = await bcrypt.hash(updatedFields.password, 12);
    }
    const merged = { ...cleanDocument(existing), ...updatedFields, _id: existing._id, id: existing._id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };

    if (!supabase) {
      const table = getMemoryTable(this.tableName);
      const index = table.findIndex(item => item._id === existing._id);
      if (index >= 0) table[index] = serializable(merged);
      return decorate(serializable(merged), this.modelName);
    }

    const row = toDatabaseRow(this.modelName, this.tableName, merged, existing._id);
    delete row.id;
    delete row.created_at;
    const { data, error } = await supabase.from(this.tableName).update(row).eq('id', existing._id).select().single();
    if (error) throw databaseError(error, this.tableName);
    const saved = fromDatabaseRow(this.modelName, this.tableName, data);
    await this._syncChildren(saved);
    return this._loadChildren(saved);
  }

  async updateMany(filter, update) {
    const items = await this.find(filter);
    for (const item of items) await this.findByIdAndUpdate(item._id, update);
    return { modifiedCount: items.length };
  }

  async aggregate(pipeline = []) {
    let results = [...await this.find({})];
    for (const stage of pipeline) {
      if (stage.$match) results = results.filter(item => this._matchesFilter(item, stage.$match));
      else if (stage.$group) {
        const field = stage.$group._id ? String(stage.$group._id).replace('$', '') : null;
        const groups = Object.groupBy(results, item => String(field ? item[field] ?? null : null));
        results = Object.entries(groups).map(([key, items]) => {
          const output = { _id: key === 'null' ? null : key };
          for (const [name, operation] of Object.entries(stage.$group)) {
            if (name === '_id') continue;
            if (operation.$sum === 1) output[name] = items.length;
            else if (typeof operation.$sum === 'string') output[name] = items.reduce((sum, item) => sum + (Number(getNested(item, operation.$sum.replace('$', ''))) || 0), 0);
            else if (typeof operation.$avg === 'string') output[name] = items.length ? items.reduce((sum, item) => sum + (Number(getNested(item, operation.$avg.replace('$', ''))) || 0), 0) / items.length : 0;
          }
          return output;
        });
      }
    }
    return results;
  }

  async _executeQuery(chain) {
    let records;
    if (!supabase) {
      if (process.env.NODE_ENV === 'production') throw databaseError({ code: 'SUPABASE_NOT_CONFIGURED' }, this.tableName);
      records = getMemoryTable(this.tableName).map(item => decorate(serializable(item), this.modelName));
    } else {
      const { data, error } = await supabase.from(this.tableName).select('*');
      if (error) throw databaseError(error, this.tableName);
      records = (data || []).map(row => fromDatabaseRow(this.modelName, this.tableName, row));
      for (const record of records) await this._loadChildren(record);
    }

    records = records.filter(item => this._matchesFilter(item, chain.filter));
    if (chain._sort) {
      const [[field, direction]] = Object.entries(chain._sort);
      records.sort((a, b) => a[field] < b[field] ? (direction === -1 || direction === 'desc' ? 1 : -1) : a[field] > b[field] ? (direction === -1 || direction === 'desc' ? -1 : 1) : 0);
    }
    if (chain._skip) records = records.slice(chain._skip);
    if (chain._limit !== null) records = records.slice(0, chain._limit);
    if (chain._populateFields.length) {
      for (const record of records) for (const field of chain._populateFields) await this._populateRecordField(record, field);
    }
    return chain.single ? records[0] || null : records;
  }

  _matchesFilter(item, filter) {
    for (const [key, expected] of Object.entries(filter || {})) {
      if (key === '$text') continue;
      const actual = item[key];
      if (key === 'isDeleted' && expected === false) { if (actual === true) return false; continue; }
      if (key === 'isActive' && expected === true) { if (actual === false) return false; continue; }
      if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        if (expected.$regex && !new RegExp(expected.$regex, 'i').test(actual || '')) return false;
        if (expected.$nin && expected.$nin.includes(actual)) return false;
        if (expected.$in && !expected.$in.map(String).includes(String(actual))) return false;
        if (expected.$gte && new Date(actual) < new Date(expected.$gte)) return false;
        if (expected.$lte && new Date(actual) > new Date(expected.$lte)) return false;
        if (expected.$ne !== undefined && actual === expected.$ne) return false;
      } else if (String(actual ?? '').toLowerCase() !== String(expected ?? '').toLowerCase()) return false;
    }
    return true;
  }

  async _populateRecordField(record, fieldDefinition) {
    const field = typeof fieldDefinition === 'string' ? fieldDefinition : fieldDefinition.path;
    const select = typeof fieldDefinition === 'object' ? fieldDefinition.select : null;
    const target = modelRegistry[this.relations[field]];
    if (!target || !record[field] || typeof record[field] === 'object') return;
    const referenced = await target.findById(record[field]);
    if (!referenced) return;
    if (!select) record[field] = referenced;
    else record[field] = Object.fromEntries(select.split(' ').filter(Boolean).map(key => [key, referenced[key]]));
  }

  async _syncChildren(document) {
    const specs = childSchemas[this.modelName] || [];
    if (!supabase || !specs.length) return;
    for (const spec of specs) {
      let value = document[spec.source];
      if (value === undefined) continue;
      let items;
      if (spec.objectAsLocations) {
        items = Object.entries(value || {}).map(([location, conditionDescription]) => ({ location, conditionDescription }));
      } else if (spec.checklist) {
        items = Object.entries(value || {}).map(([label, completed]) => spec.gmChecklist
          ? { documentType: label, reviewStatus: completed ? 'COMPLETED' : 'PENDING' }
          : { checklistCode: label.toUpperCase().replace(/[^A-Z0-9]+/g, '_'), checklistLabel: label, isCompleted: Boolean(completed) });
      } else items = spec.single ? (value && Object.keys(value).length ? [value] : []) : (Array.isArray(value) ? value : []);

      const { error: deleteError } = await supabase.from(spec.table).delete().eq(spec.foreignKey, document._id);
      if (deleteError) throw databaseError(deleteError, spec.table);
      if (!items.length) continue;
      const rows = items.map((item, index) => encodeChildItem(spec, item, index, document._id));
      const { error: insertError } = await supabase.from(spec.table).insert(rows);
      if (insertError) throw databaseError(insertError, spec.table);
    }
  }

  async _loadChildren(document) {
    const specs = childSchemas[this.modelName] || [];
    if (!supabase || !specs.length) return document;
    for (const spec of specs) {
      const { data, error } = await supabase.from(spec.table).select('*').eq(spec.foreignKey, document._id);
      if (error) throw databaseError(error, spec.table);
      const items = (data || []).map(row => decodeChildItem(spec, row));
      if (spec.objectAsLocations) document[spec.source] = Object.fromEntries(items.map(item => [item.location, item.conditionDescription]));
      else if (spec.checklist) document[spec.source] = Object.fromEntries(items.map(item => spec.gmChecklist
        ? [item.documentType, item.reviewStatus === 'COMPLETED']
        : [item.checklistLabel, Boolean(item.isCompleted)]));
      else document[spec.source] = spec.single ? items[0] || {} : items;
    }
    return document;
  }
}

export const modelRegistry = {};
