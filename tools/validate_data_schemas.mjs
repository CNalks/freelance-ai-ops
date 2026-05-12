import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dataDir = path.join(root, "data");
const schemasDir = path.join(dataDir, "schemas");
const examplesDir = path.join(dataDir, "examples");

const jsonlAliases = new Map([
  ["jobs", "opportunity"],
  ["runs", "run"],
]);

const errors = [];

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    errors.push(`${rel(filePath)}: invalid JSON: ${error.message}`);
    return null;
  }
}

function isType(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

function validateValue(value, schema, location) {
  if (!schema || typeof schema !== "object") return;

  const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type].filter(Boolean);
  if (allowedTypes.length > 0 && !allowedTypes.some((type) => isType(value, type))) {
    errors.push(`${location}: expected ${allowedTypes.join("|")}, got ${Array.isArray(value) ? "array" : value === null ? "null" : typeof value}`);
    return;
  }

  if (schema.type === "object" || (schema.properties && isType(value, "object"))) {
    const properties = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) {
        errors.push(`${location}: missing required property "${key}"`);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) {
          errors.push(`${location}: unexpected property "${key}"`);
        }
      }
    }

    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        validateValue(value[key], childSchema, `${location}.${key}`);
      }
    }
  }

  if (schema.type === "array" || (schema.items && Array.isArray(value))) {
    value.forEach((item, index) => {
      validateValue(item, schema.items, `${location}[${index}]`);
    });
  }
}

async function loadSchemas() {
  const schemas = new Map();
  const entries = await readdir(schemasDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".schema.json")) continue;

    const filePath = path.join(schemasDir, entry.name);
    const schema = await readJson(filePath);
    if (schema) {
      schemas.set(entry.name.slice(0, -".schema.json".length), { filePath, schema });
    }
  }

  return schemas;
}

function schemaNameForJsonl(fileName, schemas) {
  const baseName = fileName.slice(0, -".jsonl".length);
  const candidates = [
    baseName,
    jsonlAliases.get(baseName),
    baseName.endsWith("ies") ? `${baseName.slice(0, -3)}y` : null,
    baseName.endsWith("s") ? baseName.slice(0, -1) : null,
  ].filter(Boolean);

  return candidates.find((candidate) => schemas.has(candidate)) ?? null;
}

async function validateExamples(schemas) {
  let checked = 0;
  const entries = await readdir(examplesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".example.json")) continue;

    const schemaName = entry.name.slice(0, -".example.json".length);
    const schemaRecord = schemas.get(schemaName);
    const filePath = path.join(examplesDir, entry.name);
    if (!schemaRecord) {
      errors.push(`${rel(filePath)}: no matching schema data/schemas/${schemaName}.schema.json`);
      continue;
    }

    const data = await readJson(filePath);
    if (data) {
      checked += 1;
      validateValue(data, schemaRecord.schema, rel(filePath));
    }
  }

  return checked;
}

async function validateJsonl(schemas) {
  let checkedFiles = 0;
  let checkedRecords = 0;
  const entries = await readdir(dataDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;

    const schemaName = schemaNameForJsonl(entry.name, schemas);
    if (!schemaName) continue;

    checkedFiles += 1;
    const schema = schemas.get(schemaName).schema;
    const filePath = path.join(dataDir, entry.name);
    const lines = (await readFile(filePath, "utf8")).split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!line.trim()) return;

      let record;
      try {
        record = JSON.parse(line);
      } catch (error) {
        errors.push(`${rel(filePath)}:${index + 1}: invalid JSON: ${error.message}`);
        return;
      }

      checkedRecords += 1;
      validateValue(record, schema, `${rel(filePath)}:${index + 1}`);
    });
  }

  return { checkedFiles, checkedRecords };
}

const schemas = await loadSchemas();
const checkedExamples = await validateExamples(schemas);
const { checkedFiles, checkedRecords } = await validateJsonl(schemas);

if (errors.length > 0) {
  console.error(`Schema validation failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Schema validation passed: ${checkedExamples} example(s), ${checkedRecords} JSONL record(s) across ${checkedFiles} file(s).`);
