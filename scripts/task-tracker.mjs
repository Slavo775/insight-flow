#!/usr/bin/env node
/**
 * Task Tracker CLI — manages workTasks/ sharded task files
 *
 * File structure:
 *   workTasks/master.json          — meta + shard index
 *   workTasks/tasks-N00-N09.json   — tasks 0-9
 *   workTasks/tasks-N10-N19.json   — tasks 10-19
 *   ...
 *
 * Task commands:
 *   node scripts/task-tracker.mjs create --title "..." --type fix --priority high --tags web,ux
 *   node scripts/task-tracker.mjs status --id N00 --status in-progress [--by taskmaster]
 *   node scripts/task-tracker.mjs implement-start --id N00
 *   node scripts/task-tracker.mjs implement-end --id N00 --files "src/a.ts,src/b.ts"
 *   node scripts/task-tracker.mjs review-start --id N00 [--type ai|human] [--by task-review]
 *   node scripts/task-tracker.mjs review-end --id N00 --verdict approved|fix-needed [--type ai|human] [--comment "..."]
 *   node scripts/task-tracker.mjs fix-start --id N00
 *   node scripts/task-tracker.mjs fix-end --id N00 --files "src/a.ts" [--comment "..."]
 *   node scripts/task-tracker.mjs push --id N00 --commit abc123 --message "feat: ..." [--branch fix/N00-title]
 *   node scripts/task-tracker.mjs mr-update --id N00 --url "https://github.com/.../pull/1"
 *   node scripts/task-tracker.mjs merge --id N00
 *   node scripts/task-tracker.mjs done --id N00
 *   node scripts/task-tracker.mjs current
 *   node scripts/task-tracker.mjs next
 *   node scripts/task-tracker.mjs next-review
 *   node scripts/task-tracker.mjs next-fix
 *   node scripts/task-tracker.mjs stats
 *   node scripts/task-tracker.mjs list [--status ready|in-progress|...]
 *
 * Change request commands:
 *   node scripts/task-tracker.mjs change-request --id N00 --description "..." [--by task-request-changes]
 *   node scripts/task-tracker.mjs change-start --id N00 [--by implement-changes]
 *   node scripts/task-tracker.mjs change-end --id N00 --files "src/a.ts" [--comment "..."] [--by implement-changes]
 *   node scripts/task-tracker.mjs next-change
 *
 * Incident commands:
 *   node scripts/task-tracker.mjs incident-create --id N03 --title "..." --severity critical [--description "..."]
 *   node scripts/task-tracker.mjs incident-status --id N03 --incident INC-001 --status production-fix
 *   node scripts/task-tracker.mjs incident-resolve --id N03 --incident INC-001 --rootCause "..." --fix "..."
 *   node scripts/task-tracker.mjs incident-list [--id N03]
 *
 * Migration:
 *   node scripts/task-tracker.mjs migrate
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORK_DIR = resolve(__dirname, '..', 'workTasks')
const MASTER_PATH = resolve(WORK_DIR, 'master.json')
const OLD_TRACKER_PATH = resolve(WORK_DIR, 'tracker.json')

// --- Storage Layer ---

function getShardFileName(taskNum) {
  const base = Math.floor(taskNum / 10) * 10
  const end = base + 9
  return `tasks-N${String(base).padStart(2, '0')}-N${String(end).padStart(2, '0')}.json`
}

function getShardPath(shardFile) {
  return resolve(WORK_DIR, shardFile)
}

function loadMaster() {
  return JSON.parse(readFileSync(MASTER_PATH, 'utf-8'))
}

function saveMaster(master) {
  writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2) + '\n')
}

function loadShard(shardFile) {
  const path = getShardPath(shardFile)
  if (!existsSync(path)) {
    return { range: { from: 0, to: 9 }, tasks: [] }
  }
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function saveShard(shardFile, data) {
  writeFileSync(getShardPath(shardFile), JSON.stringify(data, null, 2) + '\n')
}

function parseTaskNum(id) {
  return parseInt(id.replace(/^N/, ''), 10)
}

function loadTaskById(master, id) {
  const num = parseTaskNum(id)
  const shardFile = getShardFileName(num)
  const shard = loadShard(shardFile)
  const task = shard.tasks.find((t) => t.id === id)
  if (!task) {
    console.error(`Task ${id} not found in ${shardFile}`)
    process.exit(1)
  }
  return { task, shard, shardFile }
}

function loadAllTasks(master) {
  const all = []
  for (const shardFile of master.meta.shards) {
    const shard = loadShard(shardFile)
    all.push(...shard.tasks)
  }
  return all
}

function ensureShardExists(master, shardFile, taskNum) {
  if (!master.meta.shards.includes(shardFile)) {
    master.meta.shards.push(shardFile)
    master.meta.shards.sort()
    const base = Math.floor(taskNum / 10) * 10
    saveShard(shardFile, { range: { from: base, to: base + 9 }, tasks: [] })
  }
}

function now() {
  return new Date().toISOString()
}

function parseArgs(args) {
  const parsed = { _: [] }
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const next = args[i + 1]
      if (!next || next.startsWith('--')) {
        parsed[key] = true
      } else {
        parsed[key] = next
        i++
      }
    } else {
      parsed._.push(args[i])
    }
  }
  return parsed
}

function resolveId(master, opts) {
  if (opts.id) return opts.id
  return master.meta.currentTaskId
}

// --- Task Commands ---

function cmdCreate(master, opts) {
  if (!opts.title) {
    console.error('--title is required')
    process.exit(1)
  }

  const id = `N${String(master.meta.nextId).padStart(2, '0')}`
  const num = master.meta.nextId
  const slug = opts.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)

  const shardFile = getShardFileName(num)
  ensureShardExists(master, shardFile, num)

  const task = {
    id,
    title: opts.title,
    type: opts.type || 'fix',
    priority: opts.priority || 'medium',
    status: 'ready',
    folder: `workTasks/${id}-${slug}`,
    createdAt: now(),
    statusHistory: [{ status: 'ready', at: now(), by: opts.by || 'taskmaster' }],
    implementation: {
      startedAt: null,
      completedAt: null,
      filesChanged: [],
      tokensUsed: null,
    },
    reviews: [],
    changesAfterImplementation: [],
    incidents: [],
    committedAt: null,
    totalDurationMinutes: null,
    tags: opts.tags ? opts.tags.split(',').map((t) => t.trim()) : [],
  }

  const shard = loadShard(shardFile)
  shard.tasks.push(task)
  saveShard(shardFile, shard)

  master.meta.nextId++
  master.meta.currentTaskId = id
  saveMaster(master)

  console.log(JSON.stringify({ action: 'created', id, folder: task.folder }, null, 2))
}

function cmdStatus(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)
  const status = opts.status

  if (!status) {
    console.error('--status is required')
    process.exit(1)
  }

  task.status = status
  task.statusHistory.push({ status, at: now(), by: opts.by || 'manual' })
  saveShard(shardFile, shard)

  console.log(JSON.stringify({ action: 'status-updated', id, status }, null, 2))
}

function cmdImplementStart(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  task.status = 'in-progress'
  task.implementation.startedAt = now()
  task.statusHistory.push({ status: 'in-progress', at: now(), by: opts.by || 'task-implement' })

  if (opts.tokens) {
    task.implementation.tokensUsed = parseInt(opts.tokens, 10)
  }

  saveShard(shardFile, shard)
  console.log(JSON.stringify({ action: 'implement-started', id, startedAt: task.implementation.startedAt }, null, 2))
}

function cmdImplementEnd(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  task.status = 'implemented'
  task.implementation.completedAt = now()
  task.statusHistory.push({ status: 'implemented', at: now(), by: opts.by || 'task-implement' })

  if (opts.files) {
    task.implementation.filesChanged = opts.files.split(',').map((f) => f.trim())
  }

  if (opts.tokens) {
    const prev = task.implementation.tokensUsed || 0
    task.implementation.tokensUsed = prev + parseInt(opts.tokens, 10)
  }

  saveShard(shardFile, shard)
  console.log(
    JSON.stringify({
      action: 'implement-ended',
      id,
      status: 'implemented',
      completedAt: task.implementation.completedAt,
      filesChanged: task.implementation.filesChanged.length,
    }, null, 2),
  )
}

function cmdReviewStart(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  task.status = 'reviewing'
  task.statusHistory.push({ status: 'reviewing', at: now(), by: opts.by || 'task-review' })

  const review = {
    startedAt: now(),
    endedAt: null,
    verdict: null,
    comment: null,
    type: opts.type || 'ai',
    by: opts.by || 'task-review',
    fix: null,
  }

  task.reviews.push(review)
  saveShard(shardFile, shard)
  console.log(JSON.stringify({ action: 'review-started', id, reviewIndex: task.reviews.length - 1 }, null, 2))
}

function cmdReviewEnd(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  if (!opts.verdict) {
    console.error('--verdict is required (approved | fix-needed)')
    process.exit(1)
  }

  const review = task.reviews[task.reviews.length - 1]
  if (!review) {
    console.error('No active review found. Run review-start first.')
    process.exit(1)
  }

  review.endedAt = now()
  review.verdict = opts.verdict
  review.comment = opts.comment || null
  if (opts.type) review.type = opts.type
  if (opts.by) review.by = opts.by

  task.status = opts.verdict
  task.statusHistory.push({ status: opts.verdict, at: now(), by: opts.by || review.by || 'task-review' })

  saveShard(shardFile, shard)
  console.log(JSON.stringify({ action: 'review-ended', id, verdict: opts.verdict }, null, 2))
}

function cmdFixStart(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  const lastReview = task.reviews[task.reviews.length - 1]
  if (!lastReview || lastReview.verdict !== 'fix-needed') {
    console.error('No fix-needed review found. Run review-end --verdict fix-needed first.')
    process.exit(1)
  }

  task.status = 'fixing'
  task.statusHistory.push({ status: 'fixing', at: now(), by: opts.by || 'task-review-fix' })

  lastReview.fix = {
    startedAt: now(),
    endedAt: null,
    status: 'in-progress',
    filesChanged: [],
    comment: null,
    by: opts.by || 'task-review-fix',
  }

  saveShard(shardFile, shard)
  console.log(JSON.stringify({ action: 'fix-started', id, reviewIndex: task.reviews.length - 1 }, null, 2))
}

function cmdFixEnd(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  const lastReview = task.reviews[task.reviews.length - 1]
  if (!lastReview || !lastReview.fix || lastReview.fix.status !== 'in-progress') {
    console.error('No in-progress fix found. Run fix-start first.')
    process.exit(1)
  }

  lastReview.fix.endedAt = now()
  lastReview.fix.status = 'fixed'
  lastReview.fix.comment = opts.comment || null

  if (opts.files) {
    lastReview.fix.filesChanged = opts.files.split(',').map((f) => f.trim())
  }

  task.status = 'fixed'
  task.statusHistory.push({ status: 'fixed', at: now(), by: opts.by || 'task-review-fix' })

  saveShard(shardFile, shard)
  console.log(
    JSON.stringify({
      action: 'fix-ended',
      id,
      status: 'fixed',
      reviewIndex: task.reviews.length - 1,
      filesChanged: lastReview.fix.filesChanged.length,
    }, null, 2),
  )
}

function cmdPush(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  if (!opts.commit) {
    console.error('--commit is required (commit hash)')
    process.exit(1)
  }
  if (!opts.message) {
    console.error('--message is required (commit message)')
    process.exit(1)
  }

  if (!task.pushes) task.pushes = []
  if (!task.branch) task.branch = opts.branch || null

  if (opts.branch) task.branch = opts.branch

  task.pushes.push({
    at: now(),
    commitHash: opts.commit,
    commitMessage: opts.message,
  })

  task.status = 'pushed'
  task.statusHistory.push({ status: 'pushed', at: now(), by: opts.by || 'task-git' })

  saveShard(shardFile, shard)
  console.log(
    JSON.stringify({
      action: 'pushed',
      id,
      branch: task.branch,
      pushCount: task.pushes.length,
      commitHash: opts.commit,
    }, null, 2),
  )
}

function cmdMrUpdate(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  if (!opts.url) {
    console.error('--url is required (merge request URL)')
    process.exit(1)
  }

  task.mrUrl = opts.url
  saveShard(shardFile, shard)
  console.log(JSON.stringify({ action: 'mr-updated', id, mrUrl: opts.url }, null, 2))
}

function cmdMerge(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  task.status = 'merged'
  task.mergedAt = now()
  task.statusHistory.push({ status: 'merged', at: now(), by: opts.by || 'task-git' })

  const start = new Date(task.createdAt)
  const end = new Date(task.mergedAt)
  task.totalDurationMinutes = Math.round((end - start) / 60000)

  saveShard(shardFile, shard)
  console.log(
    JSON.stringify({
      action: 'merged',
      id,
      mergedAt: task.mergedAt,
      totalDurationMinutes: task.totalDurationMinutes,
    }, null, 2),
  )
}

function cmdDone(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  task.status = 'done'
  task.committedAt = now()
  task.statusHistory.push({ status: 'done', at: now(), by: opts.by || 'git-agent' })

  const start = new Date(task.createdAt)
  const end = new Date(task.committedAt)
  task.totalDurationMinutes = Math.round((end - start) / 60000)

  saveShard(shardFile, shard)
  console.log(
    JSON.stringify({
      action: 'done',
      id,
      totalDurationMinutes: task.totalDurationMinutes,
    }, null, 2),
  )
}

function cmdCurrent(master) {
  const id = master.meta.currentTaskId
  if (!id) {
    console.log(JSON.stringify({ currentTaskId: null, task: null }))
    return
  }
  const num = parseTaskNum(id)
  const shardFile = getShardFileName(num)
  const shard = loadShard(shardFile)
  const task = shard.tasks.find((t) => t.id === id)
  if (!task) {
    console.log(JSON.stringify({ currentTaskId: id, task: null }))
  } else {
    console.log(JSON.stringify({ currentTaskId: id, title: task.title, status: task.status, folder: task.folder }, null, 2))
  }
}

function cmdList(master, opts) {
  let tasks = loadAllTasks(master)
  if (opts.status) {
    tasks = tasks.filter((t) => t.status === opts.status)
  }
  const summary = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    priority: t.priority,
    status: t.status,
  }))
  console.log(JSON.stringify(summary, null, 2))
}

function cmdStats(master) {
  const tasks = loadAllTasks(master)
  const total = tasks.length
  const byStatus = {}
  const byType = {}
  const byPriority = {}
  let totalDuration = 0
  let completedCount = 0
  let totalTokens = 0
  let totalReviews = 0
  let fixNeededCount = 0
  let fixCycles = 0
  let fixedCount = 0
  let totalIncidents = 0

  for (const task of tasks) {
    byStatus[task.status] = (byStatus[task.status] || 0) + 1
    byType[task.type] = (byType[task.type] || 0) + 1
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1

    if (task.totalDurationMinutes) {
      totalDuration += task.totalDurationMinutes
      completedCount++
    }

    if (task.implementation.tokensUsed) {
      totalTokens += task.implementation.tokensUsed
    }

    totalReviews += task.reviews.length
    fixNeededCount += task.reviews.filter((r) => r.verdict === 'fix-needed').length

    for (const review of task.reviews) {
      if (review.fix) {
        fixCycles++
        if (review.fix.status === 'fixed') fixedCount++
      }
    }

    totalIncidents += (task.incidents || []).length
  }

  const avgDuration = completedCount > 0 ? Math.round(totalDuration / completedCount) : null
  const firstPassRate =
    totalReviews > 0 ? Math.round(((totalReviews - fixNeededCount) / totalReviews) * 100) : null

  console.log(
    JSON.stringify(
      {
        total,
        byStatus,
        byType,
        byPriority,
        avgDurationMinutes: avgDuration,
        totalTokensUsed: totalTokens || null,
        totalIncidents,
        reviewStats: {
          totalReviews,
          fixNeededCount,
          fixCycles,
          fixedCount,
          firstPassRate: firstPassRate ? `${firstPassRate}%` : null,
        },
      },
      null,
      2,
    ),
  )
}

function cmdNext(master) {
  const PRIORITY_WEIGHT = { critical: 0, high: 1, medium: 2, low: 3 }
  const tasks = loadAllTasks(master)

  const actionable = tasks.filter((t) =>
    ['fix-needed', 'changes-requested', 'ready', 'in-progress', 'changes-implementing'].includes(t.status),
  )

  if (actionable.length === 0) {
    console.log(JSON.stringify({ next: null, message: 'No actionable tasks. Create one with /taskmaster.' }))
    return
  }

  const STATUS_WEIGHT = { 'fix-needed': 0, 'changes-requested': 1, 'changes-implementing': 2, 'in-progress': 3, ready: 4 }

  actionable.sort((a, b) => {
    const sa = STATUS_WEIGHT[a.status] ?? 9
    const sb = STATUS_WEIGHT[b.status] ?? 9
    if (sa !== sb) return sa - sb
    const pa = PRIORITY_WEIGHT[a.priority] ?? 9
    const pb = PRIORITY_WEIGHT[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  const pick = actionable[0]
  master.meta.currentTaskId = pick.id
  saveMaster(master)

  console.log(
    JSON.stringify(
      {
        next: pick.id,
        title: pick.title,
        type: pick.type,
        priority: pick.priority,
        status: pick.status,
        folder: pick.folder,
        reason:
          pick.status === 'fix-needed'
            ? 'Review requested changes — fix first'
            : pick.status === 'changes-requested'
              ? 'Change requests pending — implement changes'
              : pick.status === 'changes-implementing'
                ? 'Resume interrupted change implementation'
                : pick.status === 'in-progress'
                  ? 'Resume interrupted implementation'
                  : `Highest priority ready task (${pick.priority})`,
      },
      null,
      2,
    ),
  )
}

function cmdNextReview(master) {
  const PRIORITY_WEIGHT = { critical: 0, high: 1, medium: 2, low: 3 }
  const tasks = loadAllTasks(master)

  const reviewable = tasks.filter((t) =>
    ['implemented', 'pushed', 'fixed'].includes(t.status),
  )

  if (reviewable.length === 0) {
    console.log(JSON.stringify({ next: null, message: 'No tasks awaiting review.' }))
    return
  }

  reviewable.sort((a, b) => {
    const sa = a.status === 'fixed' ? 0 : 1
    const sb = b.status === 'fixed' ? 0 : 1
    if (sa !== sb) return sa - sb
    const pa = PRIORITY_WEIGHT[a.priority] ?? 9
    const pb = PRIORITY_WEIGHT[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  const pick = reviewable[0]
  master.meta.currentTaskId = pick.id
  saveMaster(master)

  console.log(
    JSON.stringify(
      {
        next: pick.id,
        title: pick.title,
        type: pick.type,
        priority: pick.priority,
        status: pick.status,
        folder: pick.folder,
        reviewRound: pick.reviews.length + 1,
        reason:
          pick.status === 'fixed'
            ? `Re-review after fixes (round ${pick.reviews.length + 1})`
            : 'First review after implementation',
      },
      null,
      2,
    ),
  )
}

function cmdNextFix(master) {
  const PRIORITY_WEIGHT = { critical: 0, high: 1, medium: 2, low: 3 }
  const tasks = loadAllTasks(master)

  const fixable = tasks.filter((t) => t.status === 'fix-needed')

  if (fixable.length === 0) {
    console.log(JSON.stringify({ next: null, message: 'No tasks needing fixes.' }))
    return
  }

  fixable.sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority] ?? 9
    const pb = PRIORITY_WEIGHT[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  const pick = fixable[0]
  master.meta.currentTaskId = pick.id
  saveMaster(master)

  const lastReview = pick.reviews[pick.reviews.length - 1]

  console.log(
    JSON.stringify(
      {
        next: pick.id,
        title: pick.title,
        type: pick.type,
        priority: pick.priority,
        status: pick.status,
        folder: pick.folder,
        reviewComment: lastReview?.comment || null,
        reason: `Fix requested by reviewer (review round ${pick.reviews.length})`,
      },
      null,
      2,
    ),
  )
}

// --- Change Request Commands ---

function cmdChangeRequest(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  if (!opts.description) {
    console.error('--description is required')
    process.exit(1)
  }

  if (!task.changesAfterImplementation) task.changesAfterImplementation = []

  const entry = {
    requestedAt: now(),
    description: opts.description,
    requestedBy: opts.by || 'task-request-changes',
    status: 'requested',
    implementedAt: null,
    filesChanged: [],
    comment: null,
    implementedBy: null,
  }

  task.changesAfterImplementation.push(entry)
  task.status = 'changes-requested'
  task.statusHistory.push({ status: 'changes-requested', at: now(), by: opts.by || 'task-request-changes' })

  saveShard(shardFile, shard)
  console.log(
    JSON.stringify({
      action: 'change-requested',
      id,
      changeIndex: task.changesAfterImplementation.length - 1,
      description: opts.description,
    }, null, 2),
  )
}

function cmdChangeStart(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  if (!task.changesAfterImplementation || task.changesAfterImplementation.length === 0) {
    console.error('No change requests found. Run change-request first.')
    process.exit(1)
  }

  const lastChange = task.changesAfterImplementation[task.changesAfterImplementation.length - 1]
  if (lastChange.status !== 'requested') {
    console.error(`Last change request status is "${lastChange.status}", expected "requested".`)
    process.exit(1)
  }

  lastChange.status = 'implementing'
  task.status = 'changes-implementing'
  task.statusHistory.push({ status: 'changes-implementing', at: now(), by: opts.by || 'implement-changes' })

  saveShard(shardFile, shard)
  console.log(
    JSON.stringify({
      action: 'change-started',
      id,
      changeIndex: task.changesAfterImplementation.length - 1,
    }, null, 2),
  )
}

function cmdChangeEnd(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  if (!task.changesAfterImplementation || task.changesAfterImplementation.length === 0) {
    console.error('No change requests found. Run change-request first.')
    process.exit(1)
  }

  const lastChange = task.changesAfterImplementation[task.changesAfterImplementation.length - 1]
  if (lastChange.status !== 'implementing') {
    console.error(`Last change request status is "${lastChange.status}", expected "implementing".`)
    process.exit(1)
  }

  lastChange.status = 'implemented'
  lastChange.implementedAt = now()
  lastChange.comment = opts.comment || null
  lastChange.implementedBy = opts.by || 'implement-changes'

  if (opts.files) {
    lastChange.filesChanged = opts.files.split(',').map((f) => f.trim())
  }

  task.status = 'changes-implemented'
  task.statusHistory.push({ status: 'changes-implemented', at: now(), by: opts.by || 'implement-changes' })

  saveShard(shardFile, shard)
  console.log(
    JSON.stringify({
      action: 'change-ended',
      id,
      changeIndex: task.changesAfterImplementation.length - 1,
      filesChanged: lastChange.filesChanged.length,
    }, null, 2),
  )
}

function cmdNextChange(master) {
  const PRIORITY_WEIGHT = { critical: 0, high: 1, medium: 2, low: 3 }
  const tasks = loadAllTasks(master)

  const changeable = tasks.filter((t) => t.status === 'changes-requested')

  if (changeable.length === 0) {
    console.log(JSON.stringify({ next: null, message: 'No tasks with pending change requests.' }))
    return
  }

  changeable.sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority] ?? 9
    const pb = PRIORITY_WEIGHT[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  const pick = changeable[0]
  master.meta.currentTaskId = pick.id
  saveMaster(master)

  const lastChange = pick.changesAfterImplementation?.[pick.changesAfterImplementation.length - 1]

  console.log(
    JSON.stringify(
      {
        next: pick.id,
        title: pick.title,
        type: pick.type,
        priority: pick.priority,
        status: pick.status,
        folder: pick.folder,
        changeDescription: lastChange?.description || null,
        reason: `Change request pending (${pick.changesAfterImplementation?.length || 0} total)`,
      },
      null,
      2,
    ),
  )
}

// --- Incident Commands ---

function cmdIncidentCreate(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  if (!opts.title) {
    console.error('--title is required')
    process.exit(1)
  }

  if (!task.incidents) task.incidents = []

  const incId = `INC-${String(master.meta.nextIncidentId || 1).padStart(3, '0')}`

  const slug = opts.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  const incident = {
    id: incId,
    title: opts.title,
    severity: opts.severity || 'high',
    status: 'reported',
    reportedAt: now(),
    resolvedAt: null,
    branch: `fix/incident/${id}-${slug}`,
    description: opts.description || null,
    rootCause: null,
    fix: null,
    statusHistory: [{ status: 'reported', at: now(), by: opts.by || 'task-incident' }],
  }

  task.incidents.push(incident)
  saveShard(shardFile, shard)

  master.meta.nextIncidentId = (master.meta.nextIncidentId || 1) + 1
  saveMaster(master)

  console.log(
    JSON.stringify({
      action: 'incident-created',
      taskId: id,
      incidentId: incId,
      branch: incident.branch,
      severity: incident.severity,
    }, null, 2),
  )
}

function cmdIncidentStatus(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  if (!opts.incident) {
    console.error('--incident is required (e.g., INC-001)')
    process.exit(1)
  }
  if (!opts.status) {
    console.error('--status is required (investigating|production-fix|fixed|verified|closed)')
    process.exit(1)
  }

  const incident = (task.incidents || []).find((inc) => inc.id === opts.incident)
  if (!incident) {
    console.error(`Incident ${opts.incident} not found on task ${id}`)
    process.exit(1)
  }

  incident.status = opts.status
  incident.statusHistory.push({ status: opts.status, at: now(), by: opts.by || 'task-incident' })

  saveShard(shardFile, shard)
  console.log(JSON.stringify({ action: 'incident-status-updated', taskId: id, incidentId: opts.incident, status: opts.status }, null, 2))
}

function cmdIncidentResolve(master, opts) {
  const id = resolveId(master, opts)
  const { task, shard, shardFile } = loadTaskById(master, id)

  if (!opts.incident) {
    console.error('--incident is required (e.g., INC-001)')
    process.exit(1)
  }

  const incident = (task.incidents || []).find((inc) => inc.id === opts.incident)
  if (!incident) {
    console.error(`Incident ${opts.incident} not found on task ${id}`)
    process.exit(1)
  }

  incident.status = 'fixed'
  incident.resolvedAt = now()
  incident.rootCause = opts.rootCause || null
  incident.fix = opts.fix || null
  incident.statusHistory.push({ status: 'fixed', at: now(), by: opts.by || 'task-incident' })

  saveShard(shardFile, shard)
  console.log(
    JSON.stringify({
      action: 'incident-resolved',
      taskId: id,
      incidentId: opts.incident,
      rootCause: incident.rootCause,
    }, null, 2),
  )
}

function cmdIncidentList(master, opts) {
  const tasks = opts.id ? [loadTaskById(master, opts.id).task] : loadAllTasks(master)

  const incidents = []
  for (const task of tasks) {
    for (const inc of task.incidents || []) {
      incidents.push({
        taskId: task.id,
        taskTitle: task.title,
        ...inc,
      })
    }
  }

  if (incidents.length === 0) {
    console.log(JSON.stringify({ incidents: [], message: 'No incidents found.' }))
    return
  }

  console.log(JSON.stringify({ incidents }, null, 2))
}

// --- Migration ---

function cmdMigrate() {
  if (existsSync(MASTER_PATH)) {
    console.error('master.json already exists. Migration already done or run manually.')
    process.exit(1)
  }

  if (!existsSync(OLD_TRACKER_PATH)) {
    console.error('tracker.json not found. Nothing to migrate.')
    process.exit(1)
  }

  const old = JSON.parse(readFileSync(OLD_TRACKER_PATH, 'utf-8'))

  // Build master
  const master = {
    meta: {
      nextId: old.meta.nextId,
      currentTaskId: old.meta.currentTaskId,
      nextIncidentId: 1,
      shards: [],
    },
  }

  // Group tasks into shards
  const shardMap = {}
  for (const task of old.tasks) {
    // Add incidents array if missing
    if (!task.incidents) task.incidents = []

    const num = parseTaskNum(task.id)
    const shardFile = getShardFileName(num)

    if (!shardMap[shardFile]) {
      const base = Math.floor(num / 10) * 10
      shardMap[shardFile] = { range: { from: base, to: base + 9 }, tasks: [] }
    }
    shardMap[shardFile].tasks.push(task)
  }

  // Write shard files and build shard list
  for (const [shardFile, shardData] of Object.entries(shardMap)) {
    master.meta.shards.push(shardFile)
    saveShard(shardFile, shardData)
  }

  master.meta.shards.sort()

  // If no tasks exist, ensure at least one shard reference
  if (master.meta.shards.length === 0) {
    const shardFile = 'tasks-N00-N09.json'
    master.meta.shards.push(shardFile)
    saveShard(shardFile, { range: { from: 0, to: 9 }, tasks: [] })
  }

  saveMaster(master)

  // Backup old tracker
  renameSync(OLD_TRACKER_PATH, OLD_TRACKER_PATH + '.bak')

  console.log(
    JSON.stringify({
      action: 'migrated',
      shardsCreated: master.meta.shards,
      tasksMigrated: old.tasks.length,
      backupAt: 'workTasks/tracker.json.bak',
    }, null, 2),
  )
}

// --- Main ---

const args = process.argv.slice(2)
const command = args[0]
const opts = parseArgs(args.slice(1))

// Migration doesn't need master.json
if (command === 'migrate') {
  cmdMigrate()
  process.exit(0)
}

if (!existsSync(MASTER_PATH)) {
  // Fallback: try old tracker.json and suggest migration
  if (existsSync(OLD_TRACKER_PATH)) {
    console.error('master.json not found. Run `node scripts/task-tracker.mjs migrate` to migrate from tracker.json.')
  } else {
    console.error('No tracker files found. Initialize with migrate or create a master.json.')
  }
  process.exit(1)
}

const master = loadMaster()

switch (command) {
  case 'create':
    cmdCreate(master, opts)
    break
  case 'status':
    cmdStatus(master, opts)
    break
  case 'implement-start':
    cmdImplementStart(master, opts)
    break
  case 'implement-end':
    cmdImplementEnd(master, opts)
    break
  case 'review-start':
    cmdReviewStart(master, opts)
    break
  case 'review-end':
    cmdReviewEnd(master, opts)
    break
  case 'fix-start':
    cmdFixStart(master, opts)
    break
  case 'fix-end':
    cmdFixEnd(master, opts)
    break
  case 'push':
    cmdPush(master, opts)
    break
  case 'mr-update':
    cmdMrUpdate(master, opts)
    break
  case 'merge':
    cmdMerge(master, opts)
    break
  case 'done':
    cmdDone(master, opts)
    break
  case 'current':
    cmdCurrent(master)
    break
  case 'list':
    cmdList(master, opts)
    break
  case 'stats':
    cmdStats(master)
    break
  case 'next':
    cmdNext(master)
    break
  case 'next-review':
    cmdNextReview(master)
    break
  case 'next-fix':
    cmdNextFix(master)
    break
  case 'change-request':
    cmdChangeRequest(master, opts)
    break
  case 'change-start':
    cmdChangeStart(master, opts)
    break
  case 'change-end':
    cmdChangeEnd(master, opts)
    break
  case 'next-change':
    cmdNextChange(master)
    break
  case 'incident-create':
    cmdIncidentCreate(master, opts)
    break
  case 'incident-status':
    cmdIncidentStatus(master, opts)
    break
  case 'incident-resolve':
    cmdIncidentResolve(master, opts)
    break
  case 'incident-list':
    cmdIncidentList(master, opts)
    break
  default:
    console.error(`Unknown command: ${command}`)
    console.error(
      'Task commands: create, status, implement-start, implement-end, review-start, review-end, fix-start, fix-end, push, mr-update, merge, done, current, next, next-review, next-fix, list, stats',
    )
    console.error(
      'Change commands: change-request, change-start, change-end, next-change',
    )
    console.error(
      'Incident commands: incident-create, incident-status, incident-resolve, incident-list',
    )
    console.error('Migration: migrate')
    process.exit(1)
}
