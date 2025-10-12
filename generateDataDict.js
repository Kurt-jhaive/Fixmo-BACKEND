import { PrismaClient } from '@prisma/client'
import pkg from '@prisma/internals';


import fs from 'fs'
import path from 'path'
const { getDMMF } = pkg;
const prisma = new PrismaClient()

async function generateDataDictionary() {
  // ✅ Load your Prisma schema file
  const schemaPath = path.resolve('./prisma/schema.prisma')
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8')

  // ✅ Get the DMMF (Data Model Meta Format)
  const dmmf = await getDMMF({ datamodel: schemaContent })
  const modelDefs = dmmf.datamodel.models

  let csv = 'Table Name,Attribute Name,Data Type,Null,Default,Description,Sample Data\n'

  for (const modelDef of modelDefs) {
    const modelName = modelDef.name
    const fields = modelDef.fields

    // Get a sample row from DB
    let row = null
    try {
      row = await prisma[modelName].findFirst()
    } catch (err) {
      console.warn(`⚠️ Could not fetch sample data for ${modelName}: ${err.message}`)
    }

    for (const field of fields) {
      const { name, type, isRequired, default: defaultValue } = field
      const sampleValue = row ? JSON.stringify(row[name]) : ''
      csv += `${modelName},${name},${type},${isRequired ? 'NO' : 'YES'},${defaultValue ?? ''},,${sampleValue ?? ''}\n`
    }
  }

  fs.writeFileSync('data_dictionary_with_samples.csv', csv)
  console.log('✅ Data dictionary generated: data_dictionary_with_samples.csv')
}

generateDataDictionary()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
