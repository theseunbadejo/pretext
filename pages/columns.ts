import gatsbyText from './gatsby.txt' with { type: 'text' }
import mixedAppText from '../corpora/mixed-app-text.txt' with { type: 'text' }
import {
  prepareWithSegments,
  type LayoutCursor,
  type LayoutLine,
  type PreparedTextWithSegments,
} from '../src/layout.ts'
import { collectLineSlice } from './line-utils.ts'

const FONT = '20px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif'
const LINE_HEIGHT = 32
const COLUMN_COUNT = 3

const spread = document.getElementById('spread') as HTMLDivElement
const widthInput = document.getElementById('spread-width') as HTMLInputElement
const excerptInput = document.getElementById('excerpt') as HTMLSelectElement
const targetLinesInput = document.getElementById('target-lines') as HTMLInputElement

const statSpreadWidth = document.getElementById('stat-spread-width')!
const statColumnWidth = document.getElementById('stat-column-width')!
const statLineCount = document.getElementById('stat-line-count')!
const statOverflow = document.getElementById('stat-overflow')!

const spill = document.getElementById('spill') as HTMLDivElement
const stages = [
  document.getElementById('col1-stage') as HTMLDivElement,
  document.getElementById('col2-stage') as HTMLDivElement,
  document.getElementById('col3-stage') as HTMLDivElement,
]
const metas = [
  document.getElementById('col1-meta')!,
  document.getElementById('col2-meta')!,
  document.getElementById('col3-meta')!,
]

type ExcerptKey = 'gatsby' | 'mixed'

const GATSBY_EXCERPT = gatsbyText
  .split(/\n\s*\n/u)
  .map(paragraph => paragraph.trim())
  .filter(Boolean)
  .slice(0, 12)
  .join(' ')

const MIXED_EXCERPT = [mixedAppText.trim(), mixedAppText.trim()].join(' ')

const TEXTS: Record<ExcerptKey, string> = {
  gatsby: GATSBY_EXCERPT,
  mixed: MIXED_EXCERPT,
}

const preparedByKey: Partial<Record<ExcerptKey, PreparedTextWithSegments>> = {}

function getPrepared(key: ExcerptKey): PreparedTextWithSegments {
  const cached = preparedByKey[key]
  if (cached !== undefined) return cached

  const prepared = prepareWithSegments(TEXTS[key], FONT)
  preparedByKey[key] = prepared
  return prepared
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`
}

function formatCursor(line: LayoutLine): string {
  return `${line.start.segmentIndex}:${line.start.graphemeIndex}→${line.end.segmentIndex}:${line.end.graphemeIndex}`
}

function renderColumn(stage: HTMLDivElement, meta: HTMLElement, lines: LayoutLine[], firstLineNumber: number, targetLines: number): void {
  stage.replaceChildren()
  stage.style.height = `${targetLines * LINE_HEIGHT}px`

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const el = document.createElement('div')
    el.className = 'line'
    el.textContent = line.text
    el.style.top = `${i * LINE_HEIGHT}px`
    el.title =
      `Line ${firstLineNumber + i + 1} • ${line.width.toFixed(2)}px • ${formatCursor(line)}` +
      (line.trailingDiscretionaryHyphen ? ' • discretionary hyphen' : '')
    stage.appendChild(el)
  }

  if (lines.length === 0) {
    meta.textContent = 'empty'
    return
  }

  const first = lines[0]!
  const last = lines[lines.length - 1]!
  meta.textContent =
    `${lines.length} lines • L${firstLineNumber + 1}-L${firstLineNumber + lines.length} • ${formatCursor(first)} … ${formatCursor(last)}`
}

function render(): void {
  const spreadWidth = parseInt(widthInput.value, 10)
  const targetLines = parseInt(targetLinesInput.value, 10)
  const excerpt = excerptInput.value as ExcerptKey

  spread.style.width = `${spreadWidth}px`
  const columnWidth = Math.floor(stages[0]!.getBoundingClientRect().width)
  const prepared = getPrepared(excerpt)

  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let totalLines = 0
  let spillCursor: LayoutCursor | null = null
  let spillPreviewLines: LayoutLine[] = []

  statSpreadWidth.textContent = `${spreadWidth}px`
  statColumnWidth.textContent = `${columnWidth}px`

  for (let columnIndex = 0; columnIndex < COLUMN_COUNT; columnIndex++) {
    const startLineNumber = totalLines
    const slice = collectLineSlice(prepared, cursor, columnWidth, LINE_HEIGHT, targetLines)
    totalLines += slice.lineCount
    renderColumn(
      stages[columnIndex]!,
      metas[columnIndex]!,
      slice.lines,
      startLineNumber,
      targetLines,
    )
    if (slice.nextCursor === null) {
      cursor = slice.lines.length > 0 ? slice.lines[slice.lines.length - 1]!.end : cursor
      spillCursor = null
      spillPreviewLines = []
      for (let rest = columnIndex + 1; rest < COLUMN_COUNT; rest++) {
        renderColumn(stages[rest]!, metas[rest]!, [], totalLines, targetLines)
      }
      break
    }

    cursor = slice.nextCursor
    spillCursor = cursor
  }

  if (spillCursor !== null) {
    const spillSlice = collectLineSlice(prepared, spillCursor, columnWidth, LINE_HEIGHT, 2)
    spillPreviewLines = spillSlice.lines
    totalLines += spillSlice.lineCount

    let countCursor = spillSlice.nextCursor
    while (countCursor !== null) {
      const countSlice = collectLineSlice(prepared, countCursor, columnWidth, LINE_HEIGHT, 64)
      totalLines += countSlice.lineCount
      countCursor = countSlice.nextCursor
    }
  }

  const capacity = COLUMN_COUNT * targetLines
  const overflow = Math.max(totalLines - capacity, 0)

  statLineCount.textContent = String(totalLines)
  statOverflow.textContent = String(overflow)

  if (overflow === 0 || spillCursor === null || spillPreviewLines.length === 0) {
    spill.textContent = 'No overflow. All current lines fit inside the three-column spread.'
    return
  }

  const next = spillPreviewLines[0]!
  const preview = spillPreviewLines.map(line => `“${truncate(line.text, 72)}”`).join(' / ')
  spill.textContent =
    `${overflow} overflow lines spill past the current spread. ` +
    `The next hidden line begins at ${formatCursor(next)}. ` +
    `Preview: ${preview}`
}

widthInput.addEventListener('input', render)
excerptInput.addEventListener('change', render)
targetLinesInput.addEventListener('input', render)

render()
