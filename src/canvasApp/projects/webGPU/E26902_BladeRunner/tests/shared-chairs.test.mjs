import test from 'node:test'
import { auditSharedChairs } from '../scripts/audit-shared-chairs.mjs'

test('Real chair asset shares resources through look changes and disposes each resource once', async () => {
    await auditSharedChairs()
})
