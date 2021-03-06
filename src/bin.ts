#!/usr/bin/env node

import * as fs from 'fs'
import * as yargs from 'yargs'
import * as mkdirp from 'mkdirp'
import * as path from 'path'
import { PrismaGenerator } from './PrismaGenerator'
import { PrismaTypescriptGenerator } from './PrismaTypescriptGenerator'
import { buildSchema, printSchema } from 'graphql'

const argv = yargs
  .usage(`Usage: $0 -i [input] -g [generator] -b [outputBinding]`)
  .options({
    input: {
      alias: 'i',
      describe: 'Path to schema.graphql, schema.js or schema.ts file',
      type: 'string',
    },
    // schema path instead
    language: {
      alias: 'l',
      describe:
        'Type of the generator. Available generators: typescript, javascript',
      type: 'string',
    },
    outputBinding: {
      alias: 'b',
      describe: 'Output binding. Example: binding.ts',
      type: 'string',
    },
    outputTypedefs: {
      alias: 't',
      describe: 'Output type defs. Example: typeDefs.graphql',
      type: 'string',
    },
  })
  .demandOption(['i', 'l', 'b']).argv

run(argv).catch(e => console.error(e))

async function run(argv) {
  const { input, language, outputBinding, outputTypedefs } = argv

  const schema = getSchemaFromInput(input)
  const args = {
    schema,
    inputSchemaPath: path.resolve(input),
    outputBindingPath: path.resolve(outputBinding),
  }

  if (language === 'typescript') {
    require('ts-node').register()
  }
  const generatorInstance =
    language === 'typescript'
      ? new PrismaTypescriptGenerator(args)
      : new PrismaGenerator(args)
  const code = generatorInstance.render()

  mkdirp(path.dirname(outputBinding))
  fs.writeFileSync(outputBinding, code)

  if (outputTypedefs) {
    mkdirp(path.dirname(outputTypedefs))
    fs.writeFileSync(outputTypedefs, printSchema(schema))
  }

  console.log('Done generating binding')
}

function getSchemaFromInput(input) {
  if (input.endsWith('.graphql') || input.endsWith('.gql')) {
    return buildSchema(fs.readFileSync(input, 'utf-8'))
  }

  if (input.endsWith('.js') || input.endsWith('.ts')) {
    if (input.endsWith('.ts')) {
      require('ts-node').register()
    }
    const schema = require(path.resolve(input))
    if (schema.default) {
      return schema.default
    }
    return schema
  }
}
