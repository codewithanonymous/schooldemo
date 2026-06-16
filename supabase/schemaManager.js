import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { expectedSchema } from '../src/lib/expectedSchema.js'
import { compareSchemas } from '../src/lib/schemaComparator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
const envPath = path.resolve(__dirname, '../.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] ? match[2].trim() : ''
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    env[match[1]] = value
  }
})

const dbUrl = env.DATABASE_URL
if (!dbUrl) {
  console.error("Error: DATABASE_URL not found in .env file.")
  process.exit(1)
}

const client = new pg.Client({ connectionString: dbUrl })

const getActiveSchema = async (dbClient) => {
  const { rows } = await dbClient.query("SELECT inspect_schema() AS schema")
  return rows[0].schema
}

const applySql = async (dbClient, sqlString) => {
  const queries = sqlString.split(';').map(q => q.trim()).filter(q => q.length > 0)
  for (const q of queries) {
    console.log(`Executing SQL: ${q};`)
    await dbClient.query(q)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isApply = args.includes('--apply')
  const isCheck = args.includes('--check')

  if (!isApply && !isCheck) {
    console.log(`
Supabase Database Schema Management CLI Tool

Usage:
  node supabase/schemaManager.js [options]

Options:
  --check      Run schema validation analysis and display migrations
  --apply      Analyze database, generate migrations, execute them, and log changes
    `)
    process.exit(0)
  }

  try {
    console.log("Connecting to PostgreSQL database...")
    await client.connect()

    console.log("Retrieving active database schema snapshot...")
    const beforeSchema = await getActiveSchema(client)

    console.log("Performing validation comparison...")
    const { mismatches, sqlMigrations, warnings, isClean } = compareSchemas(beforeSchema, expectedSchema)

    if (isClean) {
      console.log("\n\x1b[32m✔ Active schema is fully consistent with expected frontend data models. No migrations needed.\x1b[0m\n")
      await client.end()
      return
    }

    console.log(`\nFound ${mismatches.length} schema mismatches:`)
    mismatches.forEach(m => {
      const severityColor = m.severity === 'CRITICAL' || m.severity === 'HIGH' ? '\x1b[31m' : '\x1b[33m'
      console.log(`  - [${m.issueType}] ${severityColor}${m.message}\x1b[0m`)
    })

    if (warnings.length > 0) {
      console.log("\n\x1b[33mWarnings:\x1b[0m")
      warnings.forEach(w => console.log(`  ⚠ ${w}`))
    }

    const migrationScript = sqlMigrations.join('\n')
    console.log("\n--- Generated Migration SQL ---")
    console.log(migrationScript)
    console.log("--------------------------------\n")

    if (isCheck) {
      console.log("Check complete. Run with '--apply' to deploy changes on Supabase.")
      await client.end()
      return
    }

    if (isApply) {
      console.log("Applying migrations...")
      const historyDir = path.resolve(__dirname, 'history')
      fs.mkdirSync(historyDir, { recursive: true })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const historyLogPath = path.join(historyDir, `${timestamp}.json`)
      const changelogPath = path.join(historyDir, 'changelog.md')

      let executionResult = { success: true, error: null }
      try {
        await applySql(client, migrationScript)
        console.log("\x1b[32m✔ Migration successfully applied to Supabase database!\x1b[0m")
      } catch (err) {
        console.error("\x1b[31m✘ Migration execution failed:\x1b[0m", err)
        executionResult.success = false
        executionResult.error = err.message || JSON.stringify(err)
      }

      console.log("Retrieving updated database schema snapshot...")
      const afterSchema = await getActiveSchema(client)

      // Save History snapshot
      const logPayload = {
        timestamp: new Date().toISOString(),
        sql: migrationScript,
        result: executionResult,
        before: beforeSchema,
        after: afterSchema
      }
      fs.writeFileSync(historyLogPath, JSON.stringify(logPayload, null, 2))
      console.log(`Saved history snapshot to: supabase/history/${timestamp}.json`)

      // Log to DB table
      try {
        await client.query(
          'INSERT INTO "SchemaMigrationHistory" (sql, success, error, before_snapshot, after_snapshot) VALUES ($1, $2, $3, $4, $5)',
          [
            migrationScript,
            executionResult.success,
            executionResult.error,
            JSON.stringify(beforeSchema),
            JSON.stringify(afterSchema)
          ]
        )
        console.log("Logged migration execution directly inside Supabase 'SchemaMigrationHistory' table.")
      } catch (dbLogErr) {
        console.error("Warning: Failed to log history to DB table:", dbLogErr)
      }

      // Update Changelog Markdown file
      const changelogHeading = `\n## [${new Date().toLocaleString()}]\n`
      const changelogBody = `- **Status**: ${executionResult.success ? 'Success ✔' : 'Failed ✘'}\n` +
        (executionResult.error ? `- **Error**: ${executionResult.error}\n` : '') +
        `- **Applied SQL**:\n\`\`\`sql\n${migrationScript}\n\`\`\`\n`
      
      fs.appendFileSync(changelogPath, changelogHeading + changelogBody)
      console.log(`Updated database changelog at: supabase/history/changelog.md`)
    }
  } catch (err) {
    console.error("Database schema execution failed:", err)
  } finally {
    await client.end()
  }
}

main()
