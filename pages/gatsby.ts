import { prepare, layout } from '../src/layout.ts'

const book = document.getElementById('book')!
const slider = document.getElementById('slider') as HTMLInputElement
const valLabel = document.getElementById('val')!
const stats = document.getElementById('stats')!

import text from './gatsby.txt' with { type: 'text' }
book.textContent = text

const FONT = '16px Georgia, "Times New Roman", serif'
const LINE_HEIGHT = 26
const PADDING = 40

const prepared = prepare(text, FONT)

function pretextHeight(contentWidth: number): number {
  const result = layout(prepared, contentWidth, LINE_HEIGHT)
  return result.height + PADDING * 2
}

function setWidth(w: number) {
  slider.value = String(w)
  valLabel.textContent = `${w}px`

  // Pretext prediction
  const contentWidth = w - PADDING * 2
  const t0p = performance.now()
  const predictedHeight = pretextHeight(contentWidth)
  const msPretext = performance.now() - t0p

  // DOM reflow
  const t0d = performance.now()
  book.style.width = `${w}px`
  const domHeight = book.getBoundingClientRect().height
  const msDOM = performance.now() - t0d

  const diff = predictedHeight - domHeight
  const diffStr = diff === 0 ? 'exact' : `${diff > 0 ? '+' : ''}${Math.round(diff)}px`

  stats.textContent = `Pretext: ${msPretext.toFixed(2)}ms (${Math.round(predictedHeight)}px) | DOM: ${msDOM.toFixed(1)}ms (${Math.round(domHeight)}px) | Diff: ${diffStr} | ${text.length.toLocaleString()} chars`
}

slider.addEventListener('input', () => {
  setWidth(parseInt(slider.value))
})

const controlsEl = document.querySelector<HTMLDivElement>('.controls')!
controlsEl.addEventListener('mousemove', (e) => {
  const sliderRect = slider.getBoundingClientRect()
  const ratio = (e.clientX - sliderRect.left) / sliderRect.width
  const min = parseInt(slider.min)
  const max = parseInt(slider.max)
  const w = Math.round(min + (max - min) * Math.max(0, Math.min(1, ratio)))
  setWidth(w)
})

setWidth(600)
