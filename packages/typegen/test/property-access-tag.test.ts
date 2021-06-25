import * as fsSyncer from 'fs-syncer'
import * as typegen from '../src'
import {getHelper} from './helper'

export const {typegenOptions, logger, poolHelper: helper} = getHelper({__filename})

beforeEach(async () => {
  await helper.pool.query(helper.sql`
    create table test_table(foo int not null, bar text);

    comment on column test_table.bar is 'Look, ma! A comment from postgres!'
  `)
})

test('example typegen', async () => {
  const syncer = fsSyncer.jestFixture({
    targetState: {
      'index.ts': `
        import * as slonik from 'slonik'

        export default async () => {
          const pool = slonik.createPool('...connection string...')

          const results = await pool.query(slonik.sql\`select foo, bar from test_table\`)

          results.rows.forEach(r => {
            console.log(r.foo) // foo has type 'number'
            console.log(r.bar) // bar has type 'string | null'
          })
        }
      `,
    },
  })

  syncer.sync()

  await typegen.generate(typegenOptions(syncer.baseDir))

  expect(syncer.yaml()).toMatchInlineSnapshot(`
    "---
    index.ts: |-
      import * as slonik from 'slonik'
      
      export default async () => {
        const pool = slonik.createPool('...connection string...')
      
        const results = await pool.query(slonik.sql<queries.TestTable>\`select foo, bar from test_table\`)
      
        results.rows.forEach(r => {
          console.log(r.foo) // foo has type 'number'
          console.log(r.bar) // bar has type 'string | null'
        })
      }
      
      export declare namespace queries {
        // Generated by @slonik/typegen
      
        /** - query: \`select foo, bar from test_table\` */
        export interface TestTable {
          /** column: \`property_access_tag_test.test_table.foo\`, not null: \`true\`, regtype: \`integer\` */
          foo: number
      
          /**
           * Look, ma! A comment from postgres!
           *
           * column: \`property_access_tag_test.test_table.bar\`, regtype: \`text\`
           */
          bar: string | null
        }
      }
      "
  `)
})
