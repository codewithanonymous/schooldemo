/**
 * Compares active Supabase database schema with expected frontend models
 * and generates matching migration SQL commands.
 */

// Normalizes database types to allow flexible comparisons
const normalizeType = (dbType) => {
  if (!dbType) return 'text'
  const t = dbType.toLowerCase()
  if (t.includes('char') || t === 'text' || t === 'string' || t === 'varchar') return 'text'
  if (t.includes('timestamp') || t === 'date' || t === 'datetime') return 'timestamp with time zone'
  if (t === 'integer' || t === 'int' || t === 'bigint' || t === 'numeric' || t === 'smallint') return 'integer'
  if (t === 'boolean' || t === 'bool') return 'boolean'
  return t
}

export const compareSchemas = (activeSchema, expectedSchema) => {
  const activeTables = activeSchema?.tables || []
  const activeColumns = activeSchema?.columns || []
  const activeFkeys = activeSchema?.fkeys || []
  const activePolicies = activeSchema?.policies || []

  const mismatches = []
  const sqlMigrations = []
  const warnings = []

  const expectedTablesMap = expectedSchema.tables

  // Helper to check if table exists
  const getActiveTable = (name) => activeTables.find(t => t.table_name.toLowerCase() === name.toLowerCase())

  // Helper to get active columns for table
  const getActiveColumnsForTable = (name) => activeColumns.filter(c => c.table_name.toLowerCase() === name.toLowerCase())

  // Helper to check if foreign key exists
  const getActiveFkey = (table, col) => activeFkeys.find(f => 
    f.table_name.toLowerCase() === table.toLowerCase() && 
    f.column_name.toLowerCase() === col.toLowerCase()
  )

  // 1. Process expected tables
  Object.keys(expectedTablesMap).forEach(tableName => {
    const activeTable = getActiveTable(tableName)
    const expectedTable = expectedTablesMap[tableName]
    const expectedCols = expectedTable.columns

    if (!activeTable) {
      // Mismatch: Table is missing
      mismatches.push({
        table: tableName,
        issueType: 'MISSING_TABLE',
        message: `Table "${tableName}" does not exist.`,
        severity: 'CRITICAL'
      })

      // Generate table creation SQL
      const colDefinitions = Object.keys(expectedCols).map(colName => {
        const c = expectedCols[colName]
        let def = `"${colName}" ${c.type}`
        if (c.isPrimaryKey) def += ' PRIMARY KEY'
        if (c.unique && !c.isPrimaryKey) def += ' UNIQUE'
        if (c.nullable === 'NO') def += ' NOT NULL'
        if (c.default) def += ` DEFAULT ${c.default}`
        return def
      })

      let createSql = `CREATE TABLE "public"."${tableName}" (\n  ${colDefinitions.join(',\n  ')}\n);`
      sqlMigrations.push(createSql)

      // Generate table RLS bypass for testing/simplicity
      sqlMigrations.push(`ALTER TABLE "public"."${tableName}" DISABLE ROW LEVEL SECURITY;`)

      // Add constraints separately to ensure tables are created first
      Object.keys(expectedCols).forEach(colName => {
        const c = expectedCols[colName]
        if (c.isForeignKey && c.references) {
          const [refTable, refCol] = c.references.split('.')
          const fkSql = `ALTER TABLE "public"."${tableName}" ADD CONSTRAINT "fk_${tableName}_${colName}" FOREIGN KEY ("${colName}") REFERENCES "public"."${refTable}"("${refCol}") ON DELETE CASCADE;`
          sqlMigrations.push(fkSql)
        }
      })
      return
    }

    // Table exists. Let's compare columns.
    const activeCols = getActiveColumnsForTable(tableName)

    Object.keys(expectedCols).forEach(colName => {
      const expCol = expectedCols[colName]
      const actCol = activeCols.find(c => c.column_name.toLowerCase() === colName.toLowerCase())

      if (!actCol) {
        // Mismatch: Column is missing
        mismatches.push({
          table: tableName,
          column: colName,
          issueType: 'MISSING_COLUMN',
          message: `Column "${colName}" is missing from table "${tableName}".`,
          severity: 'HIGH'
        })

        // Generate ADD COLUMN SQL
        let addSql = `ALTER TABLE "public"."${tableName}" ADD COLUMN "${colName}" ${expCol.type}`
        if (expCol.nullable === 'NO') {
          // If NOT NULL, we provide a safe default value if not specified
          if (expCol.default) {
            addSql += ` DEFAULT ${expCol.default} NOT NULL`
          } else {
            // Pick a safe type default to avoid inserting violations on populated tables
            const defaultMap = {
              'text': "''",
              'integer': '0',
              'boolean': 'false',
              'timestamp with time zone': 'now()'
            }
            const fallbackDefault = defaultMap[normalizeType(expCol.type)] || 'NULL'
            addSql += ` DEFAULT ${fallbackDefault} NOT NULL`
          }
        } else if (expCol.default) {
          addSql += ` DEFAULT ${expCol.default}`
        }
        addSql += ';'
        sqlMigrations.push(addSql)

        // If this column is a foreign key, generate ALTER table add constraint
        if (expCol.isForeignKey && expCol.references) {
          const [refTable, refCol] = expCol.references.split('.')
          const fkSql = `ALTER TABLE "public"."${tableName}" ADD CONSTRAINT "fk_${tableName}_${colName}" FOREIGN KEY ("${colName}") REFERENCES "public"."${refTable}"("${refCol}") ON DELETE CASCADE;`
          sqlMigrations.push(fkSql)
        }
      } else {
        // Column exists. Check type and nullability.
        const normalizedActType = normalizeType(actCol.data_type)
        const normalizedExpType = normalizeType(expCol.type)

        if (normalizedActType !== normalizedExpType) {
          mismatches.push({
            table: tableName,
            column: colName,
            issueType: 'TYPE_MISMATCH',
            message: `Column "${colName}" in table "${tableName}" expects type "${expCol.type}" but is currently "${actCol.data_type}".`,
            severity: 'MEDIUM'
          })

          warnings.push(`Column type conversion for "${tableName}.${colName}" from "${actCol.data_type}" to "${expCol.type}" could result in data loss if type casts fail.`)

          const alterTypeSql = `ALTER TABLE "public"."${tableName}" ALTER COLUMN "${colName}" TYPE ${expCol.type} USING "${colName}"::${expCol.type};`
          sqlMigrations.push(alterTypeSql)
        }

        // Check Nullability
        const expectedNull = expCol.nullable || 'YES'
        const activeNull = actCol.is_nullable || 'YES'

        if (expectedNull !== activeNull) {
          mismatches.push({
            table: tableName,
            column: colName,
            issueType: 'NULLABILITY_MISMATCH',
            message: `Column "${colName}" in table "${tableName}" expects nullable: "${expectedNull}" but active is: "${activeNull}".`,
            severity: 'LOW'
          })

          const alterNullSql = `ALTER TABLE "public"."${tableName}" ALTER COLUMN "${colName}" ${expectedNull === 'NO' ? 'SET NOT NULL' : 'DROP NOT NULL'};`
          sqlMigrations.push(alterNullSql)
        }
      }

      // Check foreign key relationships for existing columns
      if (actCol && expCol.isForeignKey && expCol.references) {
        const activeFk = getActiveFkey(tableName, colName)
        if (!activeFk) {
          mismatches.push({
            table: tableName,
            column: colName,
            issueType: 'MISSING_FOREIGN_KEY',
            message: `Foreign key constraint is missing for column "${colName}" in table "${tableName}".`,
            severity: 'MEDIUM'
          })

          const [refTable, refCol] = expCol.references.split('.')
          const fkSql = `ALTER TABLE "public"."${tableName}" ADD CONSTRAINT "fk_${tableName}_${colName}" FOREIGN KEY ("${colName}") REFERENCES "public"."${refTable}"("${refCol}") ON DELETE CASCADE;`
          sqlMigrations.push(fkSql)
        }
      }
    });
  })

  // Detect obsolete tables (for warning display - we never delete them automatically)
  activeTables.forEach(actTable => {
    const isExpected = Object.keys(expectedTablesMap).some(t => t.toLowerCase() === actTable.table_name.toLowerCase())
    // Exclude Supabase internal schema tables and migration history tables
    const isObsolete = !isExpected && !actTable.table_name.startsWith('_') && actTable.table_name !== 'SchemaMigrationHistory'

    if (isObsolete) {
      mismatches.push({
        table: actTable.table_name,
        issueType: 'OBSOLETE_TABLE',
        message: `Table "${actTable.table_name}" exists in database but is not defined in expected schema.`,
        severity: 'INFO'
      })
      warnings.push(`Table "${actTable.table_name}" is obsolete. SQL script recommends dropping it, but manual confirmation is required.`)
    }
  })

  return {
    mismatches,
    sqlMigrations,
    warnings,
    isClean: mismatches.length === 0
  }
}
